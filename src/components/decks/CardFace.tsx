import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Edit3 } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";

interface CardFaceProps {
  side: "front" | "back";
  content: string;
  isEditing: boolean;
  onContentChange: (value: string) => void;
  onEditToggle: () => void;
  onSave: () => void;
  validationError?: string;
  maxChars?: number;
}

/**
 * Reusable card face component for both front and back sides
 */
export function CardFace({
  side,
  content,
  isEditing,
  onContentChange,
  onEditToggle,
  onSave,
  validationError,
  maxChars = 1000,
}: CardFaceProps) {
  const { t } = useI18n();
  const charCount = content.length;
  const isOverThreshold = charCount > maxChars * 0.9;

  return (
    <div
      className={`rounded-lg border border-border bg-card p-6 shadow-lg h-full ${
        isEditing ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">{t(`flashcards.${side}`)}</h3>
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
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isEditing) {
                    e.preventDefault();
                    onSave();
                  }
                  if (isEditing) {
                    e.stopPropagation();
                  }
                }}
                placeholder={t(`flashcards.${side}Placeholder`)}
                className={`flex-1 resize-none ${validationError ? "border-destructive" : ""}`}
                maxLength={maxChars}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className={isOverThreshold ? "text-destructive" : ""}>
                  {charCount}/{maxChars}
                </span>
                {validationError && <span className="text-destructive">{validationError}</span>}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-center text-foreground whitespace-pre-wrap">
                {content || t(`flashcards.empty${side.charAt(0).toUpperCase() + side.slice(1)}`)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
