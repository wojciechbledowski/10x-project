/**
 * Generic Rate Limiter Utility
 *
 * Provides rate limiting interface and implementations for application-wide rate limiting.
 */

/**
 * Rate limiter interface for usage quotas
 */
export interface RateLimiter {
  checkLimit(): Promise<boolean>;
  recordUsage(tokens?: number): Promise<void>;
}

/**
 * No-op rate limiter (no limits) - useful for development or when rate limiting is disabled
 */
export class NoopRateLimiter implements RateLimiter {
  async checkLimit(): Promise<boolean> {
    return true;
  }

  async recordUsage(): Promise<void> {
    // No-op
  }
}

/**
 * Simple in-memory rate limiter using token bucket algorithm
 *
 * The token bucket algorithm allows for burst traffic while maintaining
 * an average rate limit. Tokens are added at a constant rate and consumed
 * for each request.
 */
export class TokenBucketRateLimiter implements RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  /**
   * @param maxTokens - Maximum number of tokens in the bucket (burst capacity)
   * @param refillRate - Number of tokens added per second
   */
  constructor(maxTokens = 100, refillRate = 10) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async checkLimit(): Promise<boolean> {
    this.refillTokens();
    return this.tokens >= 1;
  }

  async recordUsage(tokens = 1): Promise<void> {
    this.refillTokens();
    this.tokens = Math.max(0, this.tokens - tokens);
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Get current token count (for debugging)
   */
  getCurrentTokens(): number {
    this.refillTokens();
    return this.tokens;
  }

  /**
   * Reset tokens to maximum capacity
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

/**
 * Sliding window rate limiter
 *
 * Tracks requests in a time window and limits based on count.
 * More accurate than token bucket but uses more memory.
 */
export class SlidingWindowRateLimiter implements RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  /**
   * @param maxRequests - Maximum number of requests allowed in the time window
   * @param windowMs - Time window in milliseconds
   */
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async checkLimit(): Promise<boolean> {
    this.cleanOldRequests();
    return this.requests.length < this.maxRequests;
  }

  async recordUsage(count = 1): Promise<void> {
    this.cleanOldRequests();
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      this.requests.push(now);
    }
  }

  private cleanOldRequests(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    this.requests = this.requests.filter((timestamp) => timestamp > cutoff);
  }

  /**
   * Get current request count in the window
   */
  getCurrentCount(): number {
    this.cleanOldRequests();
    return this.requests.length;
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = [];
  }
}
