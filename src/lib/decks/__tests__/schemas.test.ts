/**
 * Deck Schemas Unit Tests
 *
 * Tests for deck validation schemas including creation, update, listing,
 * and parameter validation.
 */

import { describe, it, expect } from "vitest";
import {
  DeckIdSchema,
  deleteDeckParamsSchema,
  deckIdParamsSchema,
  createDeckBodySchema,
  updateDeckBodySchema,
  listDeckFlashcardsQuerySchema,
  listDecksQuerySchema,
  createFlashcardBodySchema,
  updateFlashcardBodySchema,
  flashcardIdParamsSchema,
  FlashcardSourceSchema,
  type DeleteDeckParams,
  type DeckIdParams,
  type UpdateDeckBody,
  type CreateDeckBody,
  type ListDeckFlashcardsQueryParams,
  type ListDecksQueryParams,
  type CreateFlashcardBody,
  type UpdateFlashcardBody,
  type FlashcardIdParams,
} from "../schemas";

describe("Deck Schemas", () => {
  describe("DeckIdSchema", () => {
    it("should accept valid UUIDs", () => {
      const validUUID = "550e8400-e29b-41d4-a716-446655440000";

      const result = DeckIdSchema.safeParse(validUUID);
      expect(result.success).toBe(true);
      expect(result.data).toBe(validUUID);
    });

    it("should reject invalid UUID formats", () => {
      const invalidUUIDs = [
        "not-a-uuid",
        "123",
        "",
        "550e8400-e29b-41d4-a716", // too short
        "550e8400-e29b-41d4-a716-446655440000-extra", // too long
      ];

      invalidUUIDs.forEach((uuid) => {
        const result = DeckIdSchema.safeParse(uuid);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("deckId must be a valid UUID");
      });
    });

    it("should reject null", () => {
      const result = DeckIdSchema.safeParse(null);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("deckId must be a string");
    });

    it("should reject undefined", () => {
      const result = DeckIdSchema.safeParse(undefined);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("deckId is required");
    });

    it("should reject non-string types", () => {
      const invalidInputs = [123, {}, []];

      invalidInputs.forEach((input) => {
        const result = DeckIdSchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("deckId must be a string");
      });
    });
  });

  describe("deleteDeckParamsSchema", () => {
    it("should accept valid deck ID parameters", () => {
      const validParams: DeleteDeckParams = {
        deckId: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = deleteDeckParamsSchema.safeParse(validParams);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validParams);
    });

    it("should reject invalid deck ID", () => {
      const invalidParams = {
        deckId: "invalid-uuid",
      };

      const result = deleteDeckParamsSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("deckId must be a valid UUID");
    });
  });

  describe("deckIdParamsSchema", () => {
    it("should accept valid deck ID parameters", () => {
      const validParams: DeckIdParams = {
        deckId: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = deckIdParamsSchema.safeParse(validParams);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validParams);
    });

    it("should reject invalid deck ID", () => {
      const invalidParams = {
        deckId: "invalid-uuid",
      };

      const result = deckIdParamsSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("deckId must be a valid UUID");
    });
  });

  describe("createDeckBodySchema", () => {
    it("should accept valid deck creation data", () => {
      const validData: CreateDeckBody = {
        name: "My Study Deck",
      };

      const result = createDeckBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("should trim whitespace from name", () => {
      const dataWithWhitespace = {
        name: "  My Study Deck  ",
      };

      const result = createDeckBodySchema.safeParse(dataWithWhitespace);
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("My Study Deck");
    });

    it("should reject name shorter than 1 character", () => {
      const invalidData = {
        name: "",
      };

      const result = createDeckBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("name must be at least 1 character long");
    });

    it("should reject name longer than 255 characters", () => {
      const longName = "a".repeat(256);
      const invalidData = {
        name: longName,
      };

      const result = createDeckBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("name must be at most 255 characters long");
    });

    it("should reject non-string name", () => {
      const invalidData = {
        name: 123,
      };

      const result = createDeckBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("name must be a string");
    });

    it("should reject extra properties", () => {
      const invalidData = {
        name: "My Study Deck",
        extraField: "not allowed",
      };

      const result = createDeckBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("updateDeckBodySchema", () => {
    it("should accept valid deck update with name", () => {
      const validData: UpdateDeckBody = {
        name: "Updated Deck Name",
      };

      const result = updateDeckBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("should accept valid deck update with deletedAt", () => {
      const validData: UpdateDeckBody = {
        deletedAt: "2023-10-01T12:00:00.000Z",
      };

      const result = updateDeckBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("should accept valid deck update with deletedAt as null", () => {
      const validData: UpdateDeckBody = {
        deletedAt: null,
      };

      const result = updateDeckBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("should accept valid deck update with both name and deletedAt", () => {
      const validData: UpdateDeckBody = {
        name: "Updated Name",
        deletedAt: "2023-10-01T12:00:00.000Z",
      };

      const result = updateDeckBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("should reject empty update (no fields provided)", () => {
      const invalidData = {};

      const result = updateDeckBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("At least one field must be provided");
    });

    it("should reject invalid name (too long)", () => {
      const invalidData = {
        name: "a".repeat(256),
      };

      const result = updateDeckBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("name must be at most 255 characters long");
    });

    it("should reject invalid ISO timestamp for deletedAt", () => {
      const invalidData = {
        deletedAt: "invalid-timestamp",
      };

      const result = updateDeckBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("deletedAt must be a valid ISO 8601 timestamp");
    });

    it("should allow extra properties (not strict)", () => {
      const validData = {
        name: "Updated Name",
        extraField: "allowed",
      };

      const result = updateDeckBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("listDecksQuerySchema", () => {
    it("should accept valid list decks query parameters", () => {
      const validParams: ListDecksQueryParams = {
        page: 1,
        pageSize: 20,
        sort: "name",
      };

      const result = listDecksQuerySchema.safeParse(validParams);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validParams);
    });

    it("should apply default values", () => {
      const minimalParams = {};

      const result = listDecksQuerySchema.safeParse(minimalParams);
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(1);
      expect(result.data?.pageSize).toBe(20);
      expect(result.data?.sort).toBe("created_at");
    });

    it("should accept valid sort fields", () => {
      const validSorts = ["name", "-name", "created_at", "-created_at"];

      validSorts.forEach((sort) => {
        const result = listDecksQuerySchema.safeParse({ sort });
        expect(result.success).toBe(true);
        expect(result.data?.sort).toBe(sort);
      });
    });

    it("should reject invalid sort fields", () => {
      const invalidSorts = ["invalid_field", "name,created_at"];

      invalidSorts.forEach((sort) => {
        const result = listDecksQuerySchema.safeParse({ sort });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("Invalid sort field");
      });
    });

    it("should transform empty sort to default", () => {
      const result = listDecksQuerySchema.safeParse({ sort: "" });
      expect(result.success).toBe(true);
      expect(result.data?.sort).toBe("created_at");
    });

    it("should reject page less than 1", () => {
      const invalidParams = {
        page: 0,
      };

      const result = listDecksQuerySchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("page must be at least 1");
    });

    it("should reject pageSize less than 1", () => {
      const invalidParams = {
        pageSize: 0,
      };

      const result = listDecksQuerySchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("pageSize must be at least 1");
    });

    it("should reject pageSize greater than 100", () => {
      const invalidParams = {
        pageSize: 101,
      };

      const result = listDecksQuerySchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("pageSize must be at most 100");
    });
  });

  describe("listDeckFlashcardsQuerySchema", () => {
    it("should accept valid list flashcards query parameters", () => {
      const validParams: ListDeckFlashcardsQueryParams = {
        deckId: "550e8400-e29b-41d4-a716-446655440000",
        page: 1,
        pageSize: 20,
        sort: "created_at",
        reviewDue: true,
      };

      const result = listDeckFlashcardsQuerySchema.safeParse(validParams);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validParams);
    });

    it("should apply default values", () => {
      const minimalParams = {
        deckId: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = listDeckFlashcardsQuerySchema.safeParse(minimalParams);
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(1);
      expect(result.data?.pageSize).toBe(20);
      expect(result.data?.reviewDue).toBeUndefined();
    });

    it("should accept valid sort fields", () => {
      const validSorts = [
        "created_at",
        "-created_at",
        "updated_at",
        "-updated_at",
        "next_review_at",
        "-next_review_at",
      ];

      validSorts.forEach((sort) => {
        const params = { deckId: "550e8400-e29b-41d4-a716-446655440000", sort };
        const result = listDeckFlashcardsQuerySchema.safeParse(params);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid sort fields", () => {
      const invalidSorts = ["invalid_field", "name"];

      invalidSorts.forEach((sort) => {
        const params = { deckId: "550e8400-e29b-41d4-a716-446655440000", sort };
        const result = listDeckFlashcardsQuerySchema.safeParse(params);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("Invalid sort field");
      });
    });

    it("should coerce string to boolean for reviewDue", () => {
      const params = {
        deckId: "550e8400-e29b-41d4-a716-446655440000",
        reviewDue: "true",
      };

      const result = listDeckFlashcardsQuerySchema.safeParse(params);
      expect(result.success).toBe(true);
      expect(result.data?.reviewDue).toBe(true);
    });

    it("should coerce truthy strings to true for reviewDue", () => {
      const truthyInputs = ["true", "false", "1", "0", "any string"];

      truthyInputs.forEach((input) => {
        const params = {
          deckId: "550e8400-e29b-41d4-a716-446655440000",
          reviewDue: input,
        };

        const result = listDeckFlashcardsQuerySchema.safeParse(params);
        expect(result.success).toBe(true);
        expect(result.data?.reviewDue).toBe(true);
      });
    });
  });

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
        const invalidSources = ["invalid", "auto", "", "MANUAL"];

        invalidSources.forEach((source) => {
          const result = FlashcardSourceSchema.safeParse(source);
          expect(result.success).toBe(false);
          expect(result.error?.issues[0]?.message).toBe("source must be one of: manual, ai, ai_edited");
        });
      });

      it("should reject non-string types", () => {
        const invalidInputs = [null, undefined, 123, {}, []];

        invalidInputs.forEach((input) => {
          const result = FlashcardSourceSchema.safeParse(input);
          expect(result.success).toBe(false);
        });
      });
    });

    describe("createFlashcardBodySchema", () => {
      it("should accept valid flashcard creation data", () => {
        const validData: CreateFlashcardBody = {
          front: "What is the capital of France?",
          back: "Paris",
          source: "manual",
        };

        const result = createFlashcardBodySchema.safeParse(validData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ ...validData, source: "manual" });
      });

      it("should accept flashcard creation with optional fields", () => {
        const validData: CreateFlashcardBody = {
          front: "Question?",
          back: "Answer",
          deckId: "550e8400-e29b-41d4-a716-446655440000",
          source: "ai",
        };

        const result = createFlashcardBodySchema.safeParse(validData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validData);
      });

      it("should trim whitespace from front and back", () => {
        const dataWithWhitespace = {
          front: "  What is the capital?  ",
          back: "  Paris  ",
        };

        const result = createFlashcardBodySchema.safeParse(dataWithWhitespace);
        expect(result.success).toBe(true);
        expect(result.data?.front).toBe("What is the capital?");
        expect(result.data?.back).toBe("Paris");
      });

      it("should reject front shorter than 1 character", () => {
        const invalidData = {
          front: "",
          back: "Valid answer",
        };

        const result = createFlashcardBodySchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("front must be at least 1 character long");
      });

      it("should reject back shorter than 1 character", () => {
        const invalidData = {
          front: "Valid question",
          back: "",
        };

        const result = createFlashcardBodySchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("back must be at least 1 character long");
      });

      it("should reject front longer than 1000 characters", () => {
        const longFront = "a".repeat(1001);
        const invalidData = {
          front: longFront,
          back: "Valid answer",
        };

        const result = createFlashcardBodySchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("front must be at most 1000 characters long");
      });

      it("should reject back longer than 1000 characters", () => {
        const longBack = "a".repeat(1001);
        const invalidData = {
          front: "Valid question",
          back: longBack,
        };

        const result = createFlashcardBodySchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("back must be at most 1000 characters long");
      });

      it("should accept exactly 1000 characters for front and back", () => {
        const exactly1000Front = "a".repeat(1000);
        const exactly1000Back = "b".repeat(1000);

        const validData = {
          front: exactly1000Front,
          back: exactly1000Back,
        };

        const result = createFlashcardBodySchema.safeParse(validData);
        expect(result.success).toBe(true);
        expect(result.data?.front).toBe(exactly1000Front);
        expect(result.data?.back).toBe(exactly1000Back);
      });

      it("should reject invalid deckId UUID", () => {
        const invalidData = {
          front: "Question?",
          back: "Answer",
          deckId: "invalid-uuid",
        };

        const result = createFlashcardBodySchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("deckId must be a valid UUID");
      });

      it("should reject invalid source value", () => {
        const invalidData = {
          front: "Question?",
          back: "Answer",
          source: "invalid",
        };

        const result = createFlashcardBodySchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("source must be one of: manual, ai, ai_edited");
      });

      it("should reject non-string front", () => {
        const invalidData = {
          front: 123,
          back: "Valid answer",
        };

        const result = createFlashcardBodySchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("front must be a string");
      });

      it("should reject extra properties", () => {
        const invalidData = {
          front: "Question?",
          back: "Answer",
          extraField: "not allowed",
        };

        const result = createFlashcardBodySchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe("updateFlashcardBodySchema", () => {
      it("should accept valid flashcard update with front", () => {
        const validData: UpdateFlashcardBody = {
          front: "Updated question?",
        };

        const result = updateFlashcardBodySchema.safeParse(validData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validData);
      });

      it("should accept valid flashcard update with back", () => {
        const validData: UpdateFlashcardBody = {
          back: "Updated answer",
        };

        const result = updateFlashcardBodySchema.safeParse(validData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validData);
      });

      it("should accept valid flashcard update with deckId", () => {
        const validData: UpdateFlashcardBody = {
          deckId: "550e8400-e29b-41d4-a716-446655440000",
        };

        const result = updateFlashcardBodySchema.safeParse(validData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validData);
      });

      it("should accept valid flashcard update with deckId as null", () => {
        const validData: UpdateFlashcardBody = {
          deckId: null,
        };

        const result = updateFlashcardBodySchema.safeParse(validData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validData);
      });

      it("should accept valid flashcard update with source", () => {
        const validData: UpdateFlashcardBody = {
          source: "ai_edited",
        };

        const result = updateFlashcardBodySchema.safeParse(validData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validData);
      });

      it("should accept valid flashcard update with multiple fields", () => {
        const validData: UpdateFlashcardBody = {
          front: "Updated question?",
          back: "Updated answer",
          deckId: "550e8400-e29b-41d4-a716-446655440000",
          source: "ai_edited",
        };

        const result = updateFlashcardBodySchema.safeParse(validData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validData);
      });

      it("should reject empty update (no fields provided)", () => {
        const invalidData = {};

        const result = updateFlashcardBodySchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("At least one field must be provided");
      });

      it("should reject front longer than 1000 characters", () => {
        const invalidData = {
          front: "a".repeat(1001),
        };

        const result = updateFlashcardBodySchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("front must be at most 1000 characters long");
      });

      it("should reject back longer than 1000 characters", () => {
        const invalidData = {
          back: "a".repeat(1001),
        };

        const result = updateFlashcardBodySchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("back must be at most 1000 characters long");
      });

      it("should reject invalid deckId UUID", () => {
        const invalidData = {
          deckId: "invalid-uuid",
        };

        const result = updateFlashcardBodySchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("deckId must be a valid UUID");
      });

      it("should reject invalid source value", () => {
        const invalidData = {
          source: "invalid",
        };

        const result = updateFlashcardBodySchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("source must be one of: manual, ai, ai_edited");
      });

      it("should reject extra properties", () => {
        const invalidData = {
          front: "Updated question?",
          extraField: "not allowed",
        };

        const result = updateFlashcardBodySchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe("flashcardIdParamsSchema", () => {
      it("should accept valid flashcard ID parameters", () => {
        const validParams: FlashcardIdParams = {
          cardId: "550e8400-e29b-41d4-a716-446655440000",
        };

        const result = flashcardIdParamsSchema.safeParse(validParams);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validParams);
      });

      it("should reject invalid cardId UUID", () => {
        const invalidParams = {
          cardId: "invalid-uuid",
        };

        const result = flashcardIdParamsSchema.safeParse(invalidParams);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("cardId must be a valid UUID");
      });

      it("should reject missing cardId", () => {
        const invalidParams = {};

        const result = flashcardIdParamsSchema.safeParse(invalidParams);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("cardId is required");
      });
    });
  });
});
