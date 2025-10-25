import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useFlashcards } from "../useFlashcards";
import type { FlashcardsListResponse, FlashcardResponse } from "@/types";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("useFlashcards", () => {
  const mockDeckId = "deck-123";

  const mockFlashcardResponse: FlashcardResponse = {
    id: "card-123",
    front: "What is React?",
    back: "A JavaScript library for building user interfaces",
    deckId: mockDeckId,
    source: "manual",
    easeFactor: 2.5,
    intervalDays: 1,
    repetition: 0,
    nextReviewAt: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    userId: "user-123",
    deletedAt: null,
  };

  const mockFlashcardsListResponse: FlashcardsListResponse = {
    data: [mockFlashcardResponse],
    pagination: {
      page: 1,
      pageSize: 20,
      totalCount: 1,
      totalPages: 1,
    },
  };

  const mockUpdatedFlashcardResponse: FlashcardResponse = {
    ...mockFlashcardResponse,
    front: "Updated front",
    back: "Updated back",
    updatedAt: "2025-01-02T00:00:00.000Z",
  };

  beforeEach(() => {
    fetchMock.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial state", () => {
    it("should initialize with correct default state", () => {
      // Mock fetch to prevent API call during initial render
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFlashcardsListResponse),
      });

      const { result } = renderHook(() => useFlashcards(mockDeckId));

      expect(result.current.flashcards).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe("Initial data fetching", () => {
    it("should fetch flashcards on mount", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFlashcardsListResponse),
      });

      const { result } = renderHook(() => useFlashcards(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(fetchMock).toHaveBeenCalledWith(`/api/decks/${mockDeckId}/flashcards?page=1&pageSize=20&sort=-created_at`);

      expect(result.current.flashcards).toEqual([
        {
          id: "card-123",
          front: "What is React?",
          back: "A JavaScript library for building user interfaces",
          source: "manual",
          nextReviewAt: null,
        },
      ]);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(false);
    });

    it("should handle fetch error", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useFlashcards(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards).toEqual([]);
      expect(result.current.error).toBe("Failed to fetch flashcards");
    });

    it("should not fetch when deckId is empty", () => {
      renderHook(() => useFlashcards(""));

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("Pagination logic", () => {
    it("should load more flashcards when loadMore is called", async () => {
      const firstPageResponse: FlashcardsListResponse = {
        data: [mockFlashcardResponse],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 25,
          totalPages: 2,
        },
      };

      const secondPageResponse: FlashcardsListResponse = {
        data: [
          {
            ...mockFlashcardResponse,
            id: "card-456",
            front: "Second card",
          },
        ],
        pagination: {
          page: 2,
          pageSize: 20,
          totalCount: 25,
          totalPages: 2,
        },
      };

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(firstPageResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(secondPageResponse),
        });

      const { result } = renderHook(() => useFlashcards(mockDeckId));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards).toHaveLength(1);
      expect(result.current.hasMore).toBe(true);

      // Load more
      act(() => {
        result.current.loadMore();
      });

      expect(result.current.isLoadingMore).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoadingMore).toBe(false);
      });

      expect(result.current.flashcards).toHaveLength(2);
      expect(result.current.hasMore).toBe(false);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenLastCalledWith(
        `/api/decks/${mockDeckId}/flashcards?page=2&pageSize=20&sort=-created_at`
      );
    });

    it("should not load more when already loading", async () => {
      const paginatedResponse: FlashcardsListResponse = {
        data: [mockFlashcardResponse],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 25,
          totalPages: 2,
        },
      };

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(paginatedResponse),
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(paginatedResponse),
        });

      const { result } = renderHook(() => useFlashcards(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start loading more
      act(() => {
        result.current.loadMore();
      });

      expect(result.current.isLoadingMore).toBe(true);

      // Try to load more again while loading - should be prevented
      act(() => {
        result.current.loadMore();
      });

      // Should still only be called once (initial + first loadMore)
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("should not load more when no more data available", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFlashcardsListResponse), // hasMore = false
      });

      const { result } = renderHook(() => useFlashcards(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);

      result.current.loadMore();

      // Should not make additional request
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Flashcard CRUD operations", () => {
    it("should update flashcard with optimistic updates", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFlashcardsListResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUpdatedFlashcardResponse),
        });

      const { result } = renderHook(() => useFlashcards(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalCard = result.current.flashcards[0];
      expect(originalCard.front).toBe("What is React?");

      // Update flashcard
      await act(async () => {
        await result.current.updateFlashcard("card-123", {
          front: "Updated front",
          back: "Updated back",
        });
      });

      // Should have server response
      expect(result.current.flashcards[0].front).toBe("Updated front");
      expect(result.current.flashcards[0].back).toBe("Updated back");

      expect(fetchMock).toHaveBeenLastCalledWith("/api/flashcards/card-123", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          front: "Updated front",
          back: "Updated back",
        }),
      });
    });

    it("should rollback optimistic update on failure", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFlashcardsListResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: { message: "Update failed" } }),
        });

      const { result } = renderHook(() => useFlashcards(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalCard = result.current.flashcards[0];

      // Attempt update
      await expect(result.current.updateFlashcard("card-123", { front: "New front" })).rejects.toThrow("Update failed");

      // Should rollback to original
      expect(result.current.flashcards[0]).toEqual(originalCard);
    });

    it("should handle partial updates (only front)", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFlashcardsListResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockFlashcardResponse,
              front: "Only front updated",
              back: mockFlashcardResponse.back,
            }),
        });

      const { result } = renderHook(() => useFlashcards(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateFlashcard("card-123", { front: "Only front updated" });
      });

      expect(result.current.flashcards[0].front).toBe("Only front updated");
      expect(result.current.flashcards[0].back).toBe("A JavaScript library for building user interfaces");
    });

    it("should do nothing when updating non-existent card", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFlashcardsListResponse),
      });

      const { result } = renderHook(() => useFlashcards(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Try to update non-existent card
      await result.current.updateFlashcard("non-existent", { front: "test" });

      // Should not change anything
      expect(result.current.flashcards).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(1); // Only initial load
    });
  });

  describe("Refresh functionality", () => {
    it("should refresh flashcards and reset pagination", async () => {
      const firstResponse: FlashcardsListResponse = {
        data: [mockFlashcardResponse],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 25,
          totalPages: 2,
        },
      };

      const refreshResponse: FlashcardsListResponse = {
        data: [
          {
            ...mockFlashcardResponse,
            front: "Refreshed card",
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 1,
          totalPages: 1,
        },
      };

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(firstResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(refreshResponse),
        });

      const { result } = renderHook(() => useFlashcards(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards[0].front).toBe("What is React?");

      // Refresh
      result.current.refresh();

      await waitFor(() => {
        expect(result.current.flashcards[0].front).toBe("Refreshed card");
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenLastCalledWith(
        `/api/decks/${mockDeckId}/flashcards?page=1&pageSize=20&sort=-created_at`
      );
    });
  });

  describe("Deck ID changes", () => {
    it("should refetch when deckId changes", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFlashcardsListResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockFlashcardsListResponse,
              data: [
                {
                  ...mockFlashcardResponse,
                  id: "card-789",
                  front: "Different deck card",
                },
              ],
            }),
        });

      const { result, rerender } = renderHook((deckId) => useFlashcards(deckId), { initialProps: "deck-123" });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards[0].front).toBe("What is React?");

      // Change deck ID
      rerender("deck-456");

      await waitFor(() => {
        expect(result.current.flashcards[0].front).toBe("Different deck card");
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenLastCalledWith("/api/decks/deck-456/flashcards?page=1&pageSize=20&sort=-created_at");
    });
  });

  describe("Error handling", () => {
    it("should handle network errors during fetch", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useFlashcards(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.flashcards).toEqual([]);
    });

    it("should handle network errors during loadMore", async () => {
      const paginatedResponse: FlashcardsListResponse = {
        data: [mockFlashcardResponse],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 25,
          totalPages: 2,
        },
      };

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(paginatedResponse),
        })
        .mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useFlashcards(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.isLoadingMore).toBe(false);
      });

      expect(result.current.error).toBe("Network error");
    });
  });
});
