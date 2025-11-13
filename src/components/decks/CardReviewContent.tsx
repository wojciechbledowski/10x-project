import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n/react";
import { FlippableCard } from "@/components/ui/FlippableCard";
import { CardFace } from "./CardFace";
import { EditActions } from "./EditActions";
import type { CardReviewContentProps } from "@/types";

function CardReviewContentInner({
  card,
  isFlipped,
  isEditing,
  onFlip,
  onEditToggle,
  onContentChange,
  onSave,
  validationErrors,
}: CardReviewContentProps) {
  const { t } = useI18n();
  const [tempFront, setTempFront] = useState(card.front);
  const [tempBack, setTempBack] = useState(card.back);
  const [isSaving, setIsSaving] = useState(false);

  // Reset temp values when card changes
  useEffect(() => {
    setTempFront(card.front);
    setTempBack(card.back);
  }, [card.front, card.back]);

  // Handle content changes
  const handleContentChange = useCallback(
    (side: "front" | "back", value: string) => {
      if (side === "front") {
        setTempFront(value);
      } else {
        setTempBack(value);
      }
      onContentChange(side, value);
    },
    [onContentChange]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setTempFront(card.front);
    setTempBack(card.back);
    onEditToggle();
  }, [card.front, card.back, onEditToggle]);

  // Handle keyboard interactions
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        onFlip();
      } else if (e.key === "Enter" && isEditing) {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape" && isEditing) {
        e.preventDefault();
        handleCancelEdit();
      }
    },
    [onFlip, isEditing, handleSave, handleCancelEdit]
  );

  const hasValidationErrors = !!validationErrors?.front || !!validationErrors?.back;

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Flippable Card */}
      <FlippableCard
        front={
          <CardFace
            side="front"
            content={tempFront}
            isEditing={isEditing}
            onContentChange={(value) => handleContentChange("front", value)}
            onEditToggle={onEditToggle}
            onSave={handleSave}
            validationError={validationErrors?.front}
          />
        }
        back={
          <CardFace
            side="back"
            content={tempBack}
            isEditing={isEditing}
            onContentChange={(value) => handleContentChange("back", value)}
            onEditToggle={onEditToggle}
            onSave={handleSave}
            validationError={validationErrors?.back}
          />
        }
        isFlipped={isFlipped}
        onFlip={onFlip}
        onKeyDown={handleKeyDown}
        ariaLabel={isFlipped ? t("flashcards.back") : t("flashcards.front")}
      />

      {/* Edit Actions */}
      {isEditing && (
        <EditActions
          onCancel={handleCancelEdit}
          onSave={handleSave}
          isSaving={isSaving}
          hasValidationErrors={hasValidationErrors}
        />
      )}

      {/* Instructions */}
      <div className="text-center text-sm text-muted-foreground">
        <p>{t("review.generated.clickToFlip")}</p>
        {isEditing && <p>{t("review.generated.enterToSave")}</p>}
      </div>
    </div>
  );
}

export function CardReviewContent(props: CardReviewContentProps) {
  return <CardReviewContentInner {...props} />;
}
