#!/usr/bin/env node
/**
 * Zoom Meeting Notes Archiver
 * Main orchestrator script
 */

// Load .env file if running locally (not in GitHub Actions)
if (!process.env.GITHUB_ACTIONS) {
  const dotenv = await import('dotenv');
  dotenv.config();
}

import path from 'path';
import crypto from 'crypto';
import { ZoomApiClient } from './services/zoom-api.js';
import { StateManager } from './services/state-manager.js';
import { convertZoomSummaryToMeetingNote } from './parsers/summary-converter.js';
import { generateMarkdown } from './generators/markdown.js';
import { createDatePath, writeFile, fileExists } from './utils/filesystem.js';
import { createFilename } from './utils/sanitize.js';
import { loadConfig } from './utils/config.js';
import { logger } from './utils/logger.js';
import type { ZoomMeeting, ProcessedRecording } from './types/index.js';

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

    logger.info('Fetching meetings', {
      from: lastFetch.toISOString(),
      to: now.toISOString(),
    });

    // Fetch all meetings from Zoom using Reports API
    const allMeetings = await zoomClient.listMeetings(lastFetch, now);

    logger.info(`Found ${allMeetings.length} meetings`);

    if (allMeetings.length === 0) {
      logger.info('No meetings found in this date range');
      stateManager.updateLastFetchTimestamp(now.toISOString());
      stateManager.updateStatistics('success');
      await stateManager.save();
      return;
    }

    // Process each meeting
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const meeting of allMeetings) {
      try {
        // Check if already processed
        if (stateManager.isProcessed(meeting.uuid)) {
          logger.debug(`Skipping already processed meeting: ${meeting.uuid}`);
          skipCount++;
          continue;
        }

        logger.group(`Processing: ${meeting.topic}`);

        // Process the meeting
        const result = await processMeeting(meeting, zoomClient, config);

        if (result) {
          // Save to state
          stateManager.addProcessedRecording(result);
          successCount++;
          logger.info(`✅ Successfully processed: ${meeting.topic}`);
        } else {
          skipCount++;
        }

        logger.endGroup();
      } catch (error) {
        errorCount++;
        logger.error(`Failed to process meeting: ${meeting.topic}`, error as Error);
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
      total: allMeetings.length,
      success: successCount,
      skipped: skipCount,
      errors: errorCount,
      status: runStatus,
    });

    // Only exit with error if there was a complete failure (more errors than successes)
    if (runStatus === 'failure') {
      process.exit(1);
    }
  } catch (error) {
    logger.error('Fatal error in main process', error as Error);
    process.exit(1);
  }
}

/**
 * Process a single meeting
 */
async function processMeeting(
  meeting: ZoomMeeting,
  zoomClient: ZoomApiClient,
  config: ReturnType<typeof loadConfig>
): Promise<ProcessedRecording | null> {
  // Try to fetch AI-generated summary
  logger.info('Checking for AI-generated meeting summary...');
  const aiSummary = await zoomClient.getMeetingSummary(meeting.uuid);

  if (!aiSummary) {
    logger.info('No AI summary available for this meeting, skipping');
    return null;
  }

  logger.info('✅ AI summary found! Using Zoom AI Companion summary');

  // Convert AI summary to meeting note
  const meetingNote = convertZoomSummaryToMeetingNote(aiSummary);

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

  // Return processed meeting info
  return {
    uuid: meetingNote.metadata.uuid,
    meetingId: meetingNote.metadata.meetingId,
    processedAt: new Date().toISOString(),
    filePath,
    hash: createContentHash(markdown),
  };
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
