/**
 * Centralized error logging service
 */
export const errorLogger = {
  /**
   * Log a client-side error for monitoring
   */
  async logClientError(error: Error, context: string): Promise<void> {
    try {
      const { logClientError } = await import("../logClientError");
      await logClientError({
        path: context,
        message: error.message,
        stack: error.stack,
        userAgent: navigator.userAgent,
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
  },

  /**
   * Log error with custom context
   */
  logError(error: Error, context: string): void {
    console.error(`[${context}]`, error);
    this.logClientError(error, context);
  },
};
