import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useDeckSettings } from "../useDeckSettings";
import type { DeckDetailVM } from "@/types";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock window.location methods
const mockReplace = vi.fn();
Object.defineProperty(window, "location", {
  value: {
    replace: mockReplace,
  },
  writable: true,
});

describe("useDeckSettings", () => {
  const mockDeckId = "deck-123";

  const mockDeckDetail: DeckDetailVM = {
    id: mockDeckId,
    name: "Test Deck",
    createdAt: "2025-01-01T00:00:00.000Z",
    cardCount: 5,
  };

  beforeEach(() => {
    fetchMock.mockClear();
    mockReplace.mockClear();
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
        json: () => Promise.resolve(mockDeckDetail),
      });

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      expect(result.current.deck).toBeNull();
      expect(result.current.isLoadingDeck).toBe(true);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Deck fetching", () => {
    it("should fetch deck details on mount", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeckDetail),
      });

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      expect(fetchMock).toHaveBeenCalledWith(`/api/decks/${mockDeckId}`);
      expect(result.current.deck).toEqual(mockDeckDetail);
      expect(result.current.error).toBeNull();
    });

    it("should handle fetch error", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { message: "Deck not found" } }),
      });

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      expect(result.current.deck).toBeNull();
      expect(result.current.error).toBe("Failed to fetch deck");
    });

    it("should not fetch when deckId is empty", () => {
      renderHook(() => useDeckSettings(""));

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should refetch when deckId changes", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeckDetail),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockDeckDetail,
              id: "deck-456",
              name: "Different Deck",
            }),
        });

      const { result, rerender } = renderHook((deckId) => useDeckSettings(deckId), { initialProps: mockDeckId });

      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      expect(result.current.deck?.name).toBe("Test Deck");

      // Change deck ID
      rerender("deck-456");

      await waitFor(() => {
        expect(result.current.deck?.name).toBe("Different Deck");
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("Deck name updates", () => {
    it("should update deck name successfully", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeckDetail),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      const newName = "Updated Deck Name";
      await act(async () => {
        await result.current.updateDeckName(newName);
      });

      expect(result.current.isUpdating).toBe(false);
      expect(result.current.deck?.name).toBe(newName);
      expect(result.current.error).toBeNull();

      expect(fetchMock).toHaveBeenLastCalledWith(`/api/decks/${mockDeckId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      });
    });

    it("should trim whitespace from deck name", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeckDetail),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      await act(async () => {
        await result.current.updateDeckName("  Spaced Name  ");
      });

      expect(result.current.deck?.name).toBe("Spaced Name");

      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ name: "Spaced Name" }),
        })
      );
    });

    it("should handle update error and set error state", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeckDetail),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: { message: "Update failed" } }),
        });

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      await act(async () => {
        await expect(result.current.updateDeckName("New Name")).rejects.toThrow("Update failed");
      });

      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBe("Update failed");
      expect(result.current.deck?.name).toBe("Test Deck"); // Should remain unchanged
    });

    it("should do nothing when deck is not loaded", async () => {
      // Mock initial fetch to fail, keeping deck as null
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      // Wait for initial fetch to fail
      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      expect(result.current.deck).toBeNull();

      await act(async () => {
        await result.current.updateDeckName("New Name");
      });

      // Should not make any additional API calls
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("should handle network error during update", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeckDetail),
        })
        .mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      await act(async () => {
        await expect(result.current.updateDeckName("New Name")).rejects.toThrow("Network error");
      });

      expect(result.current.error).toBe("Network error");
    });
  });

  describe("Deck deletion", () => {
    it("should delete deck successfully and redirect", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeckDetail),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      await result.current.deleteDeck();

      expect(result.current.isDeleting).toBe(false);
      expect(result.current.error).toBeNull();

      expect(fetchMock).toHaveBeenLastCalledWith(`/api/decks/${mockDeckId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.stringMatching(/{"deletedAt":"[^"]+"}/),
      });

      expect(mockReplace).toHaveBeenCalledWith("/decks");
    });

    it("should handle delete error and set error state", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeckDetail),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: { message: "Delete failed" } }),
        });

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      await act(async () => {
        await expect(result.current.deleteDeck()).rejects.toThrow("Delete failed");
      });

      expect(result.current.isDeleting).toBe(false);
      expect(result.current.error).toBe("Delete failed");
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should do nothing when deck is not loaded", async () => {
      // Mock initial fetch to fail, keeping deck as null
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      // Wait for initial fetch to fail
      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      expect(result.current.deck).toBeNull();

      await act(async () => {
        await result.current.deleteDeck();
      });

      expect(fetchMock).toHaveBeenCalledTimes(1); // Only initial fetch
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should handle network error during delete", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeckDetail),
        })
        .mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      await act(async () => {
        await expect(result.current.deleteDeck()).rejects.toThrow("Network error");
      });

      expect(result.current.error).toBe("Network error");
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe("Loading states", () => {
    it("should manage loading states correctly during operations", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeckDetail),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: () => Promise.resolve({}),
                  }),
                100
              )
            )
        );

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      // Start update
      let updatePromise: Promise<void>;
      act(() => {
        updatePromise = result.current.updateDeckName("New Name");
      });

      expect(result.current.isUpdating).toBe(true);
      expect(result.current.isDeleting).toBe(false);

      await act(async () => {
        await updatePromise;
      });

      expect(result.current.isUpdating).toBe(false);
    });

    it("should manage delete loading state", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeckDetail),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      let deletePromise: Promise<void>;
      act(() => {
        deletePromise = result.current.deleteDeck();
      });

      expect(result.current.isDeleting).toBe(true);
      expect(result.current.isUpdating).toBe(false);

      await act(async () => {
        await deletePromise;
      });

      expect(result.current.isDeleting).toBe(false);
    });
  });

  describe("Error handling edge cases", () => {
    it("should handle malformed JSON responses", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeckDetail),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.reject(new Error("Invalid JSON")),
        });

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      await act(async () => {
        await expect(result.current.updateDeckName("New Name")).rejects.toThrow("Invalid JSON");
      });

      expect(result.current.error).toBe("Invalid JSON");
    });

    it("should handle non-Error exceptions", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeckDetail),
        })
        .mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useDeckSettings(mockDeckId));

      await waitFor(() => {
        expect(result.current.isLoadingDeck).toBe(false);
      });

      await act(async () => {
        await expect(result.current.updateDeckName("New Name")).rejects.toThrow();
      });

      expect(result.current.error).toBe("Failed to update deck");
    });
  });
});
