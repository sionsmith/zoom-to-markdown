/**
 * State management for tracking processed recordings
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import type { State, ProcessedRecording } from '../types/index.js';

export class StateManager {
  private stateFilePath: string;
  private state: State;

  constructor(stateFilePath = '.state.json') {
    this.stateFilePath = stateFilePath;
    this.state = this.getDefaultState();
  }

  /**
   * Load state from disk
   */
  async load(): Promise<void> {
    try {
      if (existsSync(this.stateFilePath)) {
        const content = await fs.readFile(this.stateFilePath, 'utf-8');
        this.state = JSON.parse(content);
        logger.info('Loaded state', {
          totalMeetings: this.state.statistics.totalMeetings,
          lastRun: this.state.statistics.lastRunAt,
        });
      } else {
        logger.info('No existing state file found, starting fresh');
        this.state = this.getDefaultState();
      }
    } catch (error) {
      logger.error('Failed to load state file, starting with default state', error as Error);
      this.state = this.getDefaultState();
    }
  }

  /**
   * Save state to disk
   */
  async save(): Promise<void> {
    try {
      const content = JSON.stringify(this.state, null, 2);
      await fs.writeFile(this.stateFilePath, content, 'utf-8');
      logger.debug('Saved state to disk');
    } catch (error) {
      logger.error('Failed to save state file', error as Error);
      throw error;
    }
  }

  /**
   * Check if recording has been processed
   */
  isProcessed(uuid: string): boolean {
    return uuid in this.state.processedRecordings;
  }

  /**
   * Add processed recording to state
   */
  addProcessedRecording(recording: ProcessedRecording): void {
    this.state.processedRecordings[recording.uuid] = recording;
    this.state.statistics.totalMeetings++;
  }

  /**
   * Get last fetch timestamp
   */
  getLastFetchTimestamp(): string {
    return this.state.lastFetchTimestamp;
  }

  /**
   * Update last fetch timestamp
   */
  updateLastFetchTimestamp(timestamp: string): void {
    this.state.lastFetchTimestamp = timestamp;
  }

  /**
   * Update statistics after a run
   */
  updateStatistics(status: 'success' | 'failure' | 'partial'): void {
    this.state.statistics.lastRunStatus = status;
    this.state.statistics.lastRunAt = new Date().toISOString();

    if (status === 'failure') {
      this.state.statistics.consecutiveFailures++;
    } else {
      this.state.statistics.consecutiveFailures = 0;
    }
  }

  /**
   * Get current state (for debugging/reporting)
   */
  getState(): State {
    return { ...this.state };
  }

  /**
   * Create hash of content for duplicate detection
   */
  createHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Get default/initial state
   */
  private getDefaultState(): State {
    // Zoom Reports API only allows queries for the last 6 months
    // Start from 5 months ago to be safe
    const fiveMonthsAgo = new Date();
    fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
    fiveMonthsAgo.setHours(0, 0, 0, 0);

    return {
      lastFetchTimestamp: fiveMonthsAgo.toISOString(), // Last 5 months to stay within Zoom's 6-month limit
      processedRecordings: {},
      statistics: {
        totalMeetings: 0,
        lastRunStatus: 'success',
        lastRunAt: new Date().toISOString(),
        consecutiveFailures: 0,
      },
    };
  }
}
