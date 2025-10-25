/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorBoundary } from "../ErrorBoundary";

// Mock the logClientError function
vi.mock("@/lib/logClientError", () => ({
  logClientError: vi.fn().mockResolvedValue(undefined),
}));

// Component that throws an error for testing
function ErrorThrowingComponent(): never {
  throw new Error("Test error");
}

// Component that renders normally
function NormalComponent() {
  return <div>Normal content</div>;
}

describe("ErrorBoundary", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock console.error to avoid noise in test output
    consoleErrorSpy = vi.spyOn(console, "error") as any;
    // Mock window.location
    delete (window as any).location;
    (window as any).location = { href: "/test-page" } as Location;
    // Mock sessionStorage
    Object.defineProperty(window, "sessionStorage", {
      value: {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("renders children normally when no error occurs", () => {
    render(
      <ErrorBoundary>
        <NormalComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Normal content")).toBeInTheDocument();
  });

  it("renders fallback UI when an error occurs", () => {
    // Suppress React's error boundary warning in test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );
    }).not.toThrow();

    console.error = originalError;

    expect(screen.getByText("An error occurred. Redirecting...")).toBeInTheDocument();
  });

  it("logs error details when an error occurs", async () => {
    const { logClientError } = await import("@/lib/logClientError");

    // Suppress React's error boundary warning in test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );
    }).not.toThrow();

    console.error = originalError;

    await waitFor(() => {
      expect(logClientError).toHaveBeenCalledWith({
        path: undefined, // window.location.pathname is not available in jsdom
        message: "Test error",
        stack: expect.stringContaining("Test error"),
        userAgent: expect.stringContaining("jsdom"),
        componentStack: expect.stringContaining("ErrorThrowingComponent"),
      });
    });
  });

  it("stores current page URL in sessionStorage when error occurs", () => {
    // Suppress React's error boundary warning in test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );
    }).not.toThrow();

    console.error = originalError;

    expect(window.sessionStorage.setItem).toHaveBeenCalledWith("errorSourcePage", "/test-page");
  });

  it("redirects to error page after timeout", async () => {
    vi.useFakeTimers();

    // Suppress React's error boundary warning in test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );
    }).not.toThrow();

    console.error = originalError;

    // Fast-forward time by 500ms
    vi.advanceTimersByTime(500);

    expect(window.location.href).toBe("/error?message=Test%20error");
  });

  it("clears timeout on unmount", () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    // Suppress React's error boundary warning in test
    const originalError = console.error;
    console.error = vi.fn();

    const { unmount } = render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    console.error = originalError;

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("handles logging failures gracefully", async () => {
    const { logClientError } = await import("@/lib/logClientError");
    (logClientError as any).mockRejectedValue(new Error("Logging failed"));

    // Suppress React's error boundary warning in test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );
    }).not.toThrow();

    console.error = originalError;

    // Should not crash even if logging fails
    await waitFor(() => {
      expect(screen.getByText("An error occurred. Redirecting...")).toBeInTheDocument();
    });
  });
});
