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
  completeReview: () => FlashcardResponse[];
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
  const acceptCard = useCallback(async (cardId: string) => {
    setIsProcessing(true);

    // Optimistic update
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, status: "accepted" as CardStatus } : card)));

    try {
      // For now, just update local state - actual persistence happens on completeReview
      // In a real implementation, you might want to save individual cards immediately
    } catch (err) {
      // Revert optimistic update on failure
      setCards((prev) =>
        prev.map((card) => (card.id === cardId ? { ...card, status: "pending" as CardStatus } : card))
      );
      setError(err instanceof Error ? err.message : "Failed to accept card");
    } finally {
      setIsProcessing(false);
    }
  }, []);

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
        // For now, just update local state - actual persistence happens on completeReview
        // In a real implementation, you might want to save edits immediately
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
      // For now, just update local state - actual deletion happens on completeReview
      // In a real implementation, you might want to delete cards immediately
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

    // Optimistic update
    setCards((prev) =>
      prev.map((card) => (card.status === "pending" ? { ...card, status: "accepted" as CardStatus } : card))
    );

    try {
      // For now, just update local state - actual persistence happens on completeReview
    } catch (err) {
      // Revert optimistic update on failure
      setCards((prev) =>
        prev.map((card) => (card.status === "accepted" ? { ...card, status: "pending" as CardStatus } : card))
      );
      setError(err instanceof Error ? err.message : "Failed to accept all cards");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Delete all pending cards
  const deleteAllCards = useCallback(async () => {
    setIsProcessing(true);

    // Optimistic update
    setCards((prev) =>
      prev.map((card) => (card.status === "pending" ? { ...card, status: "deleted" as CardStatus } : card))
    );

    try {
      // For now, just update local state - actual deletion happens on completeReview
    } catch (err) {
      // Revert optimistic update on failure
      setCards((prev) =>
        prev.map((card) => (card.status === "deleted" ? { ...card, status: "pending" as CardStatus } : card))
      );
      setError(err instanceof Error ? err.message : "Failed to delete all cards");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Navigate to next card
  const nextCard = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, cards.length - 1));
  }, [cards.length]);

  // Navigate to previous card
  const previousCard = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // Complete review and return accepted cards
  const completeReview = useCallback((): FlashcardResponse[] => {
    // Filter accepted and edited cards
    const acceptedCards = cards
      .filter((card) => card.status === "accepted" || card.status === "edited")
      .map((card) => ({
        id: card.id,
        front: card.front,
        back: card.back,
        deckId: batch?.generations[0]?.deckId || null, // Use deck from first generation
        source: card.source,
        easeFactor: 2.5, // SM-2 default
        intervalDays: 1,
        repetition: 0,
        nextReviewAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: "", // Will be set by API
        deletedAt: null,
      }));

    // Reset state
    setBatch(null);
    setCards([]);
    setCurrentStep(0);
    setError(null);

    // In a real implementation, this would trigger the parent component
    // to save the acceptedCards via the API
    return acceptedCards;
  }, [cards, batch]);

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
    completeReview,
  };
}
