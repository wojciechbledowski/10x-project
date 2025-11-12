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
import { useGeneratedCardsReview } from "../hooks/useGeneratedCardsReview";
import type { GeneratedCardsReviewModalProps } from "@/types";

function GeneratedCardsReviewModalInner({ batchId, isOpen, onClose, onComplete }: GeneratedCardsReviewModalProps) {
  const { t } = useI18n();
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ front?: string; back?: string }>({});
  const [showAcceptAllDialog, setShowAcceptAllDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const {
    batch, // eslint-disable-line @typescript-eslint/no-unused-vars
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
  } = useGeneratedCardsReview();

  // Local error state for validation errors
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load batch when modal opens
  useEffect(() => {
    if (isOpen && batchId) {
      loadBatch(batchId);
    }
  }, [isOpen, batchId, loadBatch]);

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
      const confirmed = window.confirm(t("review.confirmCloseEditing"));
      if (!confirmed) return;
    }
    onClose();
  }, [isEditing, onClose, t]);

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
          if (!isEditing) {
            e.preventDefault();
            previousCard();
          }
          break;
        case "ArrowRight":
          if (!isEditing) {
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
            acceptCard(currentCard.id);
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
    [isOpen, isEditing, isProcessing, handleClose, previousCard, nextCard, acceptCard, currentCard]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
    },
    [validationErrors, t]
  );

  // Handle save edited content
  const handleSave = useCallback(async () => {
    if (cards[currentStep]) {
      await editCard(cards[currentStep].id, {
        front: cards[currentStep].front,
        back: cards[currentStep].back,
      });
      setIsEditing(false);
      setValidationErrors({});
    }
  }, [cards, currentStep, editCard]);

  // Handle accept current card
  const handleAcceptCard = useCallback(() => {
    if (cards[currentStep]) {
      acceptCard(cards[currentStep].id);
    }
  }, [cards, currentStep, acceptCard]);

  // Handle edit current card
  const handleEditCard = useCallback(() => {
    handleEditToggle();
  }, [handleEditToggle]);

  // Handle delete current card
  const handleDeleteCard = useCallback(() => {
    if (cards[currentStep]) {
      deleteCard(cards[currentStep].id);
    }
  }, [cards, currentStep, deleteCard]);

  // Handle bulk operations
  const handleAcceptAll = useCallback(async () => {
    await acceptAllCards();
    setShowAcceptAllDialog(false);
  }, [acceptAllCards]);

  const handleDeleteAll = useCallback(async () => {
    await deleteAllCards();
    setShowDeleteAllDialog(false);
  }, [deleteAllCards]);

  // Handle completion
  const handleComplete = useCallback(() => {
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

    // Clear any existing errors and complete
    setValidationError(null);
    const acceptedCards = completeReview();
    onComplete(acceptedCards);
  }, [cards, completeReview, onComplete]);

  // Get card statuses for stepper
  const cardStatuses = cards.map((card) => card.status);

  // Check if there are pending cards
  const hasPendingCards = cards.some((card) => card.status === "pending");

  // Check if any cards are accepted
  const hasAcceptedCards = cards.some((card) => card.status === "accepted" || card.status === "edited");

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("review.loadingCards")}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("common.error")}</DialogTitle>
            <DialogDescription>{error}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleClose}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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
            <DialogTitle>{t("review.noCards")}</DialogTitle>
            <DialogDescription>{t("review.noCardsDescription")}</DialogDescription>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{t("review.title")}</DialogTitle>
                <DialogDescription>
                  {t("review.description", { current: currentStep + 1, total: cards.length })}
                </DialogDescription>
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

          <div className="flex flex-col space-y-6 overflow-hidden">
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
            <div className="flex-1 overflow-hidden">
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

          <DialogFooter className="flex items-center justify-between">
            {/* Bulk Actions */}
            <div className="flex space-x-2">
              {hasPendingCards && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAcceptAllDialog(true)}
                    disabled={isProcessing}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("review.acceptAll")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteAllDialog(true)}
                    disabled={isProcessing}
                    className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("review.deleteAll")}
                  </Button>
                </>
              )}
            </div>

            {/* Complete Button */}
            <Button onClick={handleComplete} disabled={!hasAcceptedCards || isProcessing} size="sm">
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {t("review.complete_review")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept All Confirmation Dialog */}
      <AlertDialog open={showAcceptAllDialog} onOpenChange={setShowAcceptAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("review.acceptAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("review.acceptAllDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptAll} disabled={isProcessing}>
              {isProcessing ? t("common.processing") : t("review.acceptAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("review.deleteAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("review.deleteAllDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? t("common.deleting") : t("review.deleteAll")}
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
