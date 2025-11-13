/**
 * Zoom OAuth Server-to-Server authentication
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';
import type { ZoomConfig } from '../types/index.js';

interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

export class ZoomAuthClient {
  private config: ZoomConfig;
  private tokenCache: TokenCache | null = null;

  constructor(config: ZoomConfig) {
    this.config = config;
  }

  /**
   * Get a valid access token (from cache or by requesting new one)
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      logger.debug('Using cached access token');
      return this.tokenCache.token;
    }

    logger.debug('Requesting new access token');
    const token = await this.requestAccessToken();

    // Cache the token (subtract 60 seconds for safety margin)
    this.tokenCache = {
      token: token.access_token,
      expiresAt: Date.now() + (token.expires_in - 60) * 1000,
    };

    return token.access_token;
  }

  /**
   * Request a new OAuth token from Zoom
   */
  private async requestAccessToken(): Promise<OAuthToken> {
    const url = 'https://zoom.us/oauth/token';
    const params = {
      grant_type: 'account_credentials',
      account_id: this.config.accountId,
    };

    const auth = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64');

    try {
      const response = await axios.post<OAuthToken>(url, null, {
        params,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      logger.info('Successfully obtained OAuth token');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Failed to obtain OAuth token', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw new Error('Failed to authenticate with Zoom API');
    }
  }

  /**
   * Clear cached token (useful for testing or error recovery)
   */
  clearCache(): void {
    this.tokenCache = null;
  }
}
