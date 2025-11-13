import { useState, useEffect, useCallback } from "react";
import type { ReviewCardVM } from "@/types";
import { validateCardContent, validateCompletionCards } from "@/lib/flashcards/validation";

interface UseGeneratedCardsModalStateProps {
  flashcards: { front: string; back: string }[];
  deckId: string;
  isOpen: boolean;
  onComplete: (cards: ReviewCardVM[]) => void;
}

export function useGeneratedCardsModalState({
  flashcards,
  deckId,
  isOpen,
  onComplete,
}: UseGeneratedCardsModalStateProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ front?: string; back?: string }>({});
  const [showAcceptAllDialog, setShowAcceptAllDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Convert flashcards to ReviewCardVM format and manage state
  const [cards, setCards] = useState<ReviewCardVM[]>(() =>
    flashcards.map((card, index) => ({
      id: `temp-${index}`,
      front: card.front,
      back: card.back,
      source: "ai",
      status: "pending" as const,
      isEdited: false,
      originalFront: card.front,
      originalBack: card.back,
    }))
  );

  // Update cards when flashcards prop changes
  useEffect(() => {
    setCards(
      flashcards.map((card, index) => ({
        id: `temp-${index}`,
        front: card.front,
        back: card.back,
        source: "ai",
        status: "pending" as const,
        isEdited: false,
        originalFront: card.front,
        originalBack: card.back,
      }))
    );
    setCurrentStep(0);
  }, [flashcards]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsFlipped(false);
      setIsEditing(false);
      setValidationErrors({});
      setShowAcceptAllDialog(false);
      setShowDeleteAllDialog(false);
    }
  }, [isOpen]);

  // Navigation functions
  const nextCard = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, cards.length - 1));
  }, [cards.length]);

  const previousCard = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToCard = useCallback((step: number) => {
    setCurrentStep(step);
    setIsFlipped(false);
    setIsEditing(false);
    setValidationErrors({});
  }, []);

  // Handle card flip
  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // Handle edit toggle
  const handleEditToggle = useCallback(() => {
    setIsEditing((prev) => !prev);
    setValidationErrors({});
  }, []);

  // Handle content change with validation
  const handleContentChange = useCallback(
    (
      side: "front" | "back",
      content: string,
      t: (key: string, replacements?: Record<string, string | number>) => string
    ) => {
      const newErrors = { ...validationErrors };
      const error = validateCardContent(side, content, t);

      if (error) {
        newErrors[side] = error;
      } else {
        newErrors[side] = undefined;
      }

      setValidationErrors(newErrors);
      setCards((prev) => prev.map((card, index) => (index === currentStep ? { ...card, [side]: content } : card)));
    },
    [validationErrors, currentStep]
  );

  // Handle save edited content
  const handleSave = useCallback(async () => {
    if (cards[currentStep]) {
      const currentCard = cards[currentStep];
      const newSource = currentCard.source === "ai" ? "ai_edited" : currentCard.source;

      setCards((prev) =>
        prev.map((card, index) =>
          index === currentStep ? { ...card, status: "edited" as const, isEdited: true, source: newSource } : card
        )
      );
      setIsEditing(false);
      setValidationErrors({});
    }
  }, [cards, currentStep]);

  // Handle accept current card
  const handleAcceptCard = useCallback(() => {
    if (cards[currentStep]) {
      setCards((prev) =>
        prev.map((card, index) => (index === currentStep ? { ...card, status: "accepted" as const } : card))
      );
      if (currentStep < cards.length - 1) {
        nextCard();
      }
    }
  }, [cards, currentStep, nextCard]);

  // Handle delete current card
  const handleDeleteCard = useCallback(() => {
    if (cards[currentStep]) {
      setCards((prev) => prev.filter((_, index) => index !== currentStep));
      if (currentStep >= cards.length - 1 && currentStep > 0) {
        setCurrentStep((prev) => prev - 1);
      }
    }
  }, [cards, currentStep]);

  // Handle bulk operations
  const handleAcceptAll = useCallback(() => {
    setCards((prev) =>
      prev.map((card) => (card.status === "pending" ? { ...card, status: "accepted" as const } : card))
    );
    setShowAcceptAllDialog(false);
  }, []);

  const handleDeleteAll = useCallback(() => {
    setCards((prev) => prev.filter((card) => card.status !== "pending"));
    setShowDeleteAllDialog(false);
  }, []);

  // Handle completion
  const handleComplete = useCallback(async () => {
    const validation = validateCompletionCards(cards);
    if (!validation.isValid && validation.error) {
      setValidationError(validation.error);
      return;
    }

    try {
      setValidationError(null);
      setIsProcessing(true);

      const acceptedOrEditedCards = cards.filter((card) => card.status === "accepted" || card.status === "edited");
      const savedCards: ReviewCardVM[] = [];

      for (const card of acceptedOrEditedCards) {
        const createRequest = {
          front: card.front,
          back: card.back,
          deckId,
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

        const savedCard = await response.json();
        const reviewCard: ReviewCardVM = {
          ...card,
          ...savedCard,
          status: card.status,
          isEdited: card.isEdited,
        };
        savedCards.push(reviewCard);
      }

      onComplete(savedCards);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Failed to complete review");
    } finally {
      setIsProcessing(false);
    }
  }, [cards, deckId, onComplete]);

  const currentCard = cards[currentStep];
  const cardStatuses = cards.map((card) => card.status);
  const hasPendingCards = cards.some((card) => card.status === "pending");
  const hasAcceptedCards = cards.some((card) => card.status === "accepted" || card.status === "edited");

  return {
    // State
    cards,
    currentCard,
    currentStep,
    isFlipped,
    isEditing,
    validationErrors,
    validationError,
    showAcceptAllDialog,
    showDeleteAllDialog,
    isProcessing,
    cardStatuses,
    hasPendingCards,
    hasAcceptedCards,

    // Actions
    nextCard,
    previousCard,
    goToCard,
    handleFlip,
    handleEditToggle,
    handleContentChange,
    handleSave,
    handleAcceptCard,
    handleDeleteCard,
    handleAcceptAll,
    handleDeleteAll,
    handleComplete,
    setShowAcceptAllDialog,
    setShowDeleteAllDialog,
    setValidationError,
  };
}
