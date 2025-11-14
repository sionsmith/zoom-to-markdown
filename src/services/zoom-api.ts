/**
 * Zoom Cloud Recordings API client
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';
import { ZoomAuthClient } from './zoom-auth.js';
import type {
  ZoomConfig,
  ZoomRecordingsResponse,
  ZoomRecording,
  ZoomMeetingSummary,
  ZoomMeeting,
  ZoomMeetingsReportResponse
} from '../types/index.js';

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
   * List all meetings for a user within a date range using the Reports API
   * This endpoint can fetch ALL meetings, not just cloud recordings
   * Note: Zoom limits queries to 30 days per request, so we'll chunk large ranges
   */
  async listMeetings(from: Date, to: Date): Promise<ZoomMeeting[]> {
    const allMeetings: ZoomMeeting[] = [];

    // Split date range into 30-day chunks
    const dateChunks = this.splitDateRange(from, to, 30);

    logger.group(`Fetching meetings from ${from.toISOString().split('T')[0]} to ${to.toISOString().split('T')[0]}`);
    logger.info(`Split into ${dateChunks.length} date chunks (max 30 days each)`);

    try {
      for (const chunk of dateChunks) {
        const fromStr = chunk.from.toISOString().split('T')[0];
        const toStr = chunk.to.toISOString().split('T')[0];

        logger.debug(`Fetching chunk: ${fromStr} to ${toStr}`);

        let nextPageToken: string | undefined;

        do {
          const params: Record<string, string | number> = {
            from: fromStr,
            to: toStr,
            type: 'past', // Get all past meetings
            page_size: 300,
          };

          if (nextPageToken) {
            params.next_page_token = nextPageToken;
          }

          logger.debug('API Request', {
            endpoint: `/report/users/${this.userId}/meetings`,
            params
          });

          const response = await this.axiosInstance.get<ZoomMeetingsReportResponse>(
            `/report/users/${this.userId}/meetings`,
            { params }
          );

          const { meetings, next_page_token } = response.data;

          allMeetings.push(...meetings);
          nextPageToken = next_page_token;

          logger.info(`Fetched ${meetings.length} meetings from chunk (total so far: ${allMeetings.length})`);

          // Rate limiting: wait 100ms between requests
          if (nextPageToken) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } while (nextPageToken);

        // Rate limiting between chunks
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      logger.info(`Successfully fetched ${allMeetings.length} total meetings`);
      return allMeetings;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorDetails = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.response?.data?.message || error.message,
          code: error.response?.data?.code,
          data: error.response?.data,
        };
        logger.error('Failed to fetch meetings', errorDetails);

        // More specific error messages
        if (error.response?.status === 404) {
          logger.error('User not found. Check ZOOM_USER_ID setting.');
        } else if (error.response?.status === 401) {
          logger.error('Authentication failed. Check Zoom OAuth credentials.');
        } else if (error.response?.status === 403) {
          logger.error('Permission denied. Check Zoom app scopes include: report:read:meeting');
        }
      } else {
        logger.error('Unknown error fetching meetings', error as Error);
      }
      throw error;
    } finally {
      logger.endGroup();
    }
  }

  /**
   * Split a date range into chunks of specified days (Zoom API limitation)
   */
  private splitDateRange(from: Date, to: Date, maxDays: number): Array<{ from: Date; to: Date }> {
    const chunks: Array<{ from: Date; to: Date }> = [];
    const msPerDay = 24 * 60 * 60 * 1000;
    const maxMs = maxDays * msPerDay;

    let currentFrom = new Date(from);
    const endDate = new Date(to);

    while (currentFrom < endDate) {
      const currentTo = new Date(Math.min(
        currentFrom.getTime() + maxMs,
        endDate.getTime()
      ));

      chunks.push({
        from: new Date(currentFrom),
        to: new Date(currentTo)
      });

      // Move to next chunk (add 1ms to avoid overlap)
      currentFrom = new Date(currentTo.getTime() + 1);
    }

    return chunks;
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
