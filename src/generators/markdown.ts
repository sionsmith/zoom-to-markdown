/**
 * Markdown file generator with YAML frontmatter
 */

import matter from 'gray-matter';
import { format } from 'date-fns';
import type { MeetingNote } from '../types/index.js';

/**
 * Generate Markdown content from meeting note data
 */
export function generateMarkdown(note: MeetingNote): string {
  const { metadata, transcript, actionItems } = note;

  // Prepare frontmatter
  const frontmatter = {
    title: metadata.title,
    meeting_id: metadata.meetingId,
    uuid: metadata.uuid,
    start_time: metadata.startTime,
    duration: metadata.duration,
    host: metadata.host,
    participants: metadata.participants,
    recording_count: metadata.recordingCount,
    transcript_available: metadata.transcriptAvailable,
  };

  // Format date and time
  const startDate = new Date(metadata.startTime);
  const formattedDate = format(startDate, 'MMMM d, yyyy');
  const formattedTime = format(startDate, 'h:mm a');
  const durationMinutes = Math.round(metadata.duration / 60);

  // Build markdown body
  const sections: string[] = [];

  // Title and metadata section
  sections.push(`# ${metadata.title}`);
  sections.push('');
  sections.push(`**Date:** ${formattedDate}`);
  sections.push(`**Time:** ${formattedTime} UTC`);
  sections.push(`**Duration:** ${durationMinutes} minutes`);
  sections.push(`**Host:** ${metadata.host}`);
  sections.push('');

  // Participants section
  if (metadata.participants.length > 0) {
    sections.push('## Participants');
    for (const participant of metadata.participants) {
      const isHost = participant === metadata.host;
      sections.push(`- ${participant}${isHost ? ' (Host)' : ''}`);
    }
    sections.push('');
  }

  // Action items section
  if (actionItems.length > 0) {
    sections.push('## Action Items');
    sections.push('> ⚠️ Note: Action items are automatically extracted and may require verification.');
    sections.push('');

    // Sort by confidence (highest first)
    const sortedItems = [...actionItems].sort((a, b) => b.confidence - a.confidence);

    for (const item of sortedItems) {
      const assigneePart = item.assignee ? ` (${item.assignee})` : '';
      const dueDatePart = item.dueDate ? ` - Due: ${item.dueDate}` : '';
      sections.push(`- [ ] ${item.text}${assigneePart}${dueDatePart}`);
    }
    sections.push('');
  }

  // Transcript section
  if (transcript.segments.length > 0) {
    sections.push('## Full Transcript');
    sections.push('');

    let lastSpeaker = '';

    for (const segment of transcript.segments) {
      // Group consecutive segments from same speaker
      if (segment.speaker !== lastSpeaker) {
        sections.push(`**[${segment.timestamp}] ${segment.speaker}:**`);
        lastSpeaker = segment.speaker;
      }

      sections.push(segment.text);
      sections.push('');
    }
  }

  // Footer
  sections.push('---');
  sections.push('');
  sections.push('*This meeting note was automatically generated from Zoom Cloud Recording.*');
  sections.push(`*Meeting UUID: ${metadata.uuid}*`);

  const body = sections.join('\n');

  // Combine frontmatter and body using gray-matter
  const content = matter.stringify(body, frontmatter);

  return content;
}

/**
 * Parse existing markdown file (useful for updates)
 */
export function parseMarkdown(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const { data, content: body } = matter(content);
  return { frontmatter: data, body };
}
