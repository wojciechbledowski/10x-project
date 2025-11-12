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
  completeReview: () => Promise<ReviewCardVM[]>;
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
      const allFlashcards: { front: string; back: string; id: string }[] = [];

      // Collect all flashcards from all generations in the batch
      batchResponse.generations.forEach((generation) => {
        if (generation.generatedData?.flashcards) {
          // Add generated data flashcards with temporary IDs
          generation.generatedData.flashcards.forEach((card: { front: string; back: string }, index: number) => {
            allFlashcards.push({
              id: `temp-${generation.id}-${index}`,
              front: card.front,
              back: card.back,
            });
          });
        }
      });

      return allFlashcards.map((card) =>
        convertToReviewCardVM({
          id: card.id,
          front: card.front,
          back: card.back,
          source: "ai",
          deckId: null,
          easeFactor: 2.5,
          intervalDays: 1,
          repetition: 0,
          nextReviewAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: "",
          deletedAt: null,
        })
      );
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

    // Update local state only (will be saved when review is completed)
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, status: "accepted" as CardStatus } : card)));

    setIsProcessing(false);
  }, []);

  // Edit a card content
  const editCard = useCallback(
    async (cardId: string, updates: { front?: string; back?: string }) => {
      setIsProcessing(true);

      // Find current card for update
      const currentCard = cards.find((card) => card.id === cardId);
      if (!currentCard) return;

      // Update local state only (will be saved when review is completed)
      const updatedCard: ReviewCardVM = {
        ...currentCard,
        front: updates.front ?? currentCard.front,
        back: updates.back ?? currentCard.back,
        status: "edited" as CardStatus,
        isEdited: true,
      };

      setCards((prev) => prev.map((card) => (card.id === cardId ? updatedCard : card)));
      setIsProcessing(false);
    },
    [cards]
  );

  // Delete a card (remove from review)
  const deleteCard = useCallback(async (cardId: string) => {
    setIsProcessing(true);

    // Remove the card from local state (since it was never saved to database)
    setCards((prev) => prev.filter((card) => card.id !== cardId));

    setIsProcessing(false);
  }, []);

  // Accept all pending cards
  const acceptAllCards = useCallback(async () => {
    setIsProcessing(true);

    // Update local state only (will be saved when review is completed)
    setCards((prev) =>
      prev.map((card) => (card.status === "pending" ? { ...card, status: "accepted" as CardStatus } : card))
    );

    setIsProcessing(false);
  }, []);

  // Delete all pending cards
  const deleteAllCards = useCallback(async () => {
    setIsProcessing(true);

    // Remove all pending cards from local state (since they were never saved to database)
    setCards((prev) => prev.filter((card) => card.status !== "pending"));

    setIsProcessing(false);
  }, []);

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
  const completeReview = useCallback(async (): Promise<ReviewCardVM[]> => {
    setIsProcessing(true);

    try {
      // Filter accepted and edited cards
      const cardsToSave = cards.filter((card) => card.status === "accepted" || card.status === "edited");

      // Save accepted/edited cards to database
      const savedCards: ReviewCardVM[] = [];
      for (const card of cardsToSave) {
        const createRequest = {
          front: card.front,
          back: card.back,
          deckId: batch?.generations[0]?.deckId || undefined,
          source: card.status === "edited" ? "ai_edited" : "ai",
        };

        const response = await fetch("/api/flashcards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createRequest),
        });

        if (!response.ok) {
          throw new Error(`Failed to save card: HTTP ${response.status}`);
        }

        const savedCard: FlashcardResponse = await response.json();
        const reviewCard: ReviewCardVM = {
          ...card,
          ...savedCard,
          status: card.status,
          isEdited: card.isEdited,
        };
        savedCards.push(reviewCard);
      }

      // Reset state
      setBatch(null);
      setCards([]);
      setCurrentStep(0);
      setError(null);

      // Return the saved cards
      return savedCards;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete review");
      throw err;
    } finally {
      setIsProcessing(false);
    }
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
    goToCard,
    completeReview,
  };
}
