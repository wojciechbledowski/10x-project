import { useState, useEffect, useCallback, useRef } from "react";
import type { GenerationBatchResponse, ReviewCardVM, CardStatus, FlashcardResponse } from "@/types";

interface UseGeneratedCardsReviewResult {
  batch: GenerationBatchResponse | null;
  cards: ReviewCardVM[];
  currentStep: number;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  loadBatch: (batchId: string) => Promise<void>;
  acceptCard: (cardId: string) => Promise<void>;
  editCard: (cardId: string, updates: { front?: string; back?: string }) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  acceptAllCards: () => Promise<void>;
  deleteAllCards: () => Promise<void>;
  nextCard: () => void;
  previousCard: () => void;
  goToCard: (step: number) => void;
  completeReview: () => ReviewCardVM[];
}

const POLLING_INTERVAL = 2000; // 2 seconds

export function useGeneratedCardsReview(): UseGeneratedCardsReviewResult {
  const [batch, setBatch] = useState<GenerationBatchResponse | null>(null);
  const [cards, setCards] = useState<ReviewCardVM[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Convert API response to ReviewCardVM format
  const convertToReviewCardVM = useCallback(
    (flashcard: FlashcardResponse): ReviewCardVM => ({
      id: flashcard.id,
      front: flashcard.front,
      back: flashcard.back,
      source: flashcard.source,
      status: "pending" as CardStatus,
      isEdited: false,
      originalFront: flashcard.front,
      originalBack: flashcard.back,
    }),
    []
  );

  // Convert batch response to cards array
  const convertBatchToCards = useCallback(
    (batchResponse: GenerationBatchResponse): ReviewCardVM[] => {
      const allFlashcards: FlashcardResponse[] = [];

      // Collect all flashcards from all generations in the batch
      batchResponse.generations.forEach((generation) => {
        if (generation.flashcards) {
          allFlashcards.push(...generation.flashcards);
        }
      });

      return allFlashcards.map(convertToReviewCardVM);
    },
    [convertToReviewCardVM]
  );

  // Start polling for batch updates
  const startPolling = useCallback(
    (batchId: string) => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/generation-batches/${batchId}`, {
            signal: abortControllerRef.current?.signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data: GenerationBatchResponse = await response.json();

          // Update batch state
          setBatch(data);

          // If batch is completed, convert to cards and stop polling
          if (data.status === "COMPLETED" || data.status === "FAILED") {
            if (data.status === "COMPLETED") {
              const reviewCards = convertBatchToCards(data);
              setCards(reviewCards);
            } else {
              setError("Generation batch failed");
            }

            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        } catch (err) {
          // Only set error if it's not an abort error (component unmounting)
          if (!(err instanceof Error) || err.name !== "AbortError") {
            setError(err instanceof Error ? err.message : "Failed to poll batch status");
          }
        }
      }, POLLING_INTERVAL);
    },
    [convertBatchToCards]
  );

  // Load generation batch and start polling
  const loadBatch = useCallback(
    async (batchId: string) => {
      setIsLoading(true);
      setError(null);

      // Cancel any existing polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`/api/generation-batches/${batchId}`, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: GenerationBatchResponse = await response.json();
        setBatch(data);

        // If batch is already completed, convert to cards immediately
        if (data.status === "COMPLETED") {
          const reviewCards = convertBatchToCards(data);
          setCards(reviewCards);
        } else if (data.status === "FAILED") {
          setError("Generation batch failed");
        } else {
          // Start polling for updates
          startPolling(batchId);
        }
      } catch (err) {
        if (!(err instanceof Error) || err.name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Failed to load batch");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [convertBatchToCards, startPolling]
  );

  // Accept a card (mark as accepted)
  const acceptCard = useCallback(
    async (cardId: string) => {
      setIsProcessing(true);

      // Optimistic update
      setCards((prev) =>
        prev.map((card) => (card.id === cardId ? { ...card, status: "accepted" as CardStatus } : card))
      );

      try {
        // Save the card immediately via API
        const cardToSave = cards.find((card) => card.id === cardId);
        if (!cardToSave) throw new Error("Card not found");

        const createRequest = {
          front: cardToSave.front,
          back: cardToSave.back,
          deckId: batch?.generations[0]?.deckId || undefined,
          source: "ai" as const,
        };

        const response = await fetch("/api/flashcards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createRequest),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const savedCard: FlashcardResponse = await response.json();

        // Update the card with the saved card's data (keeping review status)
        setCards((prev) =>
          prev.map((card) =>
            card.id === cardId ? { ...card, ...savedCard, status: "accepted" as CardStatus, source: "ai" } : card
          )
        );
      } catch (err) {
        // Revert optimistic update on failure
        setCards((prev) =>
          prev.map((card) => (card.id === cardId ? { ...card, status: "pending" as CardStatus } : card))
        );
        setError(err instanceof Error ? err.message : "Failed to accept card");
      } finally {
        setIsProcessing(false);
      }
    },
    [cards, batch]
  );

  // Edit a card content
  const editCard = useCallback(
    async (cardId: string, updates: { front?: string; back?: string }) => {
      setIsProcessing(true);

      // Find current card for optimistic update
      const currentCard = cards.find((card) => card.id === cardId);
      if (!currentCard) return;

      // Optimistic update
      const optimisticCard: ReviewCardVM = {
        ...currentCard,
        front: updates.front ?? currentCard.front,
        back: updates.back ?? currentCard.back,
        status: "edited" as CardStatus,
        isEdited: true,
      };

      setCards((prev) => prev.map((card) => (card.id === cardId ? optimisticCard : card)));

      try {
        // Update the card via API (PATCH)
        const updateRequest = {
          ...updates,
          source: "ai_edited" as const,
        };

        const response = await fetch(`/api/flashcards/${cardId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateRequest),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const updatedCard: FlashcardResponse = await response.json();

        // Update the card with the response data (keeping review status)
        setCards((prev) =>
          prev.map((card) =>
            card.id === cardId
              ? { ...card, ...updatedCard, status: "edited" as CardStatus, isEdited: true, source: "ai_edited" }
              : card
          )
        );
      } catch (err) {
        // Revert optimistic update on failure
        setCards((prev) => prev.map((card) => (card.id === cardId ? currentCard : card)));
        setError(err instanceof Error ? err.message : "Failed to edit card");
      } finally {
        setIsProcessing(false);
      }
    },
    [cards]
  );

  // Delete a card (mark for deletion)
  const deleteCard = useCallback(async (cardId: string) => {
    setIsProcessing(true);

    // Optimistic update
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, status: "deleted" as CardStatus } : card)));

    try {
      // Delete the card via API
      const response = await fetch(`/api/flashcards/${cardId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Card successfully deleted, keep the "deleted" status
    } catch (err) {
      // Revert optimistic update on failure
      setCards((prev) =>
        prev.map((card) => (card.id === cardId ? { ...card, status: "pending" as CardStatus } : card))
      );
      setError(err instanceof Error ? err.message : "Failed to delete card");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Accept all pending cards
  const acceptAllCards = useCallback(async () => {
    setIsProcessing(true);

    // Get all pending card IDs
    const pendingCardIds = cards.filter((card) => card.status === "pending").map((card) => card.id);

    // Optimistic update
    setCards((prev) =>
      prev.map((card) => (card.status === "pending" ? { ...card, status: "accepted" as CardStatus } : card))
    );

    try {
      // Accept each card individually (they will be persisted via API)
      for (const cardId of pendingCardIds) {
        await acceptCard(cardId);
      }
    } catch (err) {
      // Revert optimistic update on failure
      setCards((prev) =>
        prev.map((card) => (card.status === "accepted" ? { ...card, status: "pending" as CardStatus } : card))
      );
      setError(err instanceof Error ? err.message : "Failed to accept all cards");
    } finally {
      setIsProcessing(false);
    }
  }, [cards, acceptCard]);

  // Delete all pending cards
  const deleteAllCards = useCallback(async () => {
    setIsProcessing(true);

    // Get all pending card IDs
    const pendingCardIds = cards.filter((card) => card.status === "pending").map((card) => card.id);

    // Optimistic update
    setCards((prev) =>
      prev.map((card) => (card.status === "pending" ? { ...card, status: "deleted" as CardStatus } : card))
    );

    try {
      // Delete each card individually (they will be persisted via API)
      for (const cardId of pendingCardIds) {
        await deleteCard(cardId);
      }
    } catch (err) {
      // Revert optimistic update on failure
      setCards((prev) =>
        prev.map((card) => (card.status === "deleted" ? { ...card, status: "pending" as CardStatus } : card))
      );
      setError(err instanceof Error ? err.message : "Failed to delete all cards");
    } finally {
      setIsProcessing(false);
    }
  }, [cards, deleteCard]);

  // Navigate to next card
  const nextCard = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, cards.length - 1));
  }, [cards.length]);

  // Navigate to previous card
  const previousCard = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // Navigate to a specific card
  const goToCard = useCallback(
    (step: number) => {
      setCurrentStep(Math.max(0, Math.min(step, cards.length - 1)));
    },
    [cards.length]
  );

  // Complete review and return accepted/edited cards (already persisted)
  const completeReview = useCallback((): ReviewCardVM[] => {
    // Filter accepted and edited cards (deleted cards are already removed from DB)
    const acceptedCards = cards.filter((card) => card.status === "accepted" || card.status === "edited");

    // Reset state
    setBatch(null);
    setCards([]);
    setCurrentStep(0);
    setError(null);

    // Return the accepted/edited cards (already persisted to database)
    return acceptedCards;
  }, [cards]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    batch,
    cards,
    currentStep,
    isLoading,
    isProcessing,
    error,
    loadBatch,
    acceptCard,
    editCard,
    deleteCard,
    acceptAllCards,
    deleteAllCards,
    nextCard,
    previousCard,
    goToCard,
    completeReview,
  };
}
