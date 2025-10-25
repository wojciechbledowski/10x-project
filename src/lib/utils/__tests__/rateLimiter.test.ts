import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { type RateLimiter, NoopRateLimiter, TokenBucketRateLimiter, SlidingWindowRateLimiter } from "../rateLimiter";

describe("Rate Limiter Utilities", () => {
  describe("RateLimiter interface", () => {
    it("should define the required methods", () => {
      // Arrange & Act & Assert
      // This is more of a TypeScript compile-time check, but we can verify the interface exists
      const noopLimiter: RateLimiter = new NoopRateLimiter();
      expect(typeof noopLimiter.checkLimit).toBe("function");
      expect(typeof noopLimiter.recordUsage).toBe("function");
    });
  });

  describe("NoopRateLimiter", () => {
    let limiter: NoopRateLimiter;

    beforeEach(() => {
      limiter = new NoopRateLimiter();
    });

    it("should always allow requests", async () => {
      // Act
      const result = await limiter.checkLimit();

      // Assert
      expect(result).toBe(true);
    });

    it("should not throw on recordUsage", async () => {
      // Act & Assert
      await expect(limiter.recordUsage()).resolves.toBeUndefined();
      await expect(limiter.recordUsage(5)).resolves.toBeUndefined();
    });
  });

  describe("TokenBucketRateLimiter", () => {
    let limiter: TokenBucketRateLimiter;

    beforeEach(() => {
      vi.useFakeTimers();
      limiter = new TokenBucketRateLimiter(10, 2); // 10 tokens, 2 tokens/second
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should initialize with max tokens", () => {
      // Act
      const tokens = limiter.getCurrentTokens();

      // Assert
      expect(tokens).toBe(10);
    });

    it("should allow requests when tokens are available", async () => {
      // Act
      const result = await limiter.checkLimit();

      // Assert
      expect(result).toBe(true);
    });

    it("should deny requests when no tokens are available", async () => {
      // Arrange - consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.recordUsage();
      }

      // Act
      const result = await limiter.checkLimit();

      // Assert
      expect(result).toBe(false);
    });

    it("should refill tokens over time", async () => {
      // Arrange - consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.recordUsage();
      }
      expect(limiter.getCurrentTokens()).toBe(0);

      // Act - wait for 3 seconds (should add 6 tokens)
      vi.advanceTimersByTime(3000);

      // Assert
      expect(limiter.getCurrentTokens()).toBe(6);
    });

    it("should not exceed maximum tokens during refill", async () => {
      // Arrange - consume some tokens
      for (let i = 0; i < 5; i++) {
        await limiter.recordUsage();
      }
      expect(limiter.getCurrentTokens()).toBe(5);

      // Act - wait for 10 seconds (would add 20 tokens, but cap at 10)
      vi.advanceTimersByTime(10000);

      // Assert
      expect(limiter.getCurrentTokens()).toBe(10);
    });

    it("should consume specified number of tokens", async () => {
      // Arrange
      expect(limiter.getCurrentTokens()).toBe(10);

      // Act
      await limiter.recordUsage(3);

      // Assert
      expect(limiter.getCurrentTokens()).toBe(7);
    });

    it("should consume 1 token by default", async () => {
      // Arrange
      expect(limiter.getCurrentTokens()).toBe(10);

      // Act
      await limiter.recordUsage();

      // Assert
      expect(limiter.getCurrentTokens()).toBe(9);
    });

    it("should allow burst traffic up to max tokens", async () => {
      // Act - try to consume all tokens at once
      for (let i = 0; i < 10; i++) {
        expect(await limiter.checkLimit()).toBe(true);
        await limiter.recordUsage();
      }

      // Assert - should be exhausted
      expect(await limiter.checkLimit()).toBe(false);
    });

    it("should handle refill timing correctly", async () => {
      // Arrange - consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.recordUsage();
      }

      // Act - advance time in smaller increments
      vi.advanceTimersByTime(500); // 1 token
      expect(limiter.getCurrentTokens()).toBe(1);

      vi.advanceTimersByTime(500); // 1 more token
      expect(limiter.getCurrentTokens()).toBe(2);

      vi.advanceTimersByTime(4000); // 8 more tokens, but cap at 10
      expect(limiter.getCurrentTokens()).toBe(10);
    });

    it("should reset to maximum capacity", () => {
      // Arrange - consume some tokens
      limiter.recordUsage();
      limiter.recordUsage();
      expect(limiter.getCurrentTokens()).toBe(8);

      // Act
      limiter.reset();

      // Assert
      expect(limiter.getCurrentTokens()).toBe(10);
    });

    it("should handle zero refill rate gracefully", async () => {
      // Arrange
      const zeroRateLimiter = new TokenBucketRateLimiter(5, 0);
      vi.advanceTimersByTime(10000);

      // Act
      const tokens = zeroRateLimiter.getCurrentTokens();

      // Assert - should still have initial tokens
      expect(tokens).toBe(5);
    });

    it("should handle fractional token refills correctly", async () => {
      // Arrange - use slower refill rate
      const slowLimiter = new TokenBucketRateLimiter(10, 0.5); // 0.5 tokens/second

      // Act - advance 2 seconds (should add 1 token)
      vi.advanceTimersByTime(2000);

      // Assert
      expect(slowLimiter.getCurrentTokens()).toBe(10); // Should be floored appropriately
    });
  });

  describe("SlidingWindowRateLimiter", () => {
    let limiter: SlidingWindowRateLimiter;

    beforeEach(() => {
      vi.useFakeTimers();
      limiter = new SlidingWindowRateLimiter(5, 10000); // 5 requests per 10 seconds
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should allow requests within the limit", async () => {
      // Act
      for (let i = 0; i < 5; i++) {
        expect(await limiter.checkLimit()).toBe(true);
        await limiter.recordUsage();
      }

      // Assert
      expect(limiter.getCurrentCount()).toBe(5);
    });

    it("should deny requests over the limit", async () => {
      // Arrange - fill the window
      for (let i = 0; i < 5; i++) {
        await limiter.recordUsage();
      }

      // Act
      const result = await limiter.checkLimit();

      // Assert
      expect(result).toBe(false);
      expect(limiter.getCurrentCount()).toBe(5);
    });

    it("should allow requests after old ones expire", async () => {
      // Arrange - fill the window
      for (let i = 0; i < 5; i++) {
        await limiter.recordUsage();
      }
      expect(await limiter.checkLimit()).toBe(false);

      // Act - advance time past the window
      vi.advanceTimersByTime(10001);

      // Assert
      expect(await limiter.checkLimit()).toBe(true);
      expect(limiter.getCurrentCount()).toBe(0);
    });

    it("should expire requests gradually", async () => {
      // Arrange - add requests at different times
      await limiter.recordUsage(); // t=0
      vi.advanceTimersByTime(3000);
      await limiter.recordUsage(); // t=3
      vi.advanceTimersByTime(3000);
      await limiter.recordUsage(); // t=6

      // Act - advance to t=11 (first request should be expired)
      vi.advanceTimersByTime(5000);

      // Assert - should have 2 requests left
      expect(limiter.getCurrentCount()).toBe(2);
    });

    it("should handle multiple tokens consumption", async () => {
      // Act
      await limiter.recordUsage(3);

      // Assert
      expect(limiter.getCurrentCount()).toBe(3);
    });

    it("should reset the limiter", () => {
      // Arrange - add some requests
      limiter.recordUsage();
      limiter.recordUsage();
      expect(limiter.getCurrentCount()).toBe(2);

      // Act
      limiter.reset();

      // Assert
      expect(limiter.getCurrentCount()).toBe(0);
    });

    it("should handle zero max requests", async () => {
      // Arrange
      const zeroLimiter = new SlidingWindowRateLimiter(0, 1000);

      // Act
      const result = await zeroLimiter.checkLimit();

      // Assert
      expect(result).toBe(false);
    });

    it("should handle very small window", async () => {
      // Arrange
      const smallWindowLimiter = new SlidingWindowRateLimiter(2, 100); // 2 requests per 100ms

      // Act - fill window quickly
      expect(await smallWindowLimiter.checkLimit()).toBe(true);
      await smallWindowLimiter.recordUsage();
      expect(await smallWindowLimiter.checkLimit()).toBe(true);
      await smallWindowLimiter.recordUsage();
      expect(await smallWindowLimiter.checkLimit()).toBe(false);

      // Advance time slightly - still within window
      vi.advanceTimersByTime(50);
      expect(await smallWindowLimiter.checkLimit()).toBe(false);

      // Advance past window
      vi.advanceTimersByTime(51);
      expect(await smallWindowLimiter.checkLimit()).toBe(true);
    });

    it("should handle very large window", async () => {
      // Arrange
      const largeWindowLimiter = new SlidingWindowRateLimiter(3, 3600000); // 3 requests per hour

      // Act - should allow all requests initially
      for (let i = 0; i < 3; i++) {
        expect(await largeWindowLimiter.checkLimit()).toBe(true);
        await largeWindowLimiter.recordUsage();
      }
      expect(await largeWindowLimiter.checkLimit()).toBe(false);
    });

    it("should maintain accurate count during concurrent operations", async () => {
      // Act - simulate rapid usage
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(limiter.recordUsage());
      }
      await Promise.all(promises);

      // Assert
      expect(limiter.getCurrentCount()).toBe(5);
      expect(await limiter.checkLimit()).toBe(false);
    });
  });

  describe("RateLimiter implementations comparison", () => {
    it("should demonstrate different behaviors between implementations", async () => {
      // Arrange
      vi.useFakeTimers();
      const tokenBucket = new TokenBucketRateLimiter(3, 1); // 3 tokens, 1/second
      const slidingWindow = new SlidingWindowRateLimiter(3, 5000); // 3 requests per 5 seconds

      // Act & Assert - Both should allow initial burst
      for (let i = 0; i < 3; i++) {
        expect(await tokenBucket.checkLimit()).toBe(true);
        expect(await slidingWindow.checkLimit()).toBe(true);
        await tokenBucket.recordUsage();
        await slidingWindow.recordUsage();
      }

      // Both should deny additional requests initially
      expect(await tokenBucket.checkLimit()).toBe(false);
      expect(await slidingWindow.checkLimit()).toBe(false);

      // Advance time - token bucket refills gradually
      vi.advanceTimersByTime(2000);
      expect(await tokenBucket.checkLimit()).toBe(true); // Has refilled
      expect(await slidingWindow.checkLimit()).toBe(false); // Still in window

      // Advance more time - sliding window allows new requests
      vi.advanceTimersByTime(3000);
      expect(await slidingWindow.checkLimit()).toBe(true); // Window expired

      vi.useRealTimers();
    });
  });
});
