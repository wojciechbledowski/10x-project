/**
 * HTTP Client for OpenRouter API
 *
 * Handles low-level HTTP communication with retry logic, timeouts, and auth.
 */

import { HttpError, NetworkError, RateLimitError, TimeoutError, AuthError, ValidationError } from "@/lib/utils/errors";
import type { Logger } from "@/lib/utils/logger";
import { ModelError } from "./errors";

export interface HttpClientConfig {
  baseURL: string;
  apiKey: string;
  timeoutMs: number;
  logger?: Logger;
  maxRetries?: number;
}

export interface FetchOptions {
  method: string;
  body?: string;
  signal?: AbortSignal;
}

/**
 * HTTP client with retry logic and error handling
 */
export class HttpClient {
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly logger?: Logger;
  private readonly maxRetries: number;

  constructor(config: HttpClientConfig) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs;
    this.logger = config.logger;
    this.maxRetries = config.maxRetries ?? 3;
  }

  /**
   * Make a POST request with retry logic
   */
  async post<T>(path: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const payload = JSON.stringify(body);

    return this.retryableFetch(url, {
      method: "POST",
      body: payload,
      signal,
    });
  }

  /**
   * Fetch with exponential backoff retry logic
   */
  private async retryableFetch<T>(url: string, options: FetchOptions): Promise<T> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        return await this.executeFetch<T>(url, options, attempt);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on these errors
        if (
          error instanceof AuthError ||
          error instanceof ValidationError ||
          error instanceof ModelError ||
          error instanceof TimeoutError
        ) {
          throw error;
        }

        // For rate limit errors, check retry-after
        if (error instanceof RateLimitError) {
          const retryAfter = error.retryAfter;
          if (retryAfter && attempt < this.maxRetries - 1) {
            this.logger?.warn(`Rate limited. Retrying after ${retryAfter}ms`, {
              attempt,
              retryAfter,
            });
            await this.sleep(retryAfter);
            attempt++;
            continue;
          }
          throw error;
        }

        // Exponential backoff for network errors
        if (error instanceof NetworkError || error instanceof HttpError) {
          if (attempt < this.maxRetries - 1) {
            const backoffMs = this.calculateBackoff(attempt);
            this.logger?.warn(`Request failed. Retrying after ${backoffMs}ms`, {
              attempt,
              error: error.message,
            });
            await this.sleep(backoffMs);
            attempt++;
            continue;
          }
        }

        throw error;
      }
    }

    throw lastError || new NetworkError("Max retries exceeded");
  }

  /**
   * Execute a single fetch request with timeout
   */
  private async executeFetch<T>(url: string, options: FetchOptions, attempt: number): Promise<T> {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    // Combine with user's abort signal if provided
    const signal = options.signal ? this.combineSignals(controller.signal, options.signal) : controller.signal;

    try {
      this.logger?.debug(`Making request to ${url}`, { attempt });

      const response = await fetch(url, {
        method: options.method,
        headers: this.buildHeaders(),
        body: options.body,
        signal,
      });

      clearTimeout(timeoutId);

      return await this.handleResponse<T>(response);
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort from timeout
      if (error instanceof Error && error.name === "AbortError") {
        if (options.signal?.aborted) {
          throw new TimeoutError("Request cancelled by user", this.timeoutMs);
        }
        throw new TimeoutError(`Request timeout after ${this.timeoutMs}ms`, this.timeoutMs);
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new NetworkError(`Network request failed: ${error.message}`, error);
      }

      throw error;
    }
  }

  /**
   * Build request headers with authentication
   */
  private buildHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "HTTP-Referer": "https://astro.build", // Optional: for OpenRouter analytics
      "X-Title": "Astro Application", // Optional: for OpenRouter analytics
    };
  }

  /**
   * Handle HTTP response and parse body
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    // Handle successful responses
    if (response.ok) {
      if (!isJson) {
        throw new HttpError("Expected JSON response", response.status, await response.text());
      }

      try {
        return (await response.json()) as T;
      } catch (error) {
        throw new HttpError("Failed to parse JSON response", response.status, undefined, error as Error);
      }
    }

    // Handle error responses
    const errorBody = isJson ? await response.json() : await response.text();

    // Map specific status codes to custom errors
    switch (response.status) {
      case 401:
        throw new AuthError(this.extractErrorMessage(errorBody) || "Invalid API key");

      case 400:
        throw new ValidationError(
          this.extractErrorMessage(errorBody) || "Invalid request",
          typeof errorBody === "object" ? errorBody : undefined
        );

      case 404:
        throw new ModelError(this.extractErrorMessage(errorBody) || "Model not found");

      case 429: {
        const retryAfter = this.parseRetryAfter(response.headers.get("Retry-After"));
        throw new RateLimitError(this.extractErrorMessage(errorBody) || "Rate limit exceeded", retryAfter);
      }

      default:
        throw new HttpError(
          this.extractErrorMessage(errorBody) || "Request failed",
          response.status,
          typeof errorBody === "string" ? errorBody : JSON.stringify(errorBody)
        );
    }
  }

  /**
   * Extract error message from OpenRouter error response
   */
  private extractErrorMessage(body: unknown): string | null {
    if (!body || typeof body !== "object") {
      return null;
    }

    const errorObj = body as Record<string, unknown>;

    // OpenRouter error format: { error: { message: "..." } }
    if (errorObj.error && typeof errorObj.error === "object") {
      const error = errorObj.error as Record<string, unknown>;
      if (typeof error.message === "string") {
        return error.message;
      }
    }

    // Fallback to top-level message
    if (typeof errorObj.message === "string") {
      return errorObj.message;
    }

    return null;
  }

  /**
   * Parse Retry-After header to milliseconds
   */
  private parseRetryAfter(header: string | null): number | undefined {
    if (!header) {
      return undefined;
    }

    // Try parsing as seconds (integer)
    const seconds = parseInt(header, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }

    // Try parsing as HTTP date
    const date = new Date(header);
    if (!isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now());
    }

    return undefined;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    const baseDelay = 1000;
    const maxDelay = 10000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Combine multiple abort signals
   */
  private combineSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
    const controller = new AbortController();

    const abort = () => controller.abort();
    signal1.addEventListener("abort", abort, { once: true });
    signal2.addEventListener("abort", abort, { once: true });

    return controller.signal;
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
