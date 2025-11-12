import { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Edit3, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";
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

  // Character counters
  const frontChars = tempFront.length;
  const backChars = tempBack.length;
  const maxChars = 1000;

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Card Display */}
      <div
        className="relative w-full max-w-md h-80 cursor-pointer"
        onClick={onFlip}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={isFlipped ? t("flashcards.back") : t("flashcards.front")}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front Side */}
          <div
            className={`absolute inset-0 w-full h-full rounded-lg border border-border bg-card p-6 shadow-lg ${
              isEditing ? "ring-2 ring-primary" : ""
            }`}
            style={{
              backfaceVisibility: "hidden",
            }}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">{t("flashcards.front")}</h3>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditToggle();
                    }}
                    className="h-8 w-8 p-0"
                    aria-label={t("common.edit")}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex-1 flex flex-col">
                {isEditing ? (
                  <div className="flex-1 flex flex-col space-y-2">
                    <Textarea
                      value={tempFront}
                      onChange={(e) => handleContentChange("front", e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={t("flashcards.frontPlaceholder")}
                      className={`flex-1 resize-none ${validationErrors?.front ? "border-destructive" : ""}`}
                      maxLength={maxChars}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className={frontChars > maxChars * 0.9 ? "text-destructive" : ""}>
                        {frontChars}/{maxChars}
                      </span>
                      {validationErrors?.front && <span className="text-destructive">{validationErrors.front}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-center text-foreground whitespace-pre-wrap">
                      {card.front || t("flashcards.emptyFront")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Back Side */}
          <div
            className={`absolute inset-0 w-full h-full rounded-lg border border-border bg-card p-6 shadow-lg ${
              isEditing ? "ring-2 ring-primary" : ""
            }`}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">{t("flashcards.back")}</h3>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditToggle();
                    }}
                    className="h-8 w-8 p-0"
                    aria-label={t("common.edit")}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex-1 flex flex-col">
                {isEditing ? (
                  <div className="flex-1 flex flex-col space-y-2">
                    <Textarea
                      value={tempBack}
                      onChange={(e) => handleContentChange("back", e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={t("flashcards.backPlaceholder")}
                      className={`flex-1 resize-none ${validationErrors?.back ? "border-destructive" : ""}`}
                      maxLength={maxChars}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className={backChars > maxChars * 0.9 ? "text-destructive" : ""}>
                        {backChars}/{maxChars}
                      </span>
                      {validationErrors?.back && <span className="text-destructive">{validationErrors.back}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-center text-foreground whitespace-pre-wrap">
                      {card.back || t("flashcards.emptyBack")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Flip indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-1">
            <div className={`w-2 h-2 rounded-full ${!isFlipped ? "bg-primary" : "bg-muted"}`} />
            <div className={`w-2 h-2 rounded-full ${isFlipped ? "bg-primary" : "bg-muted"}`} />
          </div>
        </div>
      </div>

      {/* Edit Actions */}
      {isEditing && (
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !!validationErrors?.front || !!validationErrors?.back}
          >
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      )}

      {/* Instructions */}
      <div className="text-center text-sm text-muted-foreground">
        <p>{t("review.clickToFlip")}</p>
        {isEditing && <p>{t("review.enterToSave")}</p>}
      </div>
    </div>
  );
}

export function CardReviewContent(props: CardReviewContentProps) {
  return <CardReviewContentInner {...props} />;
}
