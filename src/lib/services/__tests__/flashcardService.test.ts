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
});
