/**
 * VTT/SRT transcript parser
 */

import { logger } from '../utils/logger.js';
import type { ParsedTranscript, TranscriptSegment } from '../types/index.js';

/**
 * Parse WebVTT (VTT) transcript format
 * Format:
 * WEBVTT
 *
 * 1
 * 00:00:00.000 --> 00:00:05.000
 * Speaker Name: Text content
 */
export function parseVTT(content: string): ParsedTranscript {
  const segments: TranscriptSegment[] = [];
  const lines = content.split('\n');

  let currentTimestamp = '';
  let currentText = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip WEBVTT header and empty lines
    if (line === 'WEBVTT' || line === '' || /^\d+$/.test(line)) {
      continue;
    }

    // Check if line is a timestamp
    if (line.includes('-->')) {
      currentTimestamp = line.split('-->')[0].trim();
      continue;
    }

    // This is text content
    if (currentTimestamp) {
      currentText = line;

      // Extract speaker and text
      const { speaker, text } = extractSpeakerAndText(currentText);

      if (text) {
        segments.push({
          speaker,
          timestamp: formatTimestamp(currentTimestamp),
          text,
        });
      }

      currentTimestamp = '';
      currentText = '';
    }
  }

  const rawText = segments.map((s) => s.text).join(' ');

  logger.debug(`Parsed VTT transcript: ${segments.length} segments`);

  return { segments, rawText };
}

/**
 * Parse SRT transcript format
 * Format:
 * 1
 * 00:00:00,000 --> 00:00:05,000
 * Speaker Name: Text content
 */
export function parseSRT(content: string): ParsedTranscript {
  const segments: TranscriptSegment[] = [];
  const lines = content.split('\n');

  let currentTimestamp = '';
  let currentText: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip sequence numbers and empty lines at start
    if (line === '' || /^\d+$/.test(line)) {
      // If we have accumulated text, process it
      if (currentText.length > 0 && currentTimestamp) {
        const fullText = currentText.join(' ');
        const { speaker, text } = extractSpeakerAndText(fullText);

        if (text) {
          segments.push({
            speaker,
            timestamp: formatTimestamp(currentTimestamp),
            text,
          });
        }

        currentText = [];
        currentTimestamp = '';
      }
      continue;
    }

    // Check if line is a timestamp
    if (line.includes('-->')) {
      currentTimestamp = line.split('-->')[0].trim();
      continue;
    }

    // This is text content
    if (currentTimestamp) {
      currentText.push(line);
    }
  }

  // Process any remaining text
  if (currentText.length > 0 && currentTimestamp) {
    const fullText = currentText.join(' ');
    const { speaker, text } = extractSpeakerAndText(fullText);

    if (text) {
      segments.push({
        speaker,
        timestamp: formatTimestamp(currentTimestamp),
        text,
      });
    }
  }

  const rawText = segments.map((s) => s.text).join(' ');

  logger.debug(`Parsed SRT transcript: ${segments.length} segments`);

  return { segments, rawText };
}

/**
 * Extract speaker name and text from a line
 * Format: "Speaker Name: Text content" or just "Text content"
 */
function extractSpeakerAndText(line: string): { speaker: string; text: string } {
  const colonIndex = line.indexOf(':');

  if (colonIndex > 0 && colonIndex < 50) {
    // Likely has speaker name
    const speaker = line.substring(0, colonIndex).trim();
    const text = line.substring(colonIndex + 1).trim();
    return { speaker, text };
  }

  // No speaker identified
  return { speaker: 'Unknown', text: line.trim() };
}

/**
 * Format timestamp to readable format (HH:MM:SS)
 */
function formatTimestamp(timestamp: string): string {
  // Remove milliseconds and normalize separators
  return timestamp
    .replace(/,/g, '.')
    .split('.')[0]
    .trim();
}

/**
 * Auto-detect format and parse transcript
 */
export function parseTranscript(content: string, fileExtension: string): ParsedTranscript {
  const normalizedExt = fileExtension.toLowerCase();

  if (normalizedExt === 'vtt') {
    return parseVTT(content);
  } else if (normalizedExt === 'srt') {
    return parseSRT(content);
  }

  // Try to detect based on content
  if (content.includes('WEBVTT')) {
    logger.debug('Auto-detected VTT format');
    return parseVTT(content);
  }

  // Default to SRT
  logger.debug('Defaulting to SRT format');
  return parseSRT(content);
}
