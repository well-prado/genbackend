import { DefaultLogger } from '@nanoservice-ts/runner';

/**
 * Extended logger to properly handle multiple arguments and unknown errors
 */
class Logger {
  private logger: DefaultLogger;

  constructor() {
    this.logger = new DefaultLogger();
  }

  /**
   * Log an informational message
   */
  log(message: string, ...args: any[]): void {
    if (args.length === 0) {
      this.logger.log(message);
    } else {
      this.logger.log(`${message} ${args.map(arg => String(arg)).join(' ')}`);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: unknown): void {
    if (!error) {
      this.logger.log(message);
      return;
    }

    let errorMsg = 'Unknown error';
    if (error instanceof Error) {
      errorMsg = error.message;
    } else if (typeof error === 'string') {
      errorMsg = error;
    } else if (error !== null && typeof error === 'object') {
      errorMsg = JSON.stringify(error);
    }

    this.logger.log(`${message} ${errorMsg}`);
  }

  /**
   * Log a warning message (not available in DefaultLogger)
   */
  warn(message: string): void {
    // Since DefaultLogger doesn't have a warn method, we use log
    this.logger.log(`[WARN] ${message}`);
  }
}

// Export a singleton instance of the logger
export const logger = new Logger(); 