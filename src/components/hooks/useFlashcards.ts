import { useState, useEffect, useCallback } from "react";
import type { FlashcardVM, FlashcardsListResponse, FlashcardResponse } from "@/types";

interface UseFlashcardsResult {
  flashcards: FlashcardVM[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  createFlashcard: (front: string, back: string) => Promise<void>;
  updateFlashcard: (cardId: string, updates: { front?: string; back?: string }) => Promise<void>;
  refresh: () => void;
}

const PAGE_SIZE = 20;

export function useFlashcards(deckId: string): UseFlashcardsResult {
  const [flashcards, setFlashcards] = useState<FlashcardVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Convert API response to VM format
  const convertToVM = (apiFlashcard: FlashcardResponse): FlashcardVM => ({
    id: apiFlashcard.id,
    front: apiFlashcard.front,
    back: apiFlashcard.back,
    source: apiFlashcard.source,
    nextReviewAt: apiFlashcard.nextReviewAt,
  });

  // Fetch flashcards
  const fetchFlashcards = useCallback(
    async (pageNum: number, append = false) => {
      try {
        const response = await fetch(
          `/api/decks/${deckId}/flashcards?page=${pageNum}&pageSize=${PAGE_SIZE}&sort=-created_at`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch flashcards");
        }

        const data: FlashcardsListResponse = await response.json();
        const newFlashcards = data.data.map(convertToVM);

        setFlashcards((prev) => (append ? [...prev, ...newFlashcards] : newFlashcards));

        setHasMore(data.pagination.page < data.pagination.totalPages);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load flashcards");
      }
    },
    [deckId]
  );

  // Initial load
  useEffect(() => {
    if (deckId) {
      setIsLoading(true);
      setPage(1);
      fetchFlashcards(1, false).finally(() => setIsLoading(false));
    }
  }, [deckId, fetchFlashcards]);

  // Load more flashcards
  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);

    fetchFlashcards(nextPage, true).finally(() => setIsLoadingMore(false));
  }, [hasMore, isLoadingMore, page, fetchFlashcards]);

  // Refresh flashcards (useful after adding new cards)
  const refresh = useCallback(() => {
    setIsLoading(true);
    setPage(1);
    fetchFlashcards(1, false).finally(() => setIsLoading(false));
  }, [fetchFlashcards]);

  // Update flashcard with optimistic updates
  const updateFlashcard = useCallback(
    async (cardId: string, updates: { front?: string; back?: string }) => {
      // Find the current flashcard for optimistic update
      const currentCard = flashcards.find((card) => card.id === cardId);
      if (!currentCard) return;

      // Optimistic update
      const optimisticCard: FlashcardVM = {
        ...currentCard,
        front: updates.front ?? currentCard.front,
        back: updates.back ?? currentCard.back,
      };

      setFlashcards((prev) => prev.map((card) => (card.id === cardId ? optimisticCard : card)));

      const response = await fetch(`/api/flashcards/${cardId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        setFlashcards((prev) => prev.map((card) => (card.id === cardId ? currentCard : card)));
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to update flashcard");
      }

      // Update with server response
      const updatedData = await response.json();
      setFlashcards((prev) => prev.map((card) => (card.id === cardId ? convertToVM(updatedData) : card)));
    },
    [flashcards]
  );

  // Create new flashcard
  const createFlashcard = useCallback(
    async (front: string, back: string) => {
      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          front,
          back,
          deckId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to create flashcard");
      }

      // Refresh to show the new card
      await refresh();
    },
    [deckId, refresh]
  );

  return {
    flashcards,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    createFlashcard,
    updateFlashcard,
    refresh,
  };
}
