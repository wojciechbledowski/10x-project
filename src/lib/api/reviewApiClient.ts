import type { ReviewQueueResponse, CreateReviewRequest } from "@/types";

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: (attempt: number) => number;
}

/**
 * Fetch with exponential backoff retry logic
 */
async function retryableFetch<T>(url: string, options: RequestInit = {}, retryOptions: RetryOptions = {}): Promise<T> {
  const { maxRetries = 3, retryDelay = (attempt) => Math.pow(2, attempt) * 1000 } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Handle specific status codes
      if (response.status === 401) {
        throw new Error("Authentication required. Please sign in again.");
      }

      if (response.status === 404) {
        throw new Error("Resource not found. It may have been deleted.");
      }

      if (response.status === 429) {
        throw new Error("Too many requests. Please wait a moment and try again.");
      }

      // Retry on server errors
      if (response.status >= 500 && attempt < maxRetries - 1) {
        const delay = retryDelay(attempt);
        // Log retry attempt for debugging
        if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.warn(`Request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms`);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Request failed: HTTP ${response.status}`);
      }

      return response.json();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Request failed");

      // Don't retry on client errors (4xx) except 429
      if (lastError.message.includes("Authentication") || lastError.message.includes("not found")) {
        throw lastError;
      }

      // Last attempt - throw the error
      if (attempt === maxRetries - 1) {
        throw lastError;
      }

      // Wait before retrying
      const delay = retryDelay(attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Request failed after retries");
}

/**
 * API client for review operations with built-in retry logic
 */
export const reviewApi = {
  /**
   * Load the review queue
   */
  async loadQueue(): Promise<ReviewQueueResponse> {
    return retryableFetch<ReviewQueueResponse>("/api/reviews/queue", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  /**
   * Submit a review for a flashcard
   */
  async submitReview(request: CreateReviewRequest): Promise<unknown> {
    return retryableFetch<unknown>(
      "/api/reviews",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
      {
        maxRetries: 2, // Fewer retries for POST requests
      }
    );
  },
};
