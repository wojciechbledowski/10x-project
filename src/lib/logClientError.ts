import type { ErrorLogPayload } from "@/types";

/**
 * Logs client-side errors to console and external monitoring
 * Note: Supabase events table is specific to flashcard events,
 * so we log errors to console instead. In production, integrate
 * with services like Sentry, LogRocket, or create a dedicated error_logs table.
 */
export async function logClientError(payload: ErrorLogPayload): Promise<void> {
  try {
    // Validate required fields
    if (!payload.path || !payload.message) {
      // eslint-disable-next-line no-console
      console.warn("Error log missing required fields");
      return;
    }

    // Log to console with structured format
    // eslint-disable-next-line no-console
    console.error("Client Error:", {
      timestamp: new Date().toISOString(),
      path: payload.path,
      message: payload.message,
      stack: payload.stack,
      userAgent: payload.userAgent,
      componentStack: payload.componentStack,
    });

    // TODO: In production, send to external error monitoring service
    // Example: Sentry, LogRocket, Datadog, or custom error_logs table
  } catch (error) {
    // Silently fail - don't throw to prevent error logging loops
    // eslint-disable-next-line no-console
    console.warn("Failed to log error", error);
  }
}
