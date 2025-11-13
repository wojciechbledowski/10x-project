import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";
import { StepperNavigation } from "./StepperNavigation";
import { CardReviewContent } from "./CardReviewContent";
import { CardActions } from "./CardActions";
import type { GeneratedCardsReviewModalProps, ReviewCardVM, FlashcardResponse } from "@/types";

function GeneratedCardsReviewModalInner({
  flashcards,
  deckId,
  isOpen,
  onClose,
  onComplete,
}: GeneratedCardsReviewModalProps) {
  const { t } = useI18n();
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ front?: string; back?: string }>({});
  const [showAcceptAllDialog, setShowAcceptAllDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Local error state for validation errors
  const [validationError, setValidationError] = useState<string | null>(null);

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
    setCurrentStep(0); // Reset to first card
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

  // Handle modal close with confirmation if editing
  const handleClose = useCallback(() => {
    if (isEditing) {
      const confirmed = window.confirm(t("review.generated.confirmCloseEditing"));
      if (!confirmed) return;
    }
    onClose();
  }, [isEditing, onClose, t]);

  // Navigation functions
  const nextCard = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, cards.length - 1));
  }, [cards.length]);

  const previousCard = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToCard = useCallback((step: number) => {
    setCurrentStep(step);
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
    (side: "front" | "back", content: string) => {
      const trimmed = content.trim();
      const errors = { ...validationErrors };

      if (side === "front") {
        if (!trimmed) {
          errors.front = t("common.validation.required");
        } else if (trimmed.length > 1000) {
          errors.front = t("common.validation.maxLength", { max: 1000 });
        } else {
          delete errors.front;
        }
      } else {
        if (!trimmed) {
          errors.back = t("common.validation.required");
        } else if (trimmed.length > 1000) {
          errors.back = t("common.validation.maxLength", { max: 1000 });
        } else {
          delete errors.back;
        }
      }

      setValidationErrors(errors);

      setCards((prev) => prev.map((card, index) => (index === currentStep ? { ...card, [side]: content } : card)));
    },
    [validationErrors, t, currentStep]
  );

  // Handle save edited content
  const handleSave = useCallback(async () => {
    if (cards[currentStep]) {
      const currentCard = cards[currentStep];

      // If the card was originally "ai" and is now being edited, change source to "ai_edited"
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
      // Automatically go to next card if not the last one
      if (currentStep < cards.length - 1) {
        nextCard();
      }
    }
  }, [cards, currentStep, nextCard]);

  // Handle edit current card
  const handleEditCard = useCallback(() => {
    handleEditToggle();
  }, [handleEditToggle]);

  // Handle delete current card
  const handleDeleteCard = useCallback(() => {
    if (cards[currentStep]) {
      setCards((prev) => prev.filter((_, index) => index !== currentStep));
      // Adjust current step if necessary
      if (currentStep >= cards.length - 1 && currentStep > 0) {
        setCurrentStep((prev) => prev - 1);
      }
    }
  }, [cards, currentStep]);

  // Handle bulk operations
  const handleAcceptAll = useCallback(async () => {
    setCards((prev) =>
      prev.map((card) => (card.status === "pending" ? { ...card, status: "accepted" as const } : card))
    );
    setShowAcceptAllDialog(false);
  }, []);

  const handleDeleteAll = useCallback(async () => {
    setCards((prev) => prev.filter((card) => card.status !== "pending"));
    setShowDeleteAllDialog(false);
  }, []);

  // Get current card for keyboard handling
  const currentCard = cards[currentStep];

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          if (isEditing) {
            setIsEditing(false);
          } else {
            handleClose();
          }
          break;
        case "ArrowLeft":
          if (!isEditing && currentStep > 0) {
            e.preventDefault();
            previousCard();
          }
          break;
        case "ArrowRight":
          if (!isEditing && currentStep < cards.length - 1) {
            e.preventDefault();
            nextCard();
          }
          break;
        case "ArrowUp":
        case "ArrowDown":
          if (!isEditing) {
            e.preventDefault();
            setIsFlipped((prev) => !prev);
          }
          break;
        case "Enter":
          if (!isEditing && !isProcessing && currentCard?.status === "pending") {
            e.preventDefault();
            handleAcceptCard();
          }
          break;
        case " ":
          if (!isEditing) {
            e.preventDefault();
            setIsFlipped((prev) => !prev);
          }
          break;
      }
    },
    [
      isOpen,
      isEditing,
      isProcessing,
      handleClose,
      previousCard,
      nextCard,
      handleAcceptCard,
      currentCard,
      currentStep,
      cards.length,
    ]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Handle completion
  const handleComplete = useCallback(async () => {
    // Validate all accepted/edited cards have valid content
    const acceptedOrEditedCards = cards.filter((card) => card.status === "accepted" || card.status === "edited");

    for (const card of acceptedOrEditedCards) {
      const frontTrimmed = card.front.trim();
      const backTrimmed = card.back.trim();

      if (!frontTrimmed || frontTrimmed.length > 1000) {
        setValidationError(`Card "${frontTrimmed.substring(0, 50)}..." has invalid front content`);
        return;
      }

      if (!backTrimmed || backTrimmed.length > 1000) {
        setValidationError(`Card "${frontTrimmed.substring(0, 50)}..." has invalid back content`);
        return;
      }
    }

    try {
      // Clear any existing errors and save accepted/edited cards
      setValidationError(null);
      setIsProcessing(true);

      // Save accepted/edited cards to database
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

        const savedCard: FlashcardResponse = await response.json();
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

  // Get card statuses for stepper
  const cardStatuses = cards.map((card) => card.status);

  // Check if there are pending cards
  const hasPendingCards = cards.some((card) => card.status === "pending");

  // Check if any cards are accepted
  const hasAcceptedCards = cards.some((card) => card.status === "accepted" || card.status === "edited");

  if (validationError) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("common.validationError")}</DialogTitle>
            <DialogDescription>{validationError}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setValidationError(null)} variant="outline">
              {t("common.ok")}
            </Button>
            <Button onClick={handleClose}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!cards.length) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("review.generated.noCards")}</DialogTitle>
            <DialogDescription>{t("review.generated.noCardsDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleClose}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle>{t("review.generated.title")}</DialogTitle>
                <DialogDescription className="text-sm">{t("review.generated.description")}</DialogDescription>
              </div>
              <div className="text-sm font-medium text-muted-foreground whitespace-nowrap ml-4">
                {t("review.generated.cardProgress", { current: currentStep + 1, total: cards.length })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-6 overflow-hidden py-2">
            {/* Stepper Navigation */}
            <StepperNavigation
              currentStep={currentStep}
              totalSteps={cards.length}
              onStepChange={(step) => {
                // Navigate to the specified step
                goToCard(step);
                // Reset flip state when changing cards
                setIsFlipped(false);
                setIsEditing(false);
                setValidationErrors({});
              }}
              cardStatuses={cardStatuses}
            />

            {/* Card Review Content */}
            <div className="flex-1 overflow-hidden min-h-0">
              <CardReviewContent
                card={currentCard}
                isFlipped={isFlipped}
                isEditing={isEditing}
                onFlip={handleFlip}
                onEditToggle={handleEditToggle}
                onContentChange={handleContentChange}
                onSave={handleSave}
                validationErrors={validationErrors}
              />
            </div>

            {/* Card Actions */}
            <CardActions
              cardId={currentCard.id}
              status={currentCard.status}
              isEditing={isEditing}
              onAccept={handleAcceptCard}
              onEdit={handleEditCard}
              onDelete={handleDeleteCard}
              isProcessing={isProcessing}
            />
          </div>

          <DialogFooter className="flex items-center justify-between gap-4">
            {/* Bulk Actions */}
            <div className="flex gap-2">
              {hasPendingCards && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowAcceptAllDialog(true)}
                    disabled={isProcessing}
                    className="min-w-[100px]"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("review.generated.acceptAll")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteAllDialog(true)}
                    disabled={isProcessing}
                    className="hover:bg-red-50 hover:border-red-200 hover:text-red-700 min-w-[100px]"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("review.generated.deleteAll")}
                  </Button>
                </>
              )}
            </div>

            {/* Complete Button */}
            <Button onClick={handleComplete} disabled={!hasAcceptedCards || isProcessing} className="min-w-[140px]">
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {t("review.generated.completeReview")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept All Confirmation Dialog */}
      <AlertDialog open={showAcceptAllDialog} onOpenChange={setShowAcceptAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("review.generated.acceptAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("review.generated.acceptAllDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptAll} disabled={isProcessing}>
              {isProcessing ? t("common.processing") : t("review.generated.acceptAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("review.generated.deleteAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("review.generated.deleteAllDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? t("common.deleting") : t("review.generated.deleteAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function GeneratedCardsReviewModal(props: GeneratedCardsReviewModalProps) {
  return <GeneratedCardsReviewModalInner {...props} />;
}
