/**
 * Structured logger for GitHub Actions compatibility
 */

type LogLevel = 'debug' | 'info' | 'warning' | 'error';

class Logger {
  private isGitHubActions: boolean;

  constructor() {
    this.isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  }

  private formatMessage(level: LogLevel, message: string, data?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    console.log(this.formatMessage('debug', message, data));
  }

  info(message: string, data?: Record<string, unknown>): void {
    console.log(this.formatMessage('info', message, data));
  }

  warning(message: string, data?: Record<string, unknown>): void {
    if (this.isGitHubActions) {
      console.log(`::warning::${message}`);
    } else {
      console.warn(this.formatMessage('warning', message, data));
    }
  }

  error(message: string, error?: Error | Record<string, unknown>): void {
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;

    if (this.isGitHubActions) {
      console.log(`::error::${message}`);
      // Also log the error data as a regular log so we can see details
      if (errorData) {
        console.log(this.formatMessage('error', 'Error details', errorData));
      }
    } else {
      console.error(this.formatMessage('error', message, errorData));
    }
  }

  group(name: string): void {
    if (this.isGitHubActions) {
      console.log(`::group::${name}`);
    } else {
      console.log(`\n=== ${name} ===`);
    }
  }

  endGroup(): void {
    if (this.isGitHubActions) {
      console.log('::endgroup::');
    } else {
      console.log('');
    }
  }
}

export const logger = new Logger();
