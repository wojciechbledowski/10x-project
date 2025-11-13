import { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";
import { StepperNavigation } from "./StepperNavigation";
import { CardReviewContent } from "./CardReviewContent";
import { CardActions } from "./CardActions";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { ReviewConfirmationDialogs } from "./ReviewConfirmationDialogs";
import { useGeneratedCardsModalState } from "@/components/hooks/useGeneratedCardsModalState";
import { useModalKeyboardNavigation } from "@/components/hooks/useModalKeyboardNavigation";
import type { GeneratedCardsReviewModalProps } from "@/types";

function GeneratedCardsReviewModalInner({
  flashcards,
  deckId,
  isOpen,
  onClose,
  onComplete,
}: GeneratedCardsReviewModalProps) {
  const { t } = useI18n();

  // Use custom hooks for state management
  const modalState = useGeneratedCardsModalState({
    flashcards,
    deckId,
    isOpen,
    onComplete,
  });

  const {
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
  } = modalState;

  // Handle modal close with confirmation if editing
  const handleClose = useCallback(() => {
    if (isEditing) {
      const confirmed = window.confirm(t("review.generated.confirmCloseEditing"));
      if (!confirmed) return;
    }
    onClose();
  }, [isEditing, onClose, t]);

  // Handle edit current card
  const handleEditCard = useCallback(() => {
    handleEditToggle();
  }, [handleEditToggle]);

  // Setup keyboard navigation
  useModalKeyboardNavigation({
    isOpen,
    isEditing,
    isProcessing,
    currentStep,
    totalCards: cards.length,
    canAccept: currentCard?.status === "pending",
    onClose: handleClose,
    onPrevious: previousCard,
    onNext: nextCard,
    onFlip: handleFlip,
    onAccept: handleAcceptCard,
    onCancelEdit: handleEditToggle,
  });

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
              onStepChange={goToCard}
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
                onContentChange={(side, content) => handleContentChange(side, content, t)}
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
            <BulkActionsToolbar
              hasPendingCards={hasPendingCards}
              isProcessing={isProcessing}
              onAcceptAll={() => setShowAcceptAllDialog(true)}
              onDeleteAll={() => setShowDeleteAllDialog(true)}
            />

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

      {/* Confirmation Dialogs */}
      <ReviewConfirmationDialogs
        showAcceptAllDialog={showAcceptAllDialog}
        showDeleteAllDialog={showDeleteAllDialog}
        isProcessing={isProcessing}
        onAcceptAll={handleAcceptAll}
        onDeleteAll={handleDeleteAll}
        onAcceptAllDialogChange={setShowAcceptAllDialog}
        onDeleteAllDialogChange={setShowDeleteAllDialog}
      />
    </>
  );
}

export function GeneratedCardsReviewModal(props: GeneratedCardsReviewModalProps) {
  return <GeneratedCardsReviewModalInner {...props} />;
}
