import { useState, useCallback } from "react";
import type { GenerationBatchResponse, ReviewCardVM, CardStatus, CreateFlashcardRequest } from "@/types";
import { generationBatchService } from "@/lib/services/generationBatchService";
import { batchToReviewCards } from "@/lib/flashcards/transformers";
import { usePolling } from "./usePolling";

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
  const [pollingBatchId, setPollingBatchId] = useState<string | null>(null);

  // Handle batch updates from polling
  const handleBatchUpdate = useCallback((data: GenerationBatchResponse) => {
    setBatch(data);

    if (data.status === "COMPLETED") {
      const reviewCards = batchToReviewCards(data);
      setCards(reviewCards);
    } else if (data.status === "FAILED") {
      setError("Generation batch failed");
    }
  }, []);

  // Setup polling for batch updates
  const { stopPolling } = usePolling<GenerationBatchResponse>(
    pollingBatchId ? `/api/generation-batches/${pollingBatchId}` : "",
    {
      interval: POLLING_INTERVAL,
      enabled: !!pollingBatchId,
      onSuccess: handleBatchUpdate,
      onError: (err) => setError(err.message),
      shouldStopPolling: (data) => data.status === "COMPLETED" || data.status === "FAILED",
    }
  );

  // Load generation batch and start polling if needed
  const loadBatch = useCallback(
    async (batchId: string) => {
      setIsLoading(true);
      setError(null);

      // Stop any existing polling
      stopPolling();
      setPollingBatchId(null);

      try {
        const data = await generationBatchService.fetchBatch(batchId);
        setBatch(data);

        // If batch is already completed, convert to cards immediately
        if (data.status === "COMPLETED") {
          const reviewCards = batchToReviewCards(data);
          setCards(reviewCards);
        } else if (data.status === "FAILED") {
          setError("Generation batch failed");
        } else {
          // Start polling for updates
          setPollingBatchId(batchId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load batch");
      } finally {
        setIsLoading(false);
      }
    },
    [stopPolling]
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

      // Prepare cards for saving
      const flashcardsToCreate: CreateFlashcardRequest[] = cardsToSave.map((card) => ({
        front: card.front,
        back: card.back,
        deckId: batch?.generations[0]?.deckId || undefined,
        source: card.status === "edited" ? ("ai_edited" as const) : ("ai" as const),
      }));

      // Save all cards using the service
      const savedFlashcards = await generationBatchService.saveFlashcardsBulk(flashcardsToCreate);

      // Convert saved flashcards to ReviewCardVM
      const savedCards: ReviewCardVM[] = savedFlashcards.map((savedCard, index) => ({
        ...cardsToSave[index],
        ...savedCard,
        status: cardsToSave[index].status,
        isEdited: cardsToSave[index].isEdited,
      }));

      // Reset state
      setBatch(null);
      setCards([]);
      setCurrentStep(0);
      setError(null);
      setPollingBatchId(null);

      // Return the saved cards
      return savedCards;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete review");
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [cards, batch]);

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
