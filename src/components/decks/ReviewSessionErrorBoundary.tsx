import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../ui/button";
import { I18nContext, type I18nContextValue } from "../../lib/i18n/react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error boundary specifically for the review session.
 * Handles unexpected errors during review and provides recovery options.
 */
class ReviewSessionErrorBoundary extends Component<Props, State> {
  static contextType = I18nContext;
  declare context: I18nContextValue;
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to our error reporting system
    this.logError(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    // Use the existing error logging utility
    try {
      const logClientError = async () => {
        const { logClientError: logFn } = await import("../../lib/logClientError");
        await logFn({
          path: window.location.pathname,
          message: error.message,
          stack: error.stack,
          userAgent: navigator.userAgent,
          componentStack: errorInfo.componentStack,
        });
      };

      logClientError();
    } catch (loggingError) {
      // If logging fails, we don't want to create another error
      console.error("Failed to log error:", loggingError);
    }
  };

  private handleRetry = () => {
    // Clear error state and retry
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    // Full page reload as last resort
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Render error UI
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-destructive mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold mb-2">
              {this.context?.t ? this.context.t("error.unexpectedError") : "Review Session Error"}
            </h1>

            <p className="text-muted-foreground mb-6">
              {this.context?.t
                ? this.context.t("error.somethingWentWrong")
                : "Something went wrong during your review session. Your progress has been saved, but we encountered an unexpected error."}
            </p>

            <div className="space-y-3">
              <Button onClick={this.handleRetry} className="w-full">
                {this.context?.t ? this.context.t("error.retry") : "Try Again"}
              </Button>

              <Button onClick={this.handleReload} variant="outline" className="w-full">
                {this.context?.t ? this.context.t("common.reload") : "Reload Page"}
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium mb-2">
                  {this.context?.t ? this.context.t("error.errorDetails") : "Error Details (Development)"}
                </summary>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                  {this.state.error.message}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component that provides the error boundary with i18n context
 * Note: This now inherits i18n context from the parent ReviewSessionView
 */
export function ReviewSessionErrorBoundaryWithI18n({ children }: { children: ReactNode }) {
  return <ReviewSessionErrorBoundary>{children}</ReviewSessionErrorBoundary>;
}
