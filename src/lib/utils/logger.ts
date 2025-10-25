/**
 * Generic Logger Utility
 *
 * Provides logger interface and implementations for application-wide logging.
 */

/**
 * Logger interface for structured logging
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Console logger implementation with optional context prefix
 */
export class ConsoleLogger implements Logger {
  private readonly context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  private formatMessage(message: string): string {
    return this.context ? `[${this.context}] ${message}` : message;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (meta && Object.keys(meta).length > 0) {
      console.debug(this.formatMessage(message), meta);
    } else {
      console.debug(this.formatMessage(message));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (meta && Object.keys(meta).length > 0) {
      console.info(this.formatMessage(message), meta);
    } else {
      console.info(this.formatMessage(message));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (meta && Object.keys(meta).length > 0) {
      console.warn(this.formatMessage(message), meta);
    } else {
      console.warn(this.formatMessage(message));
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (meta && Object.keys(meta).length > 0) {
      console.error(this.formatMessage(message), meta);
    } else {
      console.error(this.formatMessage(message));
    }
  }
}

/**
 * No-op logger (silent) - useful for testing or production where logging is disabled
 */
export class NoopLogger implements Logger {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  debug(_message: string, _meta?: Record<string, unknown>): void {
    // No-op
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  info(_message: string, _meta?: Record<string, unknown>): void {
    // No-op
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  warn(_message: string, _meta?: Record<string, unknown>): void {
    // No-op
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  error(_message: string, _meta?: Record<string, unknown>): void {
    // No-op
  }
}
