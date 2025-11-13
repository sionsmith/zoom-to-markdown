/**
 * Filesystem utilities for date-based folder organization
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { logger } from './logger.js';

/**
 * Create date-based folder path (YYYY/MM/DD)
 */
export function createDatePath(date: Date, baseDir: string): string {
  const year = format(date, 'yyyy');
  const month = format(date, 'MM');
  const day = format(date, 'dd');

  return path.join(baseDir, year, month, day);
}

/**
 * Ensure directory exists, create if it doesn't
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await fs.mkdir(dirPath, { recursive: true });
    logger.debug(`Created directory: ${dirPath}`);
  }
}

/**
 * Write file to disk (with directory creation)
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDirectory(dir);
  await fs.writeFile(filePath, content, 'utf-8');
  logger.debug(`Wrote file: ${filePath}`);
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Read file from disk
 */
export async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

/**
 * Get all files in directory recursively
 */
export async function getFilesRecursively(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  if (!existsSync(dirPath)) {
    return files;
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await getFilesRecursively(fullPath);
      files.push(...subFiles);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}
