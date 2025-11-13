import { useEffect, useCallback } from "react";

interface UseModalKeyboardNavigationProps {
  isOpen: boolean;
  isEditing: boolean;
  isProcessing: boolean;
  currentStep: number;
  totalCards: number;
  canAccept: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onFlip: () => void;
  onAccept: () => void;
  onCancelEdit: () => void;
}

/**
 * Hook for handling keyboard shortcuts in modal dialogs
 */
export function useModalKeyboardNavigation({
  isOpen,
  isEditing,
  isProcessing,
  currentStep,
  totalCards,
  canAccept,
  onClose,
  onPrevious,
  onNext,
  onFlip,
  onAccept,
  onCancelEdit,
}: UseModalKeyboardNavigationProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          if (isEditing) {
            onCancelEdit();
          } else {
            onClose();
          }
          break;

        case "ArrowLeft":
          if (!isEditing && currentStep > 0) {
            e.preventDefault();
            onPrevious();
          }
          break;

        case "ArrowRight":
          if (!isEditing && currentStep < totalCards - 1) {
            e.preventDefault();
            onNext();
          }
          break;

        case "ArrowUp":
        case "ArrowDown":
          if (!isEditing) {
            e.preventDefault();
            onFlip();
          }
          break;

        case "Enter":
          if (!isEditing && !isProcessing && canAccept) {
            e.preventDefault();
            onAccept();
          }
          break;

        case " ":
          if (!isEditing) {
            e.preventDefault();
            onFlip();
          }
          break;
      }
    },
    [
      isOpen,
      isEditing,
      isProcessing,
      currentStep,
      totalCards,
      canAccept,
      onClose,
      onPrevious,
      onNext,
      onFlip,
      onAccept,
      onCancelEdit,
    ]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
