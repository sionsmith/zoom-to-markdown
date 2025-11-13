/**
 * Utility functions for sanitizing strings
 */

/**
 * Sanitize meeting title for use in filenames
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters
 * - Truncates to max length
 */
export function sanitizeTitle(title: string, maxLength = 50): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, maxLength);
}

/**
 * Extract short UUID from full Zoom UUID
 * Zoom UUIDs can be long and contain special chars
 */
export function extractShortUuid(uuid: string): string {
  // Remove special characters and take first 12 chars
  return uuid.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
}

/**
 * Create filename from title and UUID
 */
export function createFilename(title: string, uuid: string): string {
  const sanitized = sanitizeTitle(title);
  const shortUuid = extractShortUuid(uuid);
  return `${sanitized}-${shortUuid}.md`;
}
