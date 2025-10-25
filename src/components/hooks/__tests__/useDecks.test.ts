import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useDecks } from "../useDecks";
import type { DecksListResponse, DeckResponse } from "@/types";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("useDecks", () => {
  const mockDeckResponse: DeckResponse = {
    id: "deck-123",
    name: "Test Deck",
    createdAt: "2025-01-01T00:00:00.000Z",
  };

  const mockDecksListResponse: DecksListResponse = {
    data: [mockDeckResponse],
    pagination: {
      page: 1,
      pageSize: 50,
      totalCount: 1,
      totalPages: 1,
    },
  };

  beforeEach(() => {
    fetchMock.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial state", () => {
    it("should initialize with loading state and empty decks", () => {
      // Mock fetch to prevent API call during initial render
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], pagination: { page: 1, pageSize: 50, totalCount: 0, totalPages: 0 } }),
      });

      const { result } = renderHook(() => useDecks());

      expect(result.current.decks).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.sort).toBe("created_at");
    });
  });

  describe("API state management", () => {
    it("should fetch decks successfully on mount", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDecksListResponse),
      });

      const { result } = renderHook(() => useDecks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/decks?page=1&pageSize=50&sort=created_at", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(result.current.decks).toEqual([
        {
          id: "deck-123",
          name: "Test Deck",
          totalCards: 0,
          dueCards: 0,
        },
      ]);
      expect(result.current.error).toBeNull();
    });

    it("should handle API error and set error state", async () => {
      const errorMessage = "Failed to load decks";
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: errorMessage } }),
      });

      const { result } = renderHook(() => useDecks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.decks).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
    });

    it("should handle network error gracefully", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useDecks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.decks).toEqual([]);
      expect(result.current.error).toBe("Network error");
    });

    it("should handle 401 authentication error", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useDecks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Authentication required");
    });
  });

  describe("Optimistic updates", () => {
    it("should add deck optimistically and replace with real data on success", async () => {
      // Initial fetch
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDecksListResponse),
      });

      // Create deck request
      const createResponse: DeckResponse = {
        id: "deck-456",
        name: "New Deck",
        createdAt: "2025-01-02T00:00:00.000Z",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createResponse),
      });

      const { result } = renderHook(() => useDecks());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Create deck
      let createdDeck;
      await act(async () => {
        createdDeck = await result.current.createDeck("New Deck");
      });

      expect(createdDeck).toEqual({
        id: "deck-456",
        name: "New Deck",
        totalCards: 0,
        dueCards: 0,
      });

      // Should have replaced temp deck with real one
      expect(result.current.decks).toHaveLength(2);
      expect(result.current.decks[0]).toEqual(createdDeck);
    });

    it("should rollback optimistic update on create failure", async () => {
      // Initial fetch
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDecksListResponse),
      });

      // Create deck failure
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: { message: "Deck name already exists" } }),
      });

      const { result } = renderHook(() => useDecks());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Attempt to create deck
      let resultValue;
      await act(async () => {
        resultValue = await result.current.createDeck("Duplicate Deck");
      });

      expect(resultValue).toBeNull();
      expect(result.current.error).toBe("A deck with this name already exists");

      // Should rollback temp deck
      expect(result.current.decks).toHaveLength(1);
      expect(result.current.decks[0].id).toBe("deck-123");
    });

    it("should handle rate limiting error", async () => {
      // Initial fetch
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDecksListResponse),
      });

      // Rate limited response
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useDecks());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let resultValue;
      await act(async () => {
        resultValue = await result.current.createDeck("Rate Limited Deck");
      });

      expect(resultValue).toBeNull();
      expect(result.current.error).toBe("You're creating decks too quickly. Try again in a moment.");
    });
  });

  describe("Sorting functionality", () => {
    it("should refetch decks when sort changes", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDecksListResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDecksListResponse),
        });

      const { result } = renderHook(() => useDecks());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Change sort
      act(() => {
        result.current.setSort("name");
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock).toHaveBeenLastCalledWith("/api/decks?page=1&pageSize=50&sort=name", expect.any(Object));
      });
    });

    it("should update sort state when setSort is called", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDecksListResponse),
      });

      const { result } = renderHook(() => useDecks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.sort).toBe("created_at");

      act(() => {
        result.current.setSort("-created_at");
      });

      expect(result.current.sort).toBe("-created_at");
    });
  });

  describe("Refetch functionality", () => {
    it("should refetch decks with current sort when refetch is called", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDecksListResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDecksListResponse),
        });

      const { result } = renderHook(() => useDecks());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Call refetch
      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Error handling edge cases", () => {
    it("should handle malformed JSON response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const { result } = renderHook(() => useDecks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("HTTP 500");
    });

    it("should handle non-Error exceptions", async () => {
      fetchMock.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useDecks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Failed to load decks");
    });
  });
});
