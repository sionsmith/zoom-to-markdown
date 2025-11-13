/**
 * Zoom Cloud Recordings API client
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';
import { ZoomAuthClient } from './zoom-auth.js';
import type { ZoomConfig, ZoomRecordingsResponse, ZoomRecording } from '../types/index.js';

export class ZoomApiClient {
  private authClient: ZoomAuthClient;
  private axiosInstance: AxiosInstance;
  private userId: string;

  constructor(config: ZoomConfig) {
    this.authClient = new ZoomAuthClient(config);
    this.userId = config.userId || 'me';

    this.axiosInstance = axios.create({
      baseURL: 'https://api.zoom.us/v2',
      timeout: 30000,
    });

    // Add request interceptor to include OAuth token
    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await this.authClient.getAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Add response interceptor for retry on 401
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && !error.config._retry) {
          error.config._retry = true;
          this.authClient.clearCache();
          const token = await this.authClient.getAccessToken();
          error.config.headers.Authorization = `Bearer ${token}`;
          return this.axiosInstance.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * List cloud recordings for a user within a date range
   */
  async listRecordings(from: Date, to: Date): Promise<ZoomRecording[]> {
    const recordings: ZoomRecording[] = [];
    let nextPageToken: string | undefined;

    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    logger.group(`Fetching recordings from ${fromStr} to ${toStr}`);

    try {
      do {
        const params: Record<string, string | number> = {
          from: fromStr,
          to: toStr,
          page_size: 300,
        };

        if (nextPageToken) {
          params.next_page_token = nextPageToken;
        }

        logger.debug('API Request', { endpoint: `/users/${this.userId}/recordings`, params });

        const response = await this.axiosInstance.get<ZoomRecordingsResponse>(
          `/users/${this.userId}/recordings`,
          { params }
        );

        const { meetings, next_page_token, total_records } = response.data;

        recordings.push(...meetings);
        nextPageToken = next_page_token;

        logger.info(`Fetched ${meetings.length} recordings (total: ${recordings.length}/${total_records})`);

        // Rate limiting: wait 100ms between requests
        if (nextPageToken) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } while (nextPageToken);

      logger.info(`Successfully fetched ${recordings.length} total recordings`);
      return recordings;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Failed to fetch recordings', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
        });
      }
      throw error;
    } finally {
      logger.endGroup();
    }
  }

  /**
   * Download a file from Zoom (transcript, recording, etc.)
   */
  async downloadFile(url: string): Promise<string> {
    try {
      const token = await this.authClient.getAccessToken();

      const response = await axios.get<string>(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'text',
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Failed to download file', {
          url,
          status: error.response?.status,
        });
      }
      throw new Error(`Failed to download file: ${url}`);
    }
  }

  /**
   * Filter recordings that have completed transcripts
   */
  filterRecordingsWithTranscripts(recordings: ZoomRecording[]): ZoomRecording[] {
    return recordings.filter((recording) => {
      const hasTranscript = recording.recording_files.some(
        (file) => file.file_type === 'TRANSCRIPT' && file.status === 'completed'
      );
      return hasTranscript;
    });
  }
}
