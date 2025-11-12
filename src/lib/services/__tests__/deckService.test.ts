import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeckService } from "../deckService";
import type { CreateDeckRequest } from "../../../types";
import type { ListDecksQueryParams } from "../../decks/schemas";
import {
  createMockSupabaseClient,
  createMockQueryResult,
  createMockDeck,
  resetAllMocks,
  type MockSupabaseClient,
} from "./test-utils";

describe("DeckService", () => {
  let mockSupabase: MockSupabaseClient;
  let deckService: DeckService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    deckService = new DeckService(
      mockSupabase as unknown as import("../../../db/supabase.client").SupabaseServerClient
    );
    resetAllMocks(mockSupabase);
  });

  describe("getDeckDetail", () => {
    it("should return deck detail with card count when deck exists", async () => {
      // Arrange
      const deckId = "deck-123";
      const mockDeckData = createMockDeck({ id: deckId, name: "Test Deck" });
      const mockCardCount = 5;

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(
          createMockQueryResult({
            ...mockDeckData,
            flashcards: Array(mockCardCount).fill({ count: mockCardCount }),
          })
        ),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await deckService.getDeckDetail(deckId);

      // Assert
      expect(result).toEqual({
        id: deckId,
        name: "Test Deck",
        createdAt: "2025-01-01T00:00:00.000Z",
        totalCards: mockCardCount,
      });
      expect(mockSupabase.from).toHaveBeenCalledWith("decks");
      expect(mockQuery.select).toHaveBeenCalledWith(expect.stringContaining("flashcards!inner(count)"));
    });

    it("should return null when deck does not exist", async () => {
      // Arrange
      const deckId = "non-existent-deck";

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await deckService.getDeckDetail(deckId);

      // Assert
      expect(result).toBeNull();
    });

    it("should throw error when database query fails", async () => {
      // Arrange
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
      await expect(deckService.getDeckDetail(deckId)).rejects.toThrow(mockError);
    });
  });

  describe("createDeck", () => {
    it("should create deck successfully with valid payload", async () => {
      // Arrange
      const userId = "user-123";
      const payload: CreateDeckRequest = { name: "New Test Deck" };
      const mockCreatedDeck = createMockDeck({
        id: "new-deck-123",
        name: payload.name,
        user_id: userId,
      });

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(mockCreatedDeck)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await deckService.createDeck(userId, payload);

      // Assert
      expect(result).toEqual({
        id: "new-deck-123",
        name: "New Test Deck",
        createdAt: "2025-01-01T00:00:00.000Z",
        totalCards: 0,
      });
      expect(mockSupabase.from).toHaveBeenCalledWith("decks");
      expect(mockQuery.insert).toHaveBeenCalledWith({
        name: payload.name,
        user_id: userId,
      });
    });

    it("should throw error when database insert fails", async () => {
      // Arrange
      const userId = "user-123";
      const payload: CreateDeckRequest = { name: "Test Deck" };
      const mockError = new Error("Unique constraint violation");

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(deckService.createDeck(userId, payload)).rejects.toThrow(mockError);
    });

    it("should handle duplicate deck names (assuming database handles uniqueness)", async () => {
      // Arrange
      const userId = "user-123";
      const payload: CreateDeckRequest = { name: "Existing Deck Name" };
      const mockError = new Error("duplicate key value violates unique constraint");

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery as unknown);

      // Act & Assert
      await expect(deckService.createDeck(userId, payload)).rejects.toThrow(mockError);
    });
  });

  describe("softDeleteDeck", () => {
    it("should soft delete existing deck successfully", async () => {
      // Arrange
      const userId = "user-123";
      const deckId = "deck-123";
      const mockExistingDeck = createMockDeck({ id: deckId, user_id: userId });

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(mockExistingDeck)),
      };

      mockSupabase.from.mockReturnValue(mockUpdateQuery);

      // Mock Date.now for consistent testing
      const fixedDate = new Date("2025-01-02T00:00:00.000Z");
      vi.useFakeTimers();
      vi.setSystemTime(fixedDate);

      // Act
      const result = await deckService.softDeleteDeck(userId, deckId);

      // Assert
      expect(result).toEqual({
        status: "deleted",
        deck: {
          id: deckId,
          name: mockExistingDeck.name,
          createdAt: mockExistingDeck.created_at,
          totalCards: 0,
        },
      });
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        deleted_at: fixedDate.toISOString(),
      });

      vi.useRealTimers();
    });

    it("should return not_found when deck does not exist", async () => {
      // Arrange
      const userId = "user-123";
      const deckId = "non-existent-deck";

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)),
      };

      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)),
      };

      // Mock two separate from calls
      mockSupabase.from.mockReturnValueOnce(mockUpdateQuery).mockReturnValueOnce(mockFetchQuery);

      // Act
      const result = await deckService.softDeleteDeck(userId, deckId);

      // Assert
      expect(result).toEqual({ status: "not_found" });
    });

    it("should return already_deleted when deck is already soft deleted", async () => {
      // Arrange
      const userId = "user-123";
      const deckId = "deck-123";

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)),
      };

      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult({ deleted_at: "2025-01-01T00:00:00.000Z" })),
      };

      mockSupabase.from.mockReturnValueOnce(mockUpdateQuery as unknown).mockReturnValueOnce(mockFetchQuery as unknown);

      // Act
      const result = await deckService.softDeleteDeck(userId, deckId);

      // Assert
      expect(result).toEqual({ status: "already_deleted" });
    });

    it("should throw error when database query fails", async () => {
      // Arrange
      const userId = "user-123";
      const deckId = "deck-123";
      const mockError = new Error("Database connection failed");

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockUpdateQuery);

      // Act & Assert
      await expect(deckService.softDeleteDeck(userId, deckId)).rejects.toThrow(mockError);
    });
  });

  describe("listDecks", () => {
    it("should return paginated deck list with default sorting", async () => {
      // Arrange
      const userId = "user-123";
      const params: ListDecksQueryParams = { page: 1, pageSize: 20, sort: "created_at" };
      const mockDecks = [
        createMockDeck({ id: "deck-1", name: "Deck 1" }),
        createMockDeck({ id: "deck-2", name: "Deck 2" }),
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(mockDecks, null, 2)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await deckService.listDecks(userId, params);

      // Assert
      expect(result).toEqual({
        data: [
          {
            id: "deck-1",
            name: "Deck 1",
            createdAt: "2025-01-01T00:00:00.000Z",
            totalCards: 0,
          },
          {
            id: "deck-2",
            name: "Deck 2",
            createdAt: "2025-01-01T00:00:00.000Z",
            totalCards: 0,
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 2,
          totalPages: 1,
        },
      });
      expect(mockQuery.order).toHaveBeenCalledWith("created_at", { ascending: true });
      expect(mockQuery.range).toHaveBeenCalledWith(0, 19);
    });

    it("should handle descending sort order", async () => {
      // Arrange
      const userId = "user-123";
      const params: ListDecksQueryParams = { page: 1, pageSize: 10, sort: "-name" };
      const mockDecks = [createMockDeck({ id: "deck-1", name: "Z Deck" })];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(mockDecks, null, 1)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await deckService.listDecks(userId, params);

      // Assert
      expect(result).toEqual({
        data: [
          {
            id: "deck-1",
            name: "Z Deck",
            createdAt: "2025-01-01T00:00:00.000Z",
            totalCards: 0,
          },
        ],
        pagination: {
          page: 1,
          pageSize: 10,
          totalCount: 1,
          totalPages: 1,
        },
      });
      expect(mockQuery.order).toHaveBeenCalledWith("name", { ascending: false });
      expect(mockQuery.range).toHaveBeenCalledWith(0, 9);
    });

    it("should handle pagination correctly", async () => {
      // Arrange
      const userId = "user-123";
      const params: ListDecksQueryParams = { page: 2, pageSize: 5, sort: "created_at" };
      const mockDecks = [createMockDeck({ id: "deck-6", name: "Deck 6" })];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockDecks, error: null, count: 25 }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await deckService.listDecks(userId, params);

      // Assert
      expect(result.pagination).toEqual({
        page: 2,
        pageSize: 5,
        totalCount: 25,
        totalPages: 5,
      });
      expect(mockQuery.range).toHaveBeenCalledWith(5, 9); // (page-1) * pageSize to from, from + pageSize - 1 to to
    });

    it("should exclude soft deleted decks", async () => {
      // Arrange
      const userId = "user-123";
      const params: ListDecksQueryParams = { page: 1, pageSize: 20, sort: "created_at" };
      const mockDecks = [createMockDeck({ id: "deck-1", name: "Active Deck" })];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockQueryResult(mockDecks, null, 1)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await deckService.listDecks(userId, params);

      // Assert
      expect(mockQuery.is).toHaveBeenCalledWith("deleted_at", null);
    });

    it("should throw error when database query fails", async () => {
      // Arrange
      const userId = "user-123";
      const params: ListDecksQueryParams = { page: 1, pageSize: 20, sort: "created_at" };
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
      await expect(deckService.listDecks(userId, params)).rejects.toThrow(mockError);
    });
  });

  describe("updateDeck", () => {
    it("should update deck name successfully", async () => {
      // Arrange
      const userId = "user-123";
      const deckId = "deck-123";
      const updates = { name: "Updated Deck Name" };
      const mockExistingDeck = createMockDeck({ id: deckId, user_id: userId, name: "Old Name" });

      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(mockExistingDeck)),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(
          createMockQueryResult({
            ...mockExistingDeck,
            name: updates.name,
          })
        ),
      };

      mockSupabase.from.mockReturnValueOnce(mockFetchQuery).mockReturnValueOnce(mockUpdateQuery);

      // Act
      const result = await deckService.updateDeck(userId, deckId, updates);

      // Assert
      expect(result).toEqual({
        id: deckId,
        name: updates.name,
        createdAt: mockExistingDeck.created_at,
        totalCards: 0,
      });
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({ name: updates.name });
    });

    it("should return null when deck does not exist", async () => {
      // Arrange
      const userId = "user-123";
      const deckId = "non-existent-deck";
      const updates = { name: "New Name" };

      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(null)),
      };

      mockSupabase.from.mockReturnValue(mockFetchQuery);

      // Act
      const result = await deckService.updateDeck(userId, deckId, updates);

      // Assert
      expect(result).toBeNull();
    });

    it("should throw error when no update fields provided", async () => {
      // Arrange
      const userId = "user-123";
      const deckId = "deck-123";

      // Act & Assert
      await expect(deckService.updateDeck(userId, deckId, {})).rejects.toThrow("No update fields provided");
    });

    it("should not update when new name is same as current name", async () => {
      // Arrange
      const userId = "user-123";
      const deckId = "deck-123";
      const currentName = "Same Name";
      const updates = { name: currentName };
      const mockExistingDeck = createMockDeck({ id: deckId, user_id: userId, name: currentName });

      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(createMockQueryResult(mockExistingDeck)),
      };

      const mockCardCountQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue(createMockQueryResult([{ count: 5 }])),
      };

      mockSupabase.from.mockReturnValueOnce(mockFetchQuery).mockReturnValueOnce(mockCardCountQuery);

      // Act
      const result = await deckService.updateDeck(userId, deckId, updates);

      // Assert
      expect(result).toEqual({
        id: deckId,
        name: currentName,
        createdAt: mockExistingDeck.created_at,
        totalCards: 5,
      });
      // Should not call update query since no actual changes
      expect(mockSupabase.from).toHaveBeenCalledTimes(2); // Fetch query + card count query
    });
  });
});
