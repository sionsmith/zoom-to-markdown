/**
 * Action item extractor using pattern matching
 */

import type { ActionItem, ParsedTranscript } from '../types/index.js';
import { logger } from '../utils/logger.js';

// Patterns that indicate action items
const ACTION_PATTERNS = [
  /\b(action item|action|todo|to-do|task|follow[- ]?up)\b/i,
  /\b(will|need to|should|must|have to|going to)\s+\w+/i,
  /\b(by|before|until|due)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|next week|eow|eod)/i,
  /\b(responsible|owner|assigned to|assignee)\b/i,
  /\b(deadline|due date)\b/i,
];

// Patterns for identifying assignees
const ASSIGNEE_PATTERNS = [
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:will|should|needs? to|is responsible|is assigned)/i,
  /(?:assigned to|owner:?|responsible:?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
];

// Patterns for identifying due dates
const DUE_DATE_PATTERNS = [
  /\b(by|before|until|due)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|next week|eow|eod|[0-9]{1,2}\/[0-9]{1,2}|[A-Z][a-z]+\s+[0-9]{1,2})/i,
];

/**
 * Extract action items from transcript using pattern matching
 */
export function extractActionItems(transcript: ParsedTranscript): ActionItem[] {
  const actionItems: ActionItem[] = [];

  logger.group('Extracting action items');

  // Analyze each segment
  for (const segment of transcript.segments) {
    const text = segment.text;
    const matchCount = countPatternMatches(text);

    // If segment matches multiple patterns, likely an action item
    if (matchCount >= 2) {
      const assignee = extractAssignee(text, segment.speaker);
      const dueDate = extractDueDate(text);
      const confidence = calculateConfidence(matchCount, !!assignee, !!dueDate);

      actionItems.push({
        text: text.trim(),
        assignee,
        dueDate,
        confidence,
      });

      logger.debug('Found action item', {
        text: text.substring(0, 50) + '...',
        confidence,
      });
    }
  }

  // Also check for explicit action item lists in raw text
  const explicitItems = extractExplicitActionItems(transcript.rawText);
  actionItems.push(...explicitItems);

  logger.info(`Extracted ${actionItems.length} action items`);
  logger.endGroup();

  return actionItems;
}

/**
 * Count how many patterns match in the text
 */
function countPatternMatches(text: string): number {
  return ACTION_PATTERNS.filter((pattern) => pattern.test(text)).length;
}

/**
 * Try to extract assignee from text
 */
function extractAssignee(text: string, speaker: string): string | undefined {
  for (const pattern of ASSIGNEE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If text says "I will" and we know the speaker, use speaker as assignee
  if (/\bI\s+(will|should|need to)\b/i.test(text) && speaker !== 'Unknown') {
    return speaker;
  }

  return undefined;
}

/**
 * Try to extract due date from text
 */
function extractDueDate(text: string): string | undefined {
  for (const pattern of DUE_DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[2]) {
      return match[2].trim();
    }
  }

  return undefined;
}

/**
 * Calculate confidence score (0-1) based on indicators
 */
function calculateConfidence(
  patternMatches: number,
  hasAssignee: boolean,
  hasDueDate: boolean
): number {
  let confidence = 0.3; // Base confidence

  // More pattern matches = higher confidence
  confidence += Math.min(patternMatches * 0.15, 0.45);

  // Having assignee increases confidence
  if (hasAssignee) confidence += 0.15;

  // Having due date increases confidence
  if (hasDueDate) confidence += 0.1;

  return Math.min(confidence, 1.0);
}

/**
 * Extract explicit action items (e.g., "Action items:" followed by list)
 */
function extractExplicitActionItems(text: string): ActionItem[] {
  const items: ActionItem[] = [];

  // Look for "action items:" or "action item:" followed by content
  const actionItemSection = text.match(
    /action items?:([^.]*(?:\.[^.]*){0,3})/i
  );

  if (actionItemSection && actionItemSection[1]) {
    const content = actionItemSection[1].trim();

    // Split by common list delimiters
    const itemTexts = content
      .split(/[,;]|\band\b/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    for (const itemText of itemTexts) {
      items.push({
        text: itemText,
        confidence: 0.8, // High confidence for explicit items
      });
    }
  }

  return items;
}
