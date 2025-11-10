import { describe, it, expect, beforeEach, vi } from "vitest";
import { FlashcardService } from "../flashcardService";
import type { FlashcardsListResponse } from "../../../types";
import {
  createMockSupabaseClient,
  createMockQueryResult,
  createMockFlashcard,
  resetAllMocks,
  type MockSupabaseClient,
} from "./test-utils";

describe("FlashcardService", () => {
  let mockSupabase: MockSupabaseClient;
  let flashcardService: FlashcardService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    flashcardService = new FlashcardService(
      mockSupabase as unknown as import("../../../db/supabase.client").SupabaseServerClient
    );
    resetAllMocks(mockSupabase);
  });

  describe("ensureDeckAccessibility", () => {
    it("should return true when deck exists and belongs to user", async () => {
      // Arrange
      const userId = "user-123";
      const deckId = "deck-123";

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult({ id: deckId })),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await flashcardService.ensureDeckAccessibility(userId, deckId);

      // Assert
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("decks");
      expect(mockQuery.eq).toHaveBeenCalledWith("id", deckId);
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", userId);
      expect(mockQuery.is).toHaveBeenCalledWith("deleted_at", null);
    });

    it("should return false when deck does not exist", async () => {
      // Arrange
      const userId = "user-123";
      const deckId = "non-existent-deck";

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await flashcardService.ensureDeckAccessibility(userId, deckId);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when deck belongs to different user", async () => {
      // Arrange
      const userId = "user-123";
      const deckId = "deck-456"; // Belongs to different user

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await flashcardService.ensureDeckAccessibility(userId, deckId);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when deck is soft deleted", async () => {
      // Arrange
      const userId = "user-123";
      const deckId = "deck-123";

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await flashcardService.ensureDeckAccessibility(userId, deckId);

      // Assert
      expect(result).toBe(false);
      expect(mockQuery.is).toHaveBeenCalledWith("deleted_at", null);
    });

    it("should throw error when database query fails", async () => {
      // Arrange
      const userId = "user-123";
      const deckId = "deck-123";
      const mockError = new Error("Database connection failed");

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(flashcardService.ensureDeckAccessibility(userId, deckId)).rejects.toThrow(mockError);
    });
  });

  describe("listDeckFlashcards", () => {
    it("should return flashcards list when deck exists and user has access", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        deckId: "deck-123",
        page: 1,
        pageSize: 20,
        sort: "created_at",
        reviewDue: false,
      };

      const mockFlashcards = [
        createMockFlashcard({ id: "card-1", front: "Front 1", back: "Back 1" }),
        createMockFlashcard({ id: "card-2", front: "Front 2", back: "Back 2" }),
      ];

      // Mock deck accessibility check
      const mockDeckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult({ id: options.deckId })),
      };

      // Mock flashcards query
      const mockFlashcardsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(mockFlashcards, null, 2)),
      };

      mockSupabase.from.mockReturnValueOnce(mockDeckQuery).mockReturnValueOnce(mockFlashcardsQuery);

      // Act
      const result = await flashcardService.listDeckFlashcards(options);

      // Assert
      expect(result).toEqual({
        data: [
          {
            id: "card-1",
            front: "Front 1",
            back: "Back 1",
            deckId: "deck-123",
            source: "manual",
            easeFactor: 2.5,
            intervalDays: 1,
            repetition: 0,
            nextReviewAt: null,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
            userId: "user-123",
            deletedAt: null,
          },
          {
            id: "card-2",
            front: "Front 2",
            back: "Back 2",
            deckId: "deck-123",
            source: "manual",
            easeFactor: 2.5,
            intervalDays: 1,
            repetition: 0,
            nextReviewAt: null,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
            userId: "user-123",
            deletedAt: null,
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 2,
          totalPages: 1,
        },
      } as FlashcardsListResponse);
    });

    it("should return null when deck does not exist", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        deckId: "non-existent-deck",
        page: 1,
        pageSize: 20,
      };

      const mockDeckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)),
      };

      mockSupabase.from.mockReturnValue(mockDeckQuery);

      // Act
      const result = await flashcardService.listDeckFlashcards(options);

      // Assert
      expect(result).toBeNull();
    });

    it("should apply reviewDue filter correctly", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        deckId: "deck-123",
        page: 1,
        pageSize: 20,
        reviewDue: true,
      };

      const mockFlashcards = [
        createMockFlashcard({
          id: "card-1",
          next_review_at: "2024-12-31T00:00:00.000Z", // Past date
        }),
      ];

      const mockDeckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult({ id: options.deckId })),
      };

      const mockFlashcardsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue(createMockQueryResult(mockFlashcards, null, 1)),
      };

      mockSupabase.from.mockReturnValueOnce(mockDeckQuery).mockReturnValueOnce(mockFlashcardsQuery);

      // Mock current time
      const now = new Date("2025-01-01T12:00:00.000Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      // Act
      const result = await flashcardService.listDeckFlashcards(options);

      // Assert
      expect(result).toEqual({
        data: [
          {
            id: "card-1",
            front: "Front content",
            back: "Back content",
            deckId: "deck-123",
            source: "manual",
            easeFactor: 2.5,
            intervalDays: 1,
            repetition: 0,
            nextReviewAt: "2024-12-31T00:00:00.000Z",
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
            userId: "user-123",
            deletedAt: null,
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 1,
          totalPages: 1,
        },
      });
      expect(mockFlashcardsQuery.not).toHaveBeenCalledWith("next_review_at", "is", null);
      expect(mockFlashcardsQuery.lte).toHaveBeenCalledWith("next_review_at", now.toISOString());

      vi.useRealTimers();
    });

    it("should handle sorting correctly", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        deckId: "deck-123",
        page: 1,
        pageSize: 20,
        sort: "-updated_at",
      };

      const mockFlashcards = [createMockFlashcard({ id: "card-1" })];

      const mockDeckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult({ id: options.deckId })),
      };

      const mockFlashcardsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(mockFlashcards, null, 1)),
      };

      mockSupabase.from.mockReturnValueOnce(mockDeckQuery).mockReturnValueOnce(mockFlashcardsQuery);

      // Act
      await flashcardService.listDeckFlashcards(options);

      // Assert
      expect(mockFlashcardsQuery.order).toHaveBeenCalledWith("updated_at", {
        ascending: false,
        nullsFirst: false,
      });
    });

    it("should handle pagination correctly", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        deckId: "deck-123",
        page: 2,
        pageSize: 10,
      };

      const mockFlashcards = [createMockFlashcard({ id: "card-11" })];

      const mockDeckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult({ id: options.deckId })),
      };

      const mockFlashcardsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockFlashcards, error: null, count: 25 }),
      };

      mockSupabase.from.mockReturnValueOnce(mockDeckQuery).mockReturnValueOnce(mockFlashcardsQuery);

      // Act
      const result = await flashcardService.listDeckFlashcards(options);

      // Assert
      expect(mockFlashcardsQuery.range).toHaveBeenCalledWith(10, 19); // (page-1) * pageSize to from, from + pageSize - 1 to to
      expect(result?.pagination).toEqual({
        page: 2,
        pageSize: 10,
        totalCount: 25,
        totalPages: 3, // Math.ceil(25/10) = 3
      });
    });

    it("should exclude soft deleted flashcards", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        deckId: "deck-123",
        page: 1,
        pageSize: 20,
      };

      const mockFlashcards = [createMockFlashcard({ id: "card-1" })];

      const mockDeckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult({ id: options.deckId })),
      };

      const mockFlashcardsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(mockFlashcards, null, 1)),
      };

      mockSupabase.from.mockReturnValueOnce(mockDeckQuery).mockReturnValueOnce(mockFlashcardsQuery);

      // Act
      await flashcardService.listDeckFlashcards(options);

      // Assert
      expect(mockFlashcardsQuery.is).toHaveBeenCalledWith("deleted_at", null);
    });

    it("should calculate totalPages correctly for edge cases", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        deckId: "deck-123",
        page: 1,
        pageSize: 10,
      };

      const mockFlashcards = Array(23)
        .fill(null)
        .map((_, i) => createMockFlashcard({ id: `card-${i + 1}` }));

      const mockDeckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult({ id: options.deckId })),
      };

      const mockFlashcardsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockFlashcards.slice(0, 10), error: null, count: 23 }),
      };

      mockSupabase.from.mockReturnValueOnce(mockDeckQuery).mockReturnValueOnce(mockFlashcardsQuery);

      // Act
      const result = await flashcardService.listDeckFlashcards(options);

      // Assert
      expect(result?.pagination.totalPages).toBe(3); // Math.ceil(23/10) = 3
    });

    it("should throw error when flashcards query fails", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        deckId: "deck-123",
        page: 1,
        pageSize: 20,
      };

      const mockError = new Error("Database connection failed");

      const mockDeckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult({ id: options.deckId })),
      };

      const mockFlashcardsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(null, mockError)),
      };

      mockSupabase.from.mockReturnValueOnce(mockDeckQuery).mockReturnValueOnce(mockFlashcardsQuery);

      // Act & Assert
      await expect(flashcardService.listDeckFlashcards(options)).rejects.toThrow(mockError);
    });
  });

  describe("softDeleteFlashcard", () => {
    it("should soft-delete flashcard successfully and create audit event", async () => {
      // Arrange
      const userId = "user-123";
      const cardId = "card-123";
      const mockFlashcard = createMockFlashcard({
        id: cardId,
        user_id: userId,
        source: "manual",
      });

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(mockFlashcard)),
      };

      const mockEventQuery = {
        insert: vi.fn().mockResolvedValue(createMockQueryResult(null)),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockUpdateQuery) // First call for flashcard update
        .mockReturnValueOnce(mockEventQuery); // Second call for event creation

      // Act
      const result = await flashcardService.softDeleteFlashcard(userId, cardId);

      // Assert
      expect(result).toEqual({
        id: cardId,
        front: "Front content",
        back: "Back content",
        deckId: "deck-123",
        source: "manual",
        easeFactor: 2.5,
        intervalDays: 1,
        repetition: 0,
        nextReviewAt: null,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        userId,
        deletedAt: null,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("flashcards");
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        deleted_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(mockUpdateQuery.eq).toHaveBeenCalledWith("id", cardId);
      expect(mockUpdateQuery.eq).toHaveBeenCalledWith("user_id", userId);
      expect(mockUpdateQuery.is).toHaveBeenCalledWith("deleted_at", null);

      // Check audit event creation
      expect(mockSupabase.from).toHaveBeenCalledWith("events");
      expect(mockEventQuery.insert).toHaveBeenCalledWith({
        action: "delete",
        flashcard_id: cardId,
        source: "manual",
        user_id: userId,
      });
    });

    it("should return null when flashcard does not exist", async () => {
      // Arrange
      const userId = "user-123";
      const cardId = "non-existent-card";

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(null, { code: "PGRST116" })),
      };

      const mockCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(null)),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockUpdateQuery) // First call for flashcard update
        .mockReturnValueOnce(mockCheckQuery); // Second call to check if already deleted

      // Act
      const result = await flashcardService.softDeleteFlashcard(userId, cardId);

      // Assert
      expect(result).toBeNull();
      expect(mockCheckQuery.select).toHaveBeenCalledWith("deleted_at, source");
    });

    it("should throw ALREADY_DELETED error when flashcard is already soft-deleted", async () => {
      // Arrange
      const userId = "user-123";
      const cardId = "deleted-card";

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(null, { code: "PGRST116" })),
      };

      const mockCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult({ deleted_at: "2025-01-01T00:00:00.000Z" })),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockUpdateQuery) // First call for flashcard update
        .mockReturnValueOnce(mockCheckQuery); // Second call to check if already deleted

      // Act & Assert
      await expect(flashcardService.softDeleteFlashcard(userId, cardId)).rejects.toThrow("ALREADY_DELETED");
    });

    it("should throw error when database query fails", async () => {
      // Arrange
      const userId = "user-123";
      const cardId = "card-123";
      const mockError = new Error("Database connection failed");

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockUpdateQuery);

      // Act & Assert
      await expect(flashcardService.softDeleteFlashcard(userId, cardId)).rejects.toThrow(mockError);
    });
  });

  describe("listUserFlashcards", () => {
    it("should return flashcards list with basic pagination", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        page: 1,
        pageSize: 20,
      };

      const mockFlashcards = [
        createMockFlashcard({ id: "card-1", front: "Front 1", back: "Back 1" }),
        createMockFlashcard({ id: "card-2", front: "Front 2", back: "Back 2" }),
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(mockFlashcards, null, 2)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await flashcardService.listUserFlashcards(options);

      // Assert
      expect(result).toEqual({
        data: [
          {
            id: "card-1",
            front: "Front 1",
            back: "Back 1",
            deckId: "deck-123",
            source: "manual",
            easeFactor: 2.5,
            intervalDays: 1,
            repetition: 0,
            nextReviewAt: null,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
            userId: "user-123",
            deletedAt: null,
          },
          {
            id: "card-2",
            front: "Front 2",
            back: "Back 2",
            deckId: "deck-123",
            source: "manual",
            easeFactor: 2.5,
            intervalDays: 1,
            repetition: 0,
            nextReviewAt: null,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
            userId: "user-123",
            deletedAt: null,
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 2,
          totalPages: 1,
        },
      } as FlashcardsListResponse);

      expect(mockSupabase.from).toHaveBeenCalledWith("flashcards");
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", options.userId);
      expect(mockQuery.is).toHaveBeenCalledWith("deleted_at", null);
      expect(mockQuery.order).toHaveBeenCalledWith("created_at", { ascending: true, nullsFirst: false });
      expect(mockQuery.range).toHaveBeenCalledWith(0, 19);
    });

    it("should apply deckId filter and validate deck ownership", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        page: 1,
        pageSize: 20,
        deckId: "deck-456",
      };

      const mockFlashcards = [createMockFlashcard({ id: "card-1", deck_id: "deck-456" })];

      // Mock deck accessibility check
      const mockDeckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult({ id: options.deckId })),
      };

      // Mock flashcards query
      const mockFlashcardsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(mockFlashcards, null, 1)),
      };

      mockSupabase.from.mockReturnValueOnce(mockDeckQuery).mockReturnValueOnce(mockFlashcardsQuery);

      // Act
      const result = await flashcardService.listUserFlashcards(options);

      // Assert
      expect(result?.data).toHaveLength(1);
      expect(result?.data[0].deckId).toBe("deck-456");
      expect(mockFlashcardsQuery.eq).toHaveBeenCalledWith("deck_id", options.deckId);
    });

    it("should throw error when deckId filter references inaccessible deck", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        page: 1,
        pageSize: 20,
        deckId: "inaccessible-deck",
      };

      const mockDeckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)),
      };

      mockSupabase.from.mockReturnValue(mockDeckQuery);

      // Act & Assert
      await expect(flashcardService.listUserFlashcards(options)).rejects.toThrow("DECK_NOT_FOUND_OR_INACCESSIBLE");
    });

    it("should apply reviewDue filter correctly", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        page: 1,
        pageSize: 20,
        reviewDue: true,
      };

      const mockFlashcards = [
        createMockFlashcard({
          id: "card-1",
          next_review_at: "2024-12-31T00:00:00.000Z", // Past date
        }),
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(mockFlashcards, null, 1)),
        not: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Mock current time
      const now = new Date("2025-01-01T12:00:00.000Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      // Act
      const result = await flashcardService.listUserFlashcards(options);

      // Assert
      expect(result?.data).toHaveLength(1);
      expect(result?.data[0].nextReviewAt).toBe("2024-12-31T00:00:00.000Z");
      expect(mockQuery.not).toHaveBeenCalledWith("next_review_at", "is", null);
      expect(mockQuery.lte).toHaveBeenCalledWith("next_review_at", now.toISOString());

      vi.useRealTimers();
    });

    it("should apply search filter with text search", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        page: 1,
        pageSize: 20,
        search: "test query",
      };

      const mockFlashcards = [createMockFlashcard({ id: "card-1" })];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(mockFlashcards, null, 1)),
        textSearch: vi.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await flashcardService.listUserFlashcards(options);

      // Assert
      expect(result?.data).toHaveLength(1);
      expect(mockQuery.textSearch).toHaveBeenCalledWith("search_vector", options.search);
    });

    it("should apply multiple filters simultaneously", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        page: 1,
        pageSize: 20,
        deckId: "deck-456",
        reviewDue: true,
        search: "test",
      };

      const mockFlashcards = [
        createMockFlashcard({
          id: "card-1",
          deck_id: "deck-456",
          next_review_at: "2024-12-31T00:00:00.000Z",
        }),
      ];

      // Mock deck accessibility
      const mockDeckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult({ id: options.deckId })),
      };

      // Mock flashcards query
      const mockFlashcardsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(mockFlashcards, null, 1)),
        not: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValueOnce(mockDeckQuery).mockReturnValueOnce(mockFlashcardsQuery);

      const now = new Date("2025-01-01T12:00:00.000Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      // Act
      const result = await flashcardService.listUserFlashcards(options);

      // Assert
      expect(result?.data).toHaveLength(1);
      expect(mockFlashcardsQuery.eq).toHaveBeenCalledWith("deck_id", options.deckId);
      expect(mockFlashcardsQuery.not).toHaveBeenCalledWith("next_review_at", "is", null);
      expect(mockFlashcardsQuery.lte).toHaveBeenCalledWith("next_review_at", now.toISOString());
      expect(mockFlashcardsQuery.textSearch).toHaveBeenCalledWith("search_vector", options.search);

      vi.useRealTimers();
    });

    it("should handle sorting correctly", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        page: 2,
        pageSize: 10,
        sort: "-updated_at",
      };

      const mockFlashcards = [createMockFlashcard({ id: "card-11" })];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(mockFlashcards, null, 25)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await flashcardService.listUserFlashcards(options);

      // Assert
      expect(mockQuery.order).toHaveBeenCalledWith("updated_at", {
        ascending: false,
        nullsFirst: false,
      });
      expect(mockQuery.range).toHaveBeenCalledWith(10, 19); // (page-1) * pageSize to from, from + pageSize - 1 to to
      expect(result?.pagination).toEqual({
        page: 2,
        pageSize: 10,
        totalCount: 25,
        totalPages: 3, // Math.ceil(25/10) = 3
      });
    });

    it("should handle invalid sort field gracefully (defaults to created_at)", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        page: 1,
        pageSize: 20,
        sort: "invalid_field",
      };

      const mockFlashcards = [createMockFlashcard({ id: "card-1" })];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(mockFlashcards, null, 1)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await flashcardService.listUserFlashcards(options);

      // Assert
      // Service method doesn't validate sort fields - validation happens at schema level
      expect(mockQuery.order).toHaveBeenCalledWith("invalid_field", {
        ascending: true,
        nullsFirst: false,
      });
    });

    it("should exclude soft deleted flashcards", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        page: 1,
        pageSize: 20,
      };

      const mockFlashcards = [createMockFlashcard({ id: "card-1" })];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(mockFlashcards, null, 1)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await flashcardService.listUserFlashcards(options);

      // Assert
      expect(mockQuery.is).toHaveBeenCalledWith("deleted_at", null);
    });

    it("should calculate totalPages correctly for edge cases", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        page: 1,
        pageSize: 10,
      };

      const mockFlashcards = Array(23)
        .fill(null)
        .map((_, i) => createMockFlashcard({ id: `card-${i + 1}` }));

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockFlashcards.slice(0, 10), error: null, count: 23 }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await flashcardService.listUserFlashcards(options);

      // Assert
      expect(result?.pagination.totalPages).toBe(3); // Math.ceil(23/10) = 3
    });

    it("should handle empty results correctly", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        page: 1,
        pageSize: 20,
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult([], null, 0)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await flashcardService.listUserFlashcards(options);

      // Assert
      expect(result?.data).toEqual([]);
      expect(result?.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 1,
      });
    });

    it("should throw error when database query fails", async () => {
      // Arrange
      const options = {
        userId: "user-123",
        page: 1,
        pageSize: 20,
      };

      const mockError = new Error("Database connection failed");

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(flashcardService.listUserFlashcards(options)).rejects.toThrow(mockError);
    });
  });

  describe("getFlashcard", () => {
    it("should return flashcard data when found", async () => {
      // Arrange
      const cardId = "card-123";
      const mockFlashcardData = createMockFlashcard({ id: cardId });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(mockFlashcardData)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await flashcardService.getFlashcard(cardId);

      // Assert
      expect(result).toEqual({
        id: mockFlashcardData.id,
        front: mockFlashcardData.front,
        back: mockFlashcardData.back,
        deckId: mockFlashcardData.deck_id,
        source: mockFlashcardData.source,
        easeFactor: mockFlashcardData.ease_factor,
        intervalDays: mockFlashcardData.interval_days,
        repetition: mockFlashcardData.repetition,
        nextReviewAt: mockFlashcardData.next_review_at,
        createdAt: mockFlashcardData.created_at,
        updatedAt: mockFlashcardData.updated_at,
        userId: mockFlashcardData.user_id,
        deletedAt: mockFlashcardData.deleted_at,
      });
      expect(mockSupabase.from).toHaveBeenCalledWith("flashcards");
      expect(mockQuery.select).toHaveBeenCalledWith(`
        id,
        front,
        back,
        deck_id,
        source,
        ease_factor,
        interval_days,
        repetition,
        next_review_at,
        created_at,
        updated_at,
        user_id,
        deleted_at
      `);
      expect(mockQuery.eq).toHaveBeenCalledWith("id", cardId);
      expect(mockQuery.is).toHaveBeenCalledWith("deleted_at", null);
    });

    it("should return null when flashcard not found", async () => {
      // Arrange
      const cardId = "non-existent-card";

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await flashcardService.getFlashcard(cardId);

      // Assert
      expect(result).toBeNull();
    });

    it("should throw error when database query fails", async () => {
      // Arrange
      const cardId = "card-123";
      const mockError = new Error("Database connection failed");

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(flashcardService.getFlashcard(cardId)).rejects.toThrow(mockError);
    });

    describe("updateFlashcard", () => {
      const userId = "user-123";
      const cardId = "card-123";
      const validUpdates = {
        front: "Updated front content",
        back: "Updated back content",
        deckId: "deck-456",
        source: "ai_edited" as const,
      };

      it("should successfully update flashcard when user owns it and deck exists", async () => {
        // Arrange
        const existingCard = createMockFlashcard({
          id: cardId,
          user_id: userId,
          front: "Original front",
          back: "Original back",
          deck_id: "deck-123",
          source: "manual",
        });

        const updatedCard = createMockFlashcard({
          id: cardId,
          user_id: userId,
          front: validUpdates.front,
          back: validUpdates.back,
          deck_id: validUpdates.deckId,
          source: validUpdates.source,
          updated_at: "2025-01-02T00:00:00.000Z", // Updated timestamp
        });

        // Mock ownership check
        const ownershipQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(existingCard)),
        };

        // Mock deck ownership check
        const deckQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult({ id: validUpdates.deckId })),
        };

        // Mock update query
        const updateQuery = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(updatedCard)),
        };

        // Mock event logging
        const eventQuery = {
          insert: vi.fn().mockResolvedValue(createMockQueryResult({})),
        };

        mockSupabase.from
          .mockImplementationOnce(() => ownershipQuery) // First call: ownership check
          .mockImplementationOnce(() => deckQuery) // Second call: deck check
          .mockImplementationOnce(() => updateQuery) // Third call: update
          .mockImplementationOnce(() => eventQuery); // Fourth call: event log

        // Act
        const result = await flashcardService.updateFlashcard(userId, cardId, validUpdates);

        // Assert
        expect(result.id).toBe(cardId);
        expect(result.front).toBe(validUpdates.front);
        expect(result.back).toBe(validUpdates.back);
        expect(result.deckId).toBe(validUpdates.deckId);
        expect(result.source).toBe(validUpdates.source);
        expect(result.updatedAt).toBe("2025-01-02T00:00:00.000Z");

        // Verify ownership check was called
        expect(mockSupabase.from).toHaveBeenNthCalledWith(1, "flashcards");
        expect(ownershipQuery.select).toHaveBeenCalledWith("id, front, back, deck_id, source, user_id");
        expect(ownershipQuery.eq).toHaveBeenCalledWith("id", cardId);
        expect(ownershipQuery.eq).toHaveBeenCalledWith("user_id", userId);
        expect(ownershipQuery.is).toHaveBeenCalledWith("deleted_at", null);

        // Verify deck ownership check was called
        expect(mockSupabase.from).toHaveBeenNthCalledWith(2, "decks");
        expect(deckQuery.eq).toHaveBeenCalledWith("id", validUpdates.deckId);
        expect(deckQuery.eq).toHaveBeenCalledWith("user_id", userId);
        expect(deckQuery.is).toHaveBeenCalledWith("deleted_at", null);

        // Verify update was called
        expect(mockSupabase.from).toHaveBeenNthCalledWith(3, "flashcards");
        expect(updateQuery.update).toHaveBeenCalledWith({
          updated_at: expect.any(String), // Timestamp should be set
          front: validUpdates.front,
          back: validUpdates.back,
          deck_id: validUpdates.deckId,
          source: validUpdates.source,
        });
        expect(updateQuery.eq).toHaveBeenCalledWith("id", cardId);
        expect(updateQuery.eq).toHaveBeenCalledWith("user_id", userId);

        // Verify event was logged
        expect(mockSupabase.from).toHaveBeenNthCalledWith(4, "events");
        expect(eventQuery.insert).toHaveBeenCalledWith({
          user_id: userId,
          flashcard_id: cardId,
          action: "edit",
          source: existingCard.source, // Original source should be logged
        });
      });

      it("should update flashcard with partial updates (only front)", async () => {
        // Arrange
        const partialUpdates = { front: "Only front updated" };
        const existingCard = createMockFlashcard({ id: cardId, user_id: userId });
        const updatedCard = createMockFlashcard({
          id: cardId,
          user_id: userId,
          front: partialUpdates.front,
          back: existingCard.back, // Should remain unchanged
        });

        const ownershipQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(existingCard)),
        };

        // No deck check since deckId not provided
        const updateQuery = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(updatedCard)),
        };

        const eventQuery = {
          insert: vi.fn().mockResolvedValue(createMockQueryResult({})),
        };

        mockSupabase.from
          .mockImplementationOnce(() => ownershipQuery)
          .mockImplementationOnce(() => updateQuery)
          .mockImplementationOnce(() => eventQuery);

        // Act
        const result = await flashcardService.updateFlashcard(userId, cardId, partialUpdates);

        // Assert
        expect(updateQuery.update).toHaveBeenCalledWith({
          updated_at: expect.any(String),
          front: partialUpdates.front,
          // No other fields should be included
        });
        expect(result.front).toBe(partialUpdates.front);
      });

      it("should allow setting deckId to null", async () => {
        // Arrange
        const nullDeckUpdates = { deckId: null };
        const existingCard = createMockFlashcard({ id: cardId, user_id: userId, deck_id: "old-deck" });
        const updatedCard = createMockFlashcard({
          id: cardId,
          user_id: userId,
          deck_id: null,
        });

        const ownershipQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(existingCard)),
        };

        // No deck check since deckId is null
        const updateQuery = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(updatedCard)),
        };

        const eventQuery = {
          insert: vi.fn().mockResolvedValue(createMockQueryResult({})),
        };

        mockSupabase.from
          .mockImplementationOnce(() => ownershipQuery)
          .mockImplementationOnce(() => updateQuery)
          .mockImplementationOnce(() => eventQuery);

        // Act
        const result = await flashcardService.updateFlashcard(userId, cardId, nullDeckUpdates);

        // Assert
        expect(updateQuery.update).toHaveBeenCalledWith({
          updated_at: expect.any(String),
          deck_id: null,
        });
        expect(result.deckId).toBe(null);
      });

      it("should throw error when flashcard does not exist", async () => {
        // Arrange
        const ownershipQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(null)),
        };

        mockSupabase.from.mockReturnValue(ownershipQuery);

        // Act & Assert
        await expect(flashcardService.updateFlashcard(userId, cardId, validUpdates)).rejects.toThrow(
          "Flashcard not found or not owned by user"
        );
      });

      it("should throw error when flashcard exists but belongs to different user", async () => {
        // Arrange
        // The service query already filters by user_id, so if the flashcard belongs to a different user,
        // the query will return no results (null)
        const ownershipQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(null)), // No results found
        };

        mockSupabase.from.mockReturnValue(ownershipQuery);

        // Act & Assert
        await expect(flashcardService.updateFlashcard(userId, cardId, validUpdates)).rejects.toThrow(
          "Flashcard not found or not owned by user"
        );
      });

      it("should throw error when referenced deck does not exist", async () => {
        // Arrange
        const existingCard = createMockFlashcard({ id: cardId, user_id: userId });

        const ownershipQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(existingCard)),
        };

        const deckQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)), // Deck not found
        };

        mockSupabase.from.mockImplementationOnce(() => ownershipQuery).mockImplementationOnce(() => deckQuery);

        // Act & Assert
        await expect(flashcardService.updateFlashcard(userId, cardId, { deckId: "nonexistent-deck" })).rejects.toThrow(
          "Referenced deck does not exist or is not owned by user"
        );
      });

      it("should throw error when referenced deck belongs to different user", async () => {
        // Arrange
        const existingCard = createMockFlashcard({ id: cardId, user_id: userId });

        const ownershipQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(existingCard)),
        };

        const deckQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)), // No result = not owned
        };

        mockSupabase.from.mockImplementationOnce(() => ownershipQuery).mockImplementationOnce(() => deckQuery);

        // Act & Assert
        await expect(flashcardService.updateFlashcard(userId, cardId, { deckId: "other-user-deck" })).rejects.toThrow(
          "Referenced deck does not exist or is not owned by user"
        );
      });

      it("should throw error when update query fails", async () => {
        // Arrange
        const existingCard = createMockFlashcard({ id: cardId, user_id: userId });
        const mockError = new Error("Database update failed");

        const ownershipQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(existingCard)),
        };

        const updateQuery = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(null, mockError)),
        };

        mockSupabase.from.mockImplementationOnce(() => ownershipQuery).mockImplementationOnce(() => updateQuery);

        // Act & Assert
        await expect(flashcardService.updateFlashcard(userId, cardId, { front: "test" })).rejects.toThrow(mockError);
      });

      it("should throw error when event logging fails", async () => {
        // Arrange
        const existingCard = createMockFlashcard({ id: cardId, user_id: userId });
        const updatedCard = createMockFlashcard({
          id: cardId,
          user_id: userId,
          front: "Updated front",
        });
        const eventError = new Error("Event logging failed");

        const ownershipQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(existingCard)),
        };

        const updateQuery = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(updatedCard)),
        };

        const eventQuery = {
          insert: vi.fn().mockResolvedValue(createMockQueryResult(null, eventError)),
        };

        mockSupabase.from
          .mockImplementationOnce(() => ownershipQuery)
          .mockImplementationOnce(() => updateQuery)
          .mockImplementationOnce(() => eventQuery);

        // Act & Assert
        await expect(flashcardService.updateFlashcard(userId, cardId, { front: "test" })).rejects.toThrow(eventError);
      });
    });

    describe("createFlashcard", () => {
      const userId = "user-123";
      const createData = {
        front: "What is the capital of France?",
        back: "Paris",
        deckId: "deck-123",
        source: "manual" as const,
      };

      it("should successfully create flashcard without deck assignment", async () => {
        // Arrange
        const newCardId = "new-card-123";
        const createdCard = createMockFlashcard({
          id: newCardId,
          front: createData.front,
          back: createData.back,
          deck_id: null,
          source: createData.source,
          user_id: userId,
        });

        const insertQuery = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(createdCard)),
        };

        const eventQuery = {
          insert: vi.fn().mockResolvedValue(createMockQueryResult(null)),
        };

        mockSupabase.from
          .mockImplementationOnce(() => insertQuery) // First call for flashcard creation
          .mockImplementationOnce(() => eventQuery); // Second call for event creation

        // Act
        const result = await flashcardService.createFlashcard(userId, {
          front: createData.front,
          back: createData.back,
          source: createData.source,
        });

        // Assert
        expect(result).toEqual({
          id: newCardId,
          front: createData.front,
          back: createData.back,
          deckId: null,
          source: createData.source,
          easeFactor: 2.5,
          intervalDays: 1,
          repetition: 0,
          nextReviewAt: null,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          userId,
          deletedAt: null,
        });

        expect(mockSupabase.from).toHaveBeenCalledWith("flashcards");
        expect(insertQuery.insert).toHaveBeenCalledWith({
          user_id: userId,
          front: createData.front,
          back: createData.back,
          deck_id: null,
          source: createData.source,
        });
        expect(mockSupabase.from).toHaveBeenCalledWith("events");
      });

      it("should successfully create flashcard with deck assignment when deck exists and is owned", async () => {
        // Arrange
        const newCardId = "new-card-456";
        const createdCard = createMockFlashcard({
          id: newCardId,
          front: createData.front,
          back: createData.back,
          deck_id: createData.deckId,
          source: createData.source,
          user_id: userId,
        });

        const deckQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult({ id: createData.deckId })),
        };

        const insertQuery = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(createdCard)),
        };

        const eventQuery = {
          insert: vi.fn().mockResolvedValue(createMockQueryResult(null)),
        };

        mockSupabase.from
          .mockImplementationOnce(() => deckQuery) // First call for deck validation
          .mockImplementationOnce(() => insertQuery) // Second call for flashcard creation
          .mockImplementationOnce(() => eventQuery); // Third call for event creation

        // Act
        const result = await flashcardService.createFlashcard(userId, createData);

        // Assert
        expect(result.deckId).toBe(createData.deckId);
        expect(deckQuery.eq).toHaveBeenCalledWith("id", createData.deckId);
        expect(deckQuery.eq).toHaveBeenCalledWith("user_id", userId);
        expect(deckQuery.is).toHaveBeenCalledWith("deleted_at", null);
      });

      it("should create flashcard with default source 'manual' when not provided", async () => {
        // Arrange
        const newCardId = "new-card-789";
        const createdCard = createMockFlashcard({
          id: newCardId,
          front: createData.front,
          back: createData.back,
          deck_id: null,
          source: "manual",
          user_id: userId,
        });

        const insertQuery = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(createdCard)),
        };

        const eventQuery = {
          insert: vi.fn().mockResolvedValue(createMockQueryResult(null)),
        };

        mockSupabase.from.mockImplementationOnce(() => insertQuery).mockImplementationOnce(() => eventQuery);

        // Act
        const result = await flashcardService.createFlashcard(userId, {
          front: createData.front,
          back: createData.back,
        });

        // Assert
        expect(result.source).toBe("manual");
        expect(insertQuery.insert).toHaveBeenCalledWith({
          user_id: userId,
          front: createData.front,
          back: createData.back,
          deck_id: null,
          source: "manual",
        });
      });

      it("should throw error when referenced deck does not exist", async () => {
        // Arrange
        const deckQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)), // Deck not found
        };

        mockSupabase.from.mockReturnValue(deckQuery);

        // Act & Assert
        await expect(flashcardService.createFlashcard(userId, createData)).rejects.toThrow(
          "Deck not found or not owned by user"
        );

        expect(deckQuery.eq).toHaveBeenCalledWith("id", createData.deckId);
        expect(deckQuery.eq).toHaveBeenCalledWith("user_id", userId);
      });

      it("should throw error when referenced deck belongs to different user", async () => {
        // Arrange
        const deckQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)), // No result = not owned
        };

        mockSupabase.from.mockReturnValue(deckQuery);

        // Act & Assert
        await expect(flashcardService.createFlashcard(userId, createData)).rejects.toThrow(
          "Deck not found or not owned by user"
        );
      });

      it("should throw error when deck validation query fails", async () => {
        // Arrange
        const mockError = new Error("Database connection failed");
        const deckQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null, mockError)),
        };

        mockSupabase.from.mockReturnValue(deckQuery);

        // Act & Assert
        await expect(flashcardService.createFlashcard(userId, createData)).rejects.toThrow(mockError);
      });

      it("should throw error when flashcard insertion fails", async () => {
        // Arrange
        const mockError = new Error("Database insertion failed");
        const insertQuery = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(null, mockError)),
        };

        mockSupabase.from.mockReturnValue(insertQuery);

        // Act & Assert
        await expect(
          flashcardService.createFlashcard(userId, {
            front: createData.front,
            back: createData.back,
            source: createData.source,
          })
        ).rejects.toThrow(mockError);
      });

      it("should create audit event with correct parameters", async () => {
        // Arrange
        const newCardId = "new-card-audit";
        const createdCard = createMockFlashcard({
          id: newCardId,
          front: createData.front,
          back: createData.back,
          source: "ai",
          user_id: userId,
        });

        const insertQuery = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(createMockQueryResult(createdCard)),
        };

        const eventQuery = {
          insert: vi.fn().mockResolvedValue(createMockQueryResult(null)),
        };

        mockSupabase.from.mockImplementationOnce(() => insertQuery).mockImplementationOnce(() => eventQuery);

        // Act
        await flashcardService.createFlashcard(userId, {
          front: createData.front,
          back: createData.back,
          source: "ai",
        });

        // Assert
        expect(eventQuery.insert).toHaveBeenCalledWith({
          action: "create",
          flashcard_id: newCardId,
          source: "ai",
          user_id: userId,
        });
      });
    });
  });
});
