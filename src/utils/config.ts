/**
 * Configuration loader and validator
 */

import { z } from 'zod';
import type { Config } from '../types/index.js';

const ConfigSchema = z.object({
  zoom: z.object({
    accountId: z.string().min(1, 'ZOOM_ACCOUNT_ID is required'),
    clientId: z.string().min(1, 'ZOOM_CLIENT_ID is required'),
    clientSecret: z.string().min(1, 'ZOOM_CLIENT_SECRET is required'),
    userId: z.string().optional(),
  }),
  outputDir: z.string().default('meeting-notes'),
  pollIntervalMinutes: z.number().min(5).max(60).default(15),
  enableActionItemExtraction: z.boolean().default(true),
  enableLLMProcessing: z.boolean().default(false),
  maxRecordingsPerRun: z.number().min(1).max(1000).default(100),
});

export function loadConfig(): Config {
  const config: Config = {
    zoom: {
      accountId: process.env.ZOOM_ACCOUNT_ID || '',
      clientId: process.env.ZOOM_CLIENT_ID || '',
      clientSecret: process.env.ZOOM_CLIENT_SECRET || '',
      userId: process.env.ZOOM_USER_ID || 'me',
    },
    outputDir: process.env.OUTPUT_DIR || 'meeting-notes',
    pollIntervalMinutes: parseInt(process.env.POLL_INTERVAL_MINUTES || '15', 10),
    enableActionItemExtraction: process.env.ENABLE_ACTION_ITEMS !== 'false',
    enableLLMProcessing: process.env.ENABLE_LLM === 'true',
    maxRecordingsPerRun: parseInt(process.env.MAX_RECORDINGS_PER_RUN || '100', 10),
  };

  try {
    return ConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.errors.map((e) => e.path.join('.')).join(', ');
      throw new Error(`Configuration validation failed: ${missingFields}`);
    }
    throw error;
  }
}
