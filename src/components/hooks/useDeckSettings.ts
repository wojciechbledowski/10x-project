import { useState, useEffect } from "react";
import type { DeckDetailVM } from "@/types";

interface UseDeckSettingsResult {
  deck: DeckDetailVM | null;
  isLoadingDeck: boolean;
  updateDeckName: (newName: string) => Promise<void>;
  deleteDeck: () => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
}

export function useDeckSettings(deckId: string): UseDeckSettingsResult {
  const [deck, setDeck] = useState<DeckDetailVM | null>(null);
  const [isLoadingDeck, setIsLoadingDeck] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch deck data on mount or when deckId changes
  useEffect(() => {
    const fetchDeck = async () => {
      setIsLoadingDeck(true);
      setError(null);

      try {
        const response = await fetch(`/api/decks/${deckId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch deck");
        }
        const data = await response.json();
        setDeck(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load deck");
      } finally {
        setIsLoadingDeck(false);
      }
    };

    if (deckId) {
      fetchDeck();
    }
  }, [deckId]);

  // Update deck name
  const updateDeckName = async (newName: string) => {
    if (!deck) return;

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to update deck");
      }

      // Update local state
      setDeck({ ...deck, name: newName.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update deck");
      throw err; // Re-throw so component can handle it
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete deck (soft delete)
  const deleteDeck = async () => {
    if (!deck) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deletedAt: new Date().toISOString() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to delete deck");
      }

      // Redirect to decks list after successful deletion
      // Use replace to avoid adding to history and prevent potential issues
      window.location.replace("/decks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete deck");
      throw err; // Re-throw so component can handle it
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deck,
    isLoadingDeck,
    updateDeckName,
    deleteDeck,
    isUpdating,
    isDeleting,
    error,
  };
}
