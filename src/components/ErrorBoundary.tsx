import { Component, type ReactNode } from "react";
import type { ErrorInfo } from "react";
import { logClientError } from "@/lib/logClientError";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary component that catches runtime errors in children
 * and redirects to the global error page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private redirectTimeout: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console (Supabase logging skipped as events table is flashcard-specific)
    logClientError({
      path: window.location.pathname,
      message: error.message,
      stack: error.stack,
      userAgent: navigator.userAgent,
      componentStack: errorInfo.componentStack,
    }).catch(() => {
      // Silently ignore logging failures
    });

    // Store the current page URL for retry functionality
    sessionStorage.setItem("errorSourcePage", window.location.href);

    // Redirect to error page after a short delay
    this.redirectTimeout = setTimeout(() => {
      window.location.href = `/error?message=${encodeURIComponent(error.message)}`;
    }, 500);
  }

  componentWillUnmount() {
    if (this.redirectTimeout) {
      clearTimeout(this.redirectTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      // Show a minimal error state while redirecting
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <div className="text-center">
            <p className="text-muted-foreground">An error occurred. Redirecting...</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
