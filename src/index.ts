#!/usr/bin/env node
/**
 * Zoom Meeting Notes Archiver
 * Main orchestrator script
 */

import path from 'path';
import crypto from 'crypto';
import { ZoomApiClient } from './services/zoom-api.js';
import { StateManager } from './services/state-manager.js';
import { parseTranscript } from './parsers/transcript-parser.js';
import { extractActionItems } from './parsers/action-items.js';
import { convertZoomSummaryToMeetingNote } from './parsers/summary-converter.js';
import { generateMarkdown } from './generators/markdown.js';
import { createDatePath, writeFile, fileExists } from './utils/filesystem.js';
import { createFilename } from './utils/sanitize.js';
import { loadConfig } from './utils/config.js';
import { logger } from './utils/logger.js';
import type { ZoomRecording, MeetingNote, ProcessedRecording } from './types/index.js';

async function main() {
  logger.info('🚀 Zoom Meeting Notes Archiver started');

  try {
    // Load configuration
    const config = loadConfig();
    logger.info('Configuration loaded', {
      outputDir: config.outputDir,
      actionItemsEnabled: config.enableActionItemExtraction,
    });

    // Initialize services
    const zoomClient = new ZoomApiClient(config.zoom);
    const stateManager = new StateManager();

    // Load state
    await stateManager.load();

    // Calculate date range for fetching recordings
    const lastFetch = new Date(stateManager.getLastFetchTimestamp());
    const now = new Date();

    logger.info('Fetching recordings', {
      from: lastFetch.toISOString(),
      to: now.toISOString(),
    });

    // Fetch recordings from Zoom
    const allRecordings = await zoomClient.listRecordings(lastFetch, now);

    // Filter for recordings with transcripts
    const recordingsWithTranscripts = zoomClient.filterRecordingsWithTranscripts(allRecordings);

    logger.info(`Found ${recordingsWithTranscripts.length} recordings with transcripts`);

    if (recordingsWithTranscripts.length === 0) {
      logger.info('No new recordings to process');
      stateManager.updateLastFetchTimestamp(now.toISOString());
      stateManager.updateStatistics('success');
      await stateManager.save();
      return;
    }

    // Process each recording
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const recording of recordingsWithTranscripts) {
      try {
        // Check if already processed
        if (stateManager.isProcessed(recording.uuid)) {
          logger.debug(`Skipping already processed recording: ${recording.uuid}`);
          skipCount++;
          continue;
        }

        logger.group(`Processing: ${recording.topic}`);

        // Process the recording
        const result = await processRecording(recording, zoomClient, config);

        if (result) {
          // Save to state
          stateManager.addProcessedRecording(result);
          successCount++;
          logger.info(`✅ Successfully processed: ${recording.topic}`);
        } else {
          skipCount++;
        }

        logger.endGroup();
      } catch (error) {
        errorCount++;
        logger.error(`Failed to process recording: ${recording.topic}`, error as Error);
        logger.endGroup();
      }
    }

    // Update state
    stateManager.updateLastFetchTimestamp(now.toISOString());

    const runStatus = errorCount === 0 ? 'success' : errorCount < successCount ? 'partial' : 'failure';
    stateManager.updateStatistics(runStatus);

    await stateManager.save();

    // Final summary
    logger.info('📊 Processing Summary', {
      total: recordingsWithTranscripts.length,
      success: successCount,
      skipped: skipCount,
      errors: errorCount,
      status: runStatus,
    });

    if (errorCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    logger.error('Fatal error in main process', error as Error);
    process.exit(1);
  }
}

/**
 * Process a single recording
 */
async function processRecording(
  recording: ZoomRecording,
  zoomClient: ZoomApiClient,
  config: ReturnType<typeof loadConfig>
): Promise<ProcessedRecording | null> {
  let meetingNote: MeetingNote;

  // Try to fetch AI-generated summary first
  logger.info('Checking for AI-generated meeting summary...');
  const aiSummary = await zoomClient.getMeetingSummary(recording.uuid);

  if (aiSummary) {
    logger.info('✅ AI summary found! Using Zoom AI Companion summary');
    meetingNote = convertZoomSummaryToMeetingNote(aiSummary);
  } else {
    // Fallback to transcript parsing
    logger.info('No AI summary available, falling back to transcript parsing');

    // Find transcript file
    const transcriptFile = recording.recording_files.find(
      (file) => file.file_type === 'TRANSCRIPT' && file.status === 'completed'
    );

    if (!transcriptFile) {
      logger.warning('No completed transcript file found');
      return null;
    }

    logger.info('Downloading transcript', {
      fileType: transcriptFile.file_extension,
      size: transcriptFile.file_size,
    });

    // Download transcript
    const transcriptContent = await zoomClient.downloadFile(transcriptFile.download_url);

    // Parse transcript
    const parsedTranscript = parseTranscript(transcriptContent, transcriptFile.file_extension);

    logger.info(`Parsed transcript: ${parsedTranscript.segments.length} segments`);

    // Extract action items (if enabled)
    const actionItems = config.enableActionItemExtraction
      ? extractActionItems(parsedTranscript)
      : [];

    // Build meeting note from transcript
    meetingNote = {
      metadata: {
        title: recording.topic,
        meetingId: recording.id.toString(),
        uuid: recording.uuid,
        startTime: recording.start_time,
        duration: recording.duration,
        host: recording.host_email,
        participants: extractParticipants(recording),
        recordingCount: recording.recording_count,
        transcriptAvailable: true,
      },
      transcript: parsedTranscript,
      actionItems,
    };
  }

  // Generate Markdown
  const markdown = generateMarkdown(meetingNote);

  // Determine file path
  const startDate = new Date(meetingNote.metadata.startTime);
  const datePath = createDatePath(startDate, config.outputDir);
  const filename = createFilename(meetingNote.metadata.title, meetingNote.metadata.uuid);
  const filePath = path.join(datePath, filename);

  // Check if file already exists
  if (fileExists(filePath)) {
    logger.warning('File already exists, skipping', { filePath });
    return null;
  }

  // Write to disk
  await writeFile(filePath, markdown);

  logger.info(`📝 Saved markdown file: ${filePath}`);

  // Return processed recording info
  return {
    uuid: meetingNote.metadata.uuid,
    meetingId: meetingNote.metadata.meetingId,
    processedAt: new Date().toISOString(),
    filePath,
    hash: createContentHash(markdown),
  };
}

/**
 * Extract participants from recording
 */
function extractParticipants(recording: ZoomRecording): string[] {
  const participants = new Set<string>();

  // Add host
  participants.add(recording.host_email);

  // Try to extract from participant audio files (if available)
  // Note: Zoom API doesn't always provide participant list in recordings
  // This is a limitation of the API

  return Array.from(participants);
}

/**
 * Create content hash for duplicate detection
 */
function createContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

// Run main function
main().catch((error) => {
  logger.error('Unhandled error', error);
  process.exit(1);
});
