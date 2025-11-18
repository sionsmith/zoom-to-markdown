/**
 * Convert Zoom AI Meeting Summary to our MeetingNote format
 */

import type { ZoomMeetingSummary, MeetingNote, ActionItem, ParsedTranscript } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Convert Zoom AI summary to MeetingNote format
 */
export function convertZoomSummaryToMeetingNote(summary: ZoomMeetingSummary): MeetingNote {
  logger.debug('Converting Zoom AI summary to MeetingNote format');

  // Convert next steps to action items
  const actionItems: ActionItem[] = (summary.next_steps || []).map((step) => ({
    text: step,  // next_steps is an array of strings
    assignee: undefined,  // Zoom doesn't provide assignee info
    confidence: 0.95, // High confidence since it's from Zoom AI
  }));

  // Create a pseudo-transcript from summary details
  const summaryDetails = summary.summary_details || [];
  const transcript: ParsedTranscript = {
    segments: summaryDetails.map((detail, index) => ({
      speaker: detail.label || 'Summary',  // Use label as speaker
      timestamp: formatTimestamp(index),
      text: detail.summary,  // Use summary field
    })),
    rawText: summaryDetails.map((d) => d.summary).join('\n\n'),
  };

  // Extract key points from summary details (all labels)
  const keyPoints = summaryDetails.map((d) => d.label);

  return {
    metadata: {
      title: summary.meeting_topic,
      meetingId: summary.meeting_id.toString(),
      uuid: summary.meeting_uuid,
      startTime: summary.meeting_start_time,
      duration: calculateDuration(summary.meeting_start_time, summary.meeting_end_time),
      host: summary.meeting_host_email,
      participants: [summary.meeting_host_email], // AI summary doesn't include participant list
      recordingCount: 0,
      transcriptAvailable: false, // Using AI summary instead
    },
    transcript,
    actionItems,
    keyPoints,
  };
}

/**
 * Calculate duration in seconds from start and end times
 */
function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return Math.floor((end - start) / 1000);
}

/**
 * Format a fake timestamp for summary segments
 */
function formatTimestamp(index: number): string {
  const minutes = index * 5; // Assume 5 minutes per section
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
}
