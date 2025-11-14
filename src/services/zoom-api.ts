/**
 * Zoom Cloud Recordings API client
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';
import { ZoomAuthClient } from './zoom-auth.js';
import type { ZoomConfig, ZoomRecordingsResponse, ZoomRecording, ZoomMeetingSummary } from '../types/index.js';

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
        const errorDetails = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.response?.data?.message || error.message,
          code: error.response?.data?.code,
          data: error.response?.data,
        };
        logger.error('Failed to fetch recordings', errorDetails);

        // More specific error messages
        if (error.response?.status === 404) {
          logger.error('User not found or no recordings available. Check ZOOM_USER_ID setting.');
        } else if (error.response?.status === 401) {
          logger.error('Authentication failed. Check Zoom OAuth credentials.');
        } else if (error.response?.status === 403) {
          logger.error('Permission denied. Check Zoom app scopes include: recording:read:admin');
        }
      } else {
        logger.error('Unknown error fetching recordings', error as Error);
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
   * Get AI-generated meeting summary for a meeting
   */
  async getMeetingSummary(meetingUuid: string): Promise<ZoomMeetingSummary | null> {
    try {
      // Double encode the UUID as required by Zoom API
      const encodedUuid = encodeURIComponent(encodeURIComponent(meetingUuid));

      logger.debug(`Fetching meeting summary for: ${meetingUuid}`);

      const response = await this.axiosInstance.get<ZoomMeetingSummary>(
        `/meetings/${encodedUuid}/meeting_summary`
      );

      logger.info(`Successfully fetched meeting summary for: ${meetingUuid}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404 || error.response?.data?.code === 3001) {
          // 3001 = No summary available for this meeting
          logger.debug(`No meeting summary available for: ${meetingUuid}`);
          return null;
        }

        logger.error('Failed to fetch meeting summary', {
          uuid: meetingUuid,
          status: error.response?.status,
          code: error.response?.data?.code,
          message: error.response?.data?.message,
        });
      }
      return null;
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
