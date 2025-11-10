/**
 * Reviews Schemas Unit Tests
 *
 * Tests for reviews validation schemas.
 */

import { describe, it, expect } from "vitest";
import { getReviewQueueQuerySchema, createReviewRequestSchema } from "../schemas";

describe("Reviews Schemas", () => {
  describe("getReviewQueueQuerySchema", () => {
    it("should accept empty query parameters", () => {
      const emptyParams = {};

      const result = getReviewQueueQuerySchema.safeParse(emptyParams);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(emptyParams);
    });

    it("should reject unexpected query parameters", () => {
      const invalidParams = {
        unexpectedParam: "value",
      };

      const result = getReviewQueueQuerySchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("Unexpected query parameters provided");
    });

    it("should reject multiple unexpected query parameters", () => {
      const invalidParams = {
        param1: "value1",
        param2: "value2",
        param3: 123,
      };

      const result = getReviewQueueQuerySchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("Unexpected query parameters provided");
    });
  });

  describe("createReviewRequestSchema", () => {
    it("should accept valid review request with required fields", () => {
      const validRequest = {
        flashcardId: "123e4567-e89b-12d3-a456-426614174000",
        quality: 4,
      };

      const result = createReviewRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validRequest);
    });

    it("should accept valid review request with all fields", () => {
      const validRequest = {
        flashcardId: "123e4567-e89b-12d3-a456-426614174000",
        quality: 3,
        latencyMs: 2500,
      };

      const result = createReviewRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validRequest);
    });

    it("should reject invalid UUID for flashcardId", () => {
      const invalidRequest = {
        flashcardId: "not-a-uuid",
        quality: 4,
      };

      const result = createReviewRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("flashcardId must be a valid UUID");
    });

    it("should reject quality below minimum (0)", () => {
      const invalidRequest = {
        flashcardId: "123e4567-e89b-12d3-a456-426614174000",
        quality: -1,
      };

      const result = createReviewRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("Number must be greater than or equal to 0");
    });

    it("should reject quality above maximum (5)", () => {
      const invalidRequest = {
        flashcardId: "123e4567-e89b-12d3-a456-426614174000",
        quality: 6,
      };

      const result = createReviewRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("quality must be between 0 and 5");
    });

    it("should reject non-integer quality", () => {
      const invalidRequest = {
        flashcardId: "123e4567-e89b-12d3-a456-426614174000",
        quality: 3.5,
      };

      const result = createReviewRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("Expected integer, received float");
    });

    it("should reject negative latencyMs", () => {
      const invalidRequest = {
        flashcardId: "123e4567-e89b-12d3-a456-426614174000",
        quality: 4,
        latencyMs: -100,
      };

      const result = createReviewRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("latencyMs must be a positive integer");
    });

    it("should reject zero latencyMs", () => {
      const invalidRequest = {
        flashcardId: "123e4567-e89b-12d3-a456-426614174000",
        quality: 4,
        latencyMs: 0,
      };

      const result = createReviewRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("latencyMs must be a positive integer");
    });

    it("should reject non-integer latencyMs", () => {
      const invalidRequest = {
        flashcardId: "123e4567-e89b-12d3-a456-426614174000",
        quality: 4,
        latencyMs: 150.5,
      };

      const result = createReviewRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("Expected integer, received float");
    });

    it("should reject missing flashcardId", () => {
      const invalidRequest = {
        quality: 4,
      };

      const result = createReviewRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toContain("flashcardId");
    });

    it("should reject missing quality", () => {
      const invalidRequest = {
        flashcardId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = createReviewRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toContain("quality");
    });

    it("should reject unexpected properties", () => {
      const invalidRequest = {
        flashcardId: "123e4567-e89b-12d3-a456-426614174000",
        quality: 4,
        unexpectedField: "should not be here",
      };

      const result = createReviewRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("Unexpected properties provided");
    });

    it("should accept quality of 0", () => {
      const validRequest = {
        flashcardId: "123e4567-e89b-12d3-a456-426614174000",
        quality: 0,
      };

      const result = createReviewRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it("should accept quality of 5", () => {
      const validRequest = {
        flashcardId: "123e4567-e89b-12d3-a456-426614174000",
        quality: 5,
      };

      const result = createReviewRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });
});
