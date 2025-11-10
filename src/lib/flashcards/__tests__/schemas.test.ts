/**
 * Flashcard Schemas Unit Tests
 *
 * Tests for flashcard validation schemas including update operations,
 * parameter validation, and source enum validation.
 */

import { describe, it, expect } from "vitest";
import {
  updateFlashcardBodySchema,
  flashcardIdParamsSchema,
  createFlashcardBodySchema,
  FlashcardSourceSchema,
  DeckIdSchema,
  listDeckFlashcardsQuerySchema,
  UserIdSchema,
  listDeckFlashcardsOptionsSchema,
  listUserFlashcardsOptionsSchema,
  listFlashcardsQuerySchema,
  type UpdateFlashcardBody,
  type FlashcardIdParams,
  type CreateFlashcardBody,
  type ListDeckFlashcardsQueryParams,
  type ListDeckFlashcardsOptions,
  type ListUserFlashcardsOptions,
  type ListFlashcardsQueryParams,
} from "../schemas";

describe("Flashcard Schemas", () => {
  describe("FlashcardSourceSchema", () => {
    it("should accept valid source values", () => {
      const validSources = ["manual", "ai", "ai_edited"];

      validSources.forEach((source) => {
        const result = FlashcardSourceSchema.safeParse(source);
        expect(result.success).toBe(true);
        expect(result.data).toBe(source);
      });
    });

    it("should reject invalid source values", () => {
      const invalidSources = ["invalid", "auto", "", null, undefined, 123];

      invalidSources.forEach((source) => {
        const result = FlashcardSourceSchema.safeParse(source);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("flashcardIdParamsSchema", () => {
    it("should accept valid UUIDs", () => {
      const validUUID = "550e8400-e29b-41d4-a716-446655440000";

      const result = flashcardIdParamsSchema.safeParse({ cardId: validUUID });
      expect(result.success).toBe(true);
      expect(result?.data?.cardId).toBe(validUUID);
    });

    it("should reject invalid UUIDs", () => {
      const invalidIds = [
        "invalid-uuid",
        "550e8400-e29b-41d4-a716", // too short
        "550e8400-e29b-41d4-a716-446655440000-extra", // too long
        "",
        null,
        undefined,
        123,
      ];

      invalidIds.forEach((cardId) => {
        const result = flashcardIdParamsSchema.safeParse({ cardId });
        expect(result.success).toBe(false);
      });
    });

    it("should reject missing cardId", () => {
      const result = flashcardIdParamsSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("updateFlashcardBodySchema", () => {
    describe("valid updates", () => {
      it("should accept update with front field only", () => {
        const input = { front: "Updated front content" };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result?.data?.front).toBe("Updated front content");
        expect(result?.data?.back).toBeUndefined();
        expect(result?.data?.deckId).toBeUndefined();
        expect(result?.data?.source).toBeUndefined();
      });

      it("should accept update with back field only", () => {
        const input = { back: "Updated back content" };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result?.data?.back).toBe("Updated back content");
        expect(result?.data?.front).toBeUndefined();
      });

      it("should accept update with deckId field only", () => {
        const input = { deckId: "550e8400-e29b-41d4-a716-446655440001" };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result?.data?.deckId).toBe("550e8400-e29b-41d4-a716-446655440001");
      });

      it("should accept update with null deckId", () => {
        const input = { deckId: null };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result?.data?.deckId).toBe(null);
      });

      it("should accept update with source field only", () => {
        const input = { source: "ai_edited" };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result?.data?.source).toBe("ai_edited");
      });

      it("should accept update with multiple fields", () => {
        const input = {
          front: "New front",
          back: "New back",
          deckId: "550e8400-e29b-41d4-a716-446655440002",
          source: "manual",
        };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result?.data?.front).toBe("New front");
        expect(result?.data?.back).toBe("New back");
        expect(result?.data?.deckId).toBe("550e8400-e29b-41d4-a716-446655440002");
        expect(result?.data?.source).toBe("manual");
      });

      it("should trim whitespace from front and back", () => {
        const input = {
          front: "  Front with spaces  ",
          back: "  Back with spaces  ",
        };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result?.data?.front).toBe("Front with spaces");
        expect(result?.data?.back).toBe("Back with spaces");
      });
    });

    describe("invalid updates", () => {
      it("should reject empty update object", () => {
        const input = {};

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("At least one field must be provided");
      });

      it("should reject front field that is empty string", () => {
        const input = { front: "" };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("front must be at least 1 character long");
      });

      it("should reject front field that is only whitespace", () => {
        const input = { front: "   " };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("front must be at least 1 character long");
      });

      it("should reject front field over 1000 characters", () => {
        const longFront = "a".repeat(1001);
        const input = { front: longFront };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("front must be at most 1000 characters long");
      });

      it("should reject back field that is empty string", () => {
        const input = { back: "" };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("back must be at least 1 character long");
      });

      it("should reject back field that is only whitespace", () => {
        const input = { back: "   " };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("back must be at least 1 character long");
      });

      it("should reject back field over 1000 characters", () => {
        const longBack = "a".repeat(1001);
        const input = { back: longBack };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("back must be at most 1000 characters long");
      });

      it("should reject invalid deckId UUID", () => {
        const input = { deckId: "invalid-uuid" };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("deckId must be a valid UUID");
      });

      it("should reject invalid source value", () => {
        const input = { source: "invalid_source" };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject unexpected properties", () => {
        const input = {
          front: "Valid front",
          unexpectedProp: "should fail",
        };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("Unexpected properties provided");
      });
    });

    describe("type inference", () => {
      it("should correctly infer UpdateFlashcardBody type", () => {
        const input = {
          front: "Test front",
          back: "Test back",
          deckId: "550e8400-e29b-41d4-a716-446655440000" as const,
          source: "manual" as const,
        };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);

        const data: UpdateFlashcardBody = result?.data as UpdateFlashcardBody;
        expect(data?.front).toBe("Test front");
        expect(data?.back).toBe("Test back");
        expect(data?.deckId).toBe("550e8400-e29b-41d4-a716-446655440000");
        expect(data?.source).toBe("manual");
      });

      it("should correctly infer FlashcardIdParams type", () => {
        const input = { cardId: "550e8400-e29b-41d4-a716-446655440000" };

        const result = flashcardIdParamsSchema.safeParse(input);
        expect(result.success).toBe(true);

        const data: FlashcardIdParams = result?.data as FlashcardIdParams;
        expect(data.cardId).toBe("550e8400-e29b-41d4-a716-446655440000");
      });
    });

    describe("type inference", () => {
      it("should correctly infer UpdateFlashcardBody type", () => {
        const input = {
          front: "Test front",
          back: "Test back",
          deckId: "550e8400-e29b-41d4-a716-446655440000" as const,
          source: "manual" as const,
        };

        const result = updateFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);

        const data: UpdateFlashcardBody = result?.data as UpdateFlashcardBody;
        expect(data?.front).toBe("Test front");
        expect(data?.back).toBe("Test back");
        expect(data?.deckId).toBe("550e8400-e29b-41d4-a716-446655440000");
        expect(data?.source).toBe("manual");
      });

      it("should correctly infer FlashcardIdParams type", () => {
        const input = { cardId: "550e8400-e29b-41d4-a716-446655440000" };

        const result = flashcardIdParamsSchema.safeParse(input);
        expect(result.success).toBe(true);

        const data: FlashcardIdParams = result?.data as FlashcardIdParams;
        expect(data.cardId).toBe("550e8400-e29b-41d4-a716-446655440000");
      });
    });
  });

  describe("createFlashcardBodySchema", () => {
    describe("valid inputs", () => {
      it("should accept minimum valid input with required fields only", () => {
        const input = {
          front: "What is the capital of France?",
          back: "Paris",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result?.data?.front).toBe("What is the capital of France?");
        expect(result?.data?.back).toBe("Paris");
        expect(result?.data?.deckId).toBeUndefined();
        expect(result?.data?.source).toBe("manual");
      });

      it("should accept input with all optional fields", () => {
        const input = {
          front: "Question",
          back: "Answer",
          deckId: "550e8400-e29b-41d4-a716-446655440000",
          source: "ai",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result?.data?.front).toBe("Question");
        expect(result?.data?.back).toBe("Answer");
        expect(result?.data?.deckId).toBe("550e8400-e29b-41d4-a716-446655440000");
        expect(result?.data?.source).toBe("ai");
      });

      it("should accept input with deckId only", () => {
        const input = {
          front: "Front content",
          back: "Back content",
          deckId: "550e8400-e29b-41d4-a716-446655440001",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result?.data?.deckId).toBe("550e8400-e29b-41d4-a716-446655440001");
        expect(result?.data?.source).toBe("manual");
      });

      it("should accept input with source only", () => {
        const input = {
          front: "Front content",
          back: "Back content",
          source: "ai_edited",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result?.data?.source).toBe("ai_edited");
        expect(result?.data?.deckId).toBeUndefined();
      });

      it("should trim whitespace from front and back fields", () => {
        const input = {
          front: "  Front with spaces  ",
          back: "  Back with spaces  ",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result?.data?.front).toBe("Front with spaces");
        expect(result?.data?.back).toBe("Back with spaces");
      });

      it("should accept maximum length content (1000 characters)", () => {
        const maxLengthContent = "a".repeat(1000);
        const input = {
          front: maxLengthContent,
          back: maxLengthContent,
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result?.data?.front).toHaveLength(1000);
        expect(result?.data?.back).toHaveLength(1000);
      });
    });

    describe("invalid inputs", () => {
      it("should reject missing front field", () => {
        const input = {
          back: "Back content",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("Required");
      });

      it("should reject missing back field", () => {
        const input = {
          front: "Front content",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("Required");
      });

      it("should reject empty front field", () => {
        const input = {
          front: "",
          back: "Back content",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("front must be at least 1 character long");
      });

      it("should reject empty back field", () => {
        const input = {
          front: "Front content",
          back: "",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("back must be at least 1 character long");
      });

      it("should reject front field with only whitespace", () => {
        const input = {
          front: "   ",
          back: "Back content",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("front must be at least 1 character long");
      });

      it("should reject back field with only whitespace", () => {
        const input = {
          front: "Front content",
          back: "   ",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("back must be at least 1 character long");
      });

      it("should reject front field over 1000 characters", () => {
        const longFront = "a".repeat(1001);
        const input = {
          front: longFront,
          back: "Back content",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("front must be at most 1000 characters long");
      });

      it("should reject back field over 1000 characters", () => {
        const longBack = "a".repeat(1001);
        const input = {
          front: "Front content",
          back: longBack,
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("back must be at most 1000 characters long");
      });

      it("should reject invalid deckId UUID", () => {
        const input = {
          front: "Front content",
          back: "Back content",
          deckId: "invalid-uuid",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("deckId must be a valid UUID");
      });

      it("should reject invalid source value", () => {
        const input = {
          front: "Front content",
          back: "Back content",
          source: "invalid_source",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("source must be one of");
      });

      it("should reject non-string front field", () => {
        const input = {
          front: 123,
          back: "Back content",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("front must be a string");
      });

      it("should reject non-string back field", () => {
        const input = {
          front: "Front content",
          back: null,
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("back must be a string");
      });

      it("should reject non-string deckId field", () => {
        const input = {
          front: "Front content",
          back: "Back content",
          deckId: 123,
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result?.error?.issues[0]?.message).toContain("deckId must be a string");
      });
    });

    describe("default values", () => {
      it("should default source to 'manual' when not provided", () => {
        const input = {
          front: "Front content",
          back: "Back content",
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result?.data?.source).toBe("manual");
      });
    });

    describe("type inference", () => {
      it("should correctly infer CreateFlashcardBody type", () => {
        const input = {
          front: "Test question",
          back: "Test answer",
          deckId: "550e8400-e29b-41d4-a716-446655440000" as const,
          source: "ai" as const,
        };

        const result = createFlashcardBodySchema.safeParse(input);
        expect(result.success).toBe(true);

        const data: CreateFlashcardBody = result?.data as CreateFlashcardBody;
        expect(data.front).toBe("Test question");
        expect(data.back).toBe("Test answer");
        expect(data.deckId).toBe("550e8400-e29b-41d4-a716-446655440000");
        expect(data.source).toBe("ai");
      });
    });
  });

  describe("DeckIdSchema", () => {
    it("should accept valid UUIDs", () => {
      const validUUID = "550e8400-e29b-41d4-a716-446655440000";

      const result = DeckIdSchema.safeParse(validUUID);
      expect(result.success).toBe(true);
      expect(result.data).toBe(validUUID);
    });

    it("should reject invalid UUIDs", () => {
      const invalidUUIDs = ["invalid", "123", "", null, undefined, "550e8400-e29b-41d4-a716"];

      invalidUUIDs.forEach((uuid) => {
        const result = DeckIdSchema.safeParse(uuid);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("UserIdSchema", () => {
    it("should accept valid UUIDs", () => {
      const validUUID = "550e8400-e29b-41d4-a716-446655440000";

      const result = UserIdSchema.safeParse(validUUID);
      expect(result.success).toBe(true);
      expect(result.data).toBe(validUUID);
    });

    it("should reject invalid UUIDs", () => {
      const invalidUUIDs = ["invalid", "123", "", null, undefined, "550e8400-e29b-41d4-a716"];

      invalidUUIDs.forEach((uuid) => {
        const result = UserIdSchema.safeParse(uuid);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("listDeckFlashcardsQuerySchema", () => {
    describe("valid inputs", () => {
      it("should accept minimal valid input", () => {
        const input = {
          deckId: "550e8400-e29b-41d4-a716-446655440000",
        };

        const result = listDeckFlashcardsQuerySchema.safeParse(input);
        expect(result.success).toBe(true);
        if (!result.data) throw new Error("Expected data to be defined");
        const data: ListDeckFlashcardsQueryParams = result.data;
        expect(data.deckId).toBe("550e8400-e29b-41d4-a716-446655440000");
        expect(data.page).toBe(1);
        expect(data.pageSize).toBe(20);
        expect(data.sort).toBeUndefined();
        expect(data.reviewDue).toBeUndefined();
      });

      it("should accept full valid input", () => {
        const input = {
          deckId: "550e8400-e29b-41d4-a716-446655440000",
          page: 2,
          pageSize: 50,
          sort: "next_review_at",
          reviewDue: true,
        };

        const result = listDeckFlashcardsQuerySchema.safeParse(input);
        expect(result.success).toBe(true);
        if (!result.data) throw new Error("Expected data to be defined");
        const data: ListDeckFlashcardsQueryParams = result.data;
        expect(data.deckId).toBe("550e8400-e29b-41d4-a716-446655440000");
        expect(data.page).toBe(2);
        expect(data.pageSize).toBe(50);
        expect(data.sort).toBe("next_review_at");
        expect(data.reviewDue).toBe(true);
      });

      it("should accept descending sort", () => {
        const input = {
          deckId: "550e8400-e29b-41d4-a716-446655440000",
          sort: "-created_at",
        };

        const result = listDeckFlashcardsQuerySchema.safeParse(input);
        expect(result.success).toBe(true);
        if (!result.data) throw new Error("Expected data to be defined");
        expect(result.data.sort).toBe("-created_at");
      });
    });

    describe("invalid inputs", () => {
      it("should reject invalid deckId", () => {
        const input = {
          deckId: "invalid-uuid",
        };

        const result = listDeckFlashcardsQuerySchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject invalid page values", () => {
        const invalidInputs = [
          { deckId: "550e8400-e29b-41d4-a716-446655440000", page: 0 },
          { deckId: "550e8400-e29b-41d4-a716-446655440000", page: -1 },
          { deckId: "550e8400-e29b-41d4-a716-446655440000", page: "invalid" },
        ];

        invalidInputs.forEach((input) => {
          const result = listDeckFlashcardsQuerySchema.safeParse(input);
          expect(result.success).toBe(false);
        });
      });

      it("should reject invalid pageSize values", () => {
        const invalidInputs = [
          { deckId: "550e8400-e29b-41d4-a716-446655440000", pageSize: 0 },
          { deckId: "550e8400-e29b-41d4-a716-446655440000", pageSize: 101 },
          { deckId: "550e8400-e29b-41d4-a716-446655440000", pageSize: "invalid" },
        ];

        invalidInputs.forEach((input) => {
          const result = listDeckFlashcardsQuerySchema.safeParse(input);
          expect(result.success).toBe(false);
        });
      });

      it("should reject invalid sort fields", () => {
        const input = {
          deckId: "550e8400-e29b-41d4-a716-446655440000",
          sort: "invalid_field",
        };

        const result = listDeckFlashcardsQuerySchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("listFlashcardsQuerySchema", () => {
    describe("valid inputs", () => {
      it("should accept minimal valid input", () => {
        const result = listFlashcardsQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (!result.data) throw new Error("Expected data to be defined");
        const data: ListFlashcardsQueryParams = result.data;
        expect(data.page).toBe(1);
        expect(data.pageSize).toBe(20);
        expect(data.sort).toBeUndefined();
        expect(data.deckId).toBeUndefined();
        expect(data.reviewDue).toBeUndefined();
        expect(data.search).toBeUndefined();
      });

      it("should accept full valid input", () => {
        const input = {
          page: 2,
          pageSize: 50,
          sort: "updated_at",
          deckId: "550e8400-e29b-41d4-a716-446655440000",
          reviewDue: true,
          search: "test query",
        };

        const result = listFlashcardsQuerySchema.safeParse(input);
        expect(result.success).toBe(true);
        if (!result.data) throw new Error("Expected data to be defined");
        const data: ListFlashcardsQueryParams = result.data;
        expect(data.page).toBe(2);
        expect(data.pageSize).toBe(50);
        expect(data.sort).toBe("updated_at");
        expect(data.deckId).toBe("550e8400-e29b-41d4-a716-446655440000");
        expect(data.reviewDue).toBe(true);
        expect(data.search).toBe("test query");
      });
    });

    describe("invalid inputs", () => {
      it("should reject invalid deckId", () => {
        const input = {
          deckId: "invalid-uuid",
        };

        const result = listFlashcardsQuerySchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject invalid search length", () => {
        const invalidInputs = [{ search: "" }, { search: "a".repeat(501) }];

        invalidInputs.forEach((input) => {
          const result = listFlashcardsQuerySchema.safeParse(input);
          expect(result.success).toBe(false);
        });
      });
    });
  });

  describe("listDeckFlashcardsOptionsSchema", () => {
    describe("valid inputs", () => {
      it("should accept minimal valid input", () => {
        const input = {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          deckId: "550e8400-e29b-41d4-a716-446655440001",
        };

        const result = listDeckFlashcardsOptionsSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (!result.data) throw new Error("Expected data to be defined");
        const data: ListDeckFlashcardsOptions = result.data;
        expect(data.userId).toBe("550e8400-e29b-41d4-a716-446655440000");
        expect(data.deckId).toBe("550e8400-e29b-41d4-a716-446655440001");
        expect(data.page).toBe(1);
        expect(data.pageSize).toBe(20);
      });

      it("should accept full valid input", () => {
        const input = {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          deckId: "550e8400-e29b-41d4-a716-446655440001",
          page: 3,
          pageSize: 30,
          sort: "-created_at",
          reviewDue: false,
        };

        const result = listDeckFlashcardsOptionsSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (!result.data) throw new Error("Expected data to be defined");
        const data: ListDeckFlashcardsOptions = result.data;
        expect(data.page).toBe(3);
        expect(data.pageSize).toBe(30);
        expect(data.sort).toBe("-created_at");
        expect(data.reviewDue).toBe(false);
      });
    });

    describe("invalid inputs", () => {
      it("should reject invalid UUIDs", () => {
        const invalidInputs = [
          { userId: "invalid", deckId: "550e8400-e29b-41d4-a716-446655440001" },
          { userId: "550e8400-e29b-41d4-a716-446655440000", deckId: "invalid" },
        ];

        invalidInputs.forEach((input) => {
          const result = listDeckFlashcardsOptionsSchema.safeParse(input);
          expect(result.success).toBe(false);
        });
      });
    });
  });

  describe("listUserFlashcardsOptionsSchema", () => {
    describe("valid inputs", () => {
      it("should accept minimal valid input", () => {
        const input = {
          userId: "550e8400-e29b-41d4-a716-446655440000",
        };

        const result = listUserFlashcardsOptionsSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (!result.data) throw new Error("Expected data to be defined");
        const data: ListUserFlashcardsOptions = result.data;
        expect(data.userId).toBe("550e8400-e29b-41d4-a716-446655440000");
        expect(data.page).toBe(1);
        expect(data.pageSize).toBe(20);
        expect(data.deckId).toBeUndefined();
        expect(data.reviewDue).toBeUndefined();
        expect(data.search).toBeUndefined();
      });

      it("should accept full valid input", () => {
        const input = {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          page: 2,
          pageSize: 40,
          sort: "next_review_at",
          deckId: "550e8400-e29b-41d4-a716-446655440001",
          reviewDue: true,
          search: "advanced search query",
        };

        const result = listUserFlashcardsOptionsSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (!result.data) throw new Error("Expected data to be defined");
        const data: ListUserFlashcardsOptions = result.data;
        expect(data.page).toBe(2);
        expect(data.pageSize).toBe(40);
        expect(data.sort).toBe("next_review_at");
        expect(data.deckId).toBe("550e8400-e29b-41d4-a716-446655440001");
        expect(data.reviewDue).toBe(true);
        expect(data.search).toBe("advanced search query");
      });
    });

    describe("invalid inputs", () => {
      it("should reject invalid UUIDs", () => {
        const input = {
          userId: "invalid-uuid",
          deckId: "550e8400-e29b-41d4-a716-446655440001",
        };

        const result = listUserFlashcardsOptionsSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject invalid search length", () => {
        const input = {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          search: "",
        };

        const result = listUserFlashcardsOptionsSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });
});
