import { useCallback, useEffect, useState } from "react";
import type { DeckCardVM, SortKey, DeckResponse, DecksListResponse } from "../../types";

/**
 * Hook for managing deck list state and operations
 */
export function useDecks() {
  const [decks, setDecks] = useState<DeckCardVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("created_at");

  /**
   * Fetch decks from API
   */
  const fetchDecks = useCallback(async (sortKey: SortKey) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: "1",
        pageSize: "50", // MVP: fetch all for now
        sort: sortKey,
      });

      const response = await fetch(`/api/decks?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Middleware should handle redirect, but set error for UI
          throw new Error("Authentication required");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data: DecksListResponse = await response.json();

      // Transform API response to view model
      // Note: dueCards is initially 0 until API supports it
      const deckVMs: DeckCardVM[] = data.data.map((deck: DeckResponse) => ({
        id: deck.id,
        name: deck.name,
        totalCards: deck.totalCards,
        dueCards: 0, // TODO: Add due cards calculation
      }));

      setDecks(deckVMs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load decks";
      setError(errorMessage);
      setDecks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new deck with optimistic update
   */
  const createDeck = useCallback(async (name: string): Promise<DeckCardVM | null> => {
    // Create temporary deck for optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempDeck: DeckCardVM = {
      id: tempId,
      name,
      totalCards: 0,
      dueCards: 0,
    };

    // Optimistically add to list
    setDecks((prev) => [tempDeck, ...prev]);

    try {
      const response = await fetch("/api/decks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        // Rollback optimistic update
        setDecks((prev) => prev.filter((deck) => deck.id !== tempId));

        if (response.status === 401) {
          throw new Error("Authentication required");
        }

        if (response.status === 429) {
          throw new Error("You're creating decks too quickly. Try again in a moment.");
        }

        if (response.status === 409) {
          throw new Error("A deck with this name already exists");
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const newDeck: DeckResponse = await response.json();

      // Replace temp deck with real one
      const realDeck: DeckCardVM = {
        id: newDeck.id,
        name: newDeck.name,
        totalCards: newDeck.totalCards,
        dueCards: 0,
      };

      setDecks((prev) => prev.map((deck) => (deck.id === tempId ? realDeck : deck)));

      return realDeck;
    } catch (err) {
      // Rollback already handled above
      const errorMessage = err instanceof Error ? err.message : "Failed to create deck";
      setError(errorMessage);
      return null;
    }
  }, []);

  /**
   * Refetch decks (useful for error recovery)
   */
  const refetch = useCallback(() => {
    fetchDecks(sort);
  }, [fetchDecks, sort]);

  /**
   * Update sort and refetch
   */
  const updateSort = useCallback((newSort: SortKey) => {
    setSort(newSort);
  }, []);

  // Initial fetch and refetch when sort changes
  useEffect(() => {
    fetchDecks(sort);
  }, [fetchDecks, sort]);

  return {
    decks,
    loading,
    error,
    sort,
    setSort: updateSort,
    createDeck,
    refetch,
  };
}
