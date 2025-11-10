import { describe, it, expect } from "vitest";
import { generateFlashcardsBodySchema } from "../schemas";

describe("generateFlashcardsBodySchema", () => {
  describe("sourceText validation", () => {
    it("should accept valid sourceText within length limits", () => {
      const validText = "A".repeat(1000);
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: validText,
      });

      expect(result.success).toBe(true);
      expect(result.data?.sourceText).toBe(validText);
    });

    it("should accept maximum length sourceText", () => {
      const validText = "A".repeat(10000);
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: validText,
      });

      expect(result.success).toBe(true);
      expect(result.data?.sourceText).toBe(validText);
    });

    it("should reject sourceText too short", () => {
      const shortText = "A".repeat(999);
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: shortText,
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("at least 1000 characters");
    });

    it("should reject sourceText too long", () => {
      const longText = "A".repeat(10001);
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: longText,
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("at most 10000 characters");
    });

    it("should reject non-string sourceText", () => {
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: 12345,
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("must be a string");
    });
  });

  describe("deckId validation", () => {
    it("should accept valid UUID deckId", () => {
      const validUuid = "550e8400-e29b-41d4-a716-446655440000";
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: "A".repeat(1000),
        deckId: validUuid,
      });

      expect(result.success).toBe(true);
      expect(result.data?.deckId).toBe(validUuid);
    });

    it("should reject invalid UUID deckId", () => {
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: "A".repeat(1000),
        deckId: "not-a-uuid",
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("must be a valid UUID");
    });

    it("should reject non-string deckId", () => {
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: "A".repeat(1000),
        deckId: 12345,
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("must be a string");
    });

    it("should accept undefined deckId", () => {
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: "A".repeat(1000),
        deckId: undefined,
      });

      expect(result.success).toBe(true);
      expect(result.data?.deckId).toBeUndefined();
    });
  });

  describe("temperature validation", () => {
    it("should accept valid temperature values", () => {
      const temperatures = [0.0, 0.5, 0.7, 1.5, 2.0];

      temperatures.forEach((temp) => {
        const result = generateFlashcardsBodySchema.safeParse({
          sourceText: "A".repeat(1000),
          temperature: temp,
        });

        expect(result.success).toBe(true);
        expect(result.data?.temperature).toBe(temp);
      });
    });

    it("should reject temperature below minimum", () => {
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: "A".repeat(1000),
        temperature: -0.1,
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("at least 0.0");
    });

    it("should reject temperature above maximum", () => {
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: "A".repeat(1000),
        temperature: 2.1,
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("at most 2.0");
    });

    it("should reject non-number temperature", () => {
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: "A".repeat(1000),
        temperature: "0.7",
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("must be a number");
    });

    it("should default temperature to 0.7 when not provided", () => {
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: "A".repeat(1000),
      });

      expect(result.success).toBe(true);
      expect(result.data?.temperature).toBe(0.7);
    });
  });

  describe("complete request validation", () => {
    it("should accept minimal valid request", () => {
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: "A".repeat(1000),
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        sourceText: "A".repeat(1000),
        temperature: 0.7,
      });
    });

    it("should accept complete valid request", () => {
      const result = generateFlashcardsBodySchema.safeParse({
        sourceText: "A".repeat(2000),
        deckId: "550e8400-e29b-41d4-a716-446655440000",
        temperature: 1.2,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        sourceText: "A".repeat(2000),
        deckId: "550e8400-e29b-41d4-a716-446655440000",
        temperature: 1.2,
      });
    });
  });
});
