import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/react";
import type { FlashcardVM } from "@/types";

interface EditFlashcardDialogProps {
  card: FlashcardVM | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (cardId: string, updates: { front: string; back: string }) => Promise<void>;
}

function EditFlashcardDialogInner({
  card,
  isOpen,
  setIsOpen,
  onSave,
}: {
  card: FlashcardVM | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (cardId: string, updates: { front: string; back: string }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when card changes
  useEffect(() => {
    if (card) {
      setFront(card.front);
      setBack(card.back);
      setError(null);
    }
  }, [card]);

  const handleSave = async () => {
    if (!card) return;

    // Validation
    const trimmedFront = front.trim();
    const trimmedBack = back.trim();

    if (!trimmedFront) {
      setError(t("flashcards.frontRequired", { defaultValue: "Front content is required" }));
      return;
    }

    if (!trimmedBack) {
      setError(t("flashcards.backRequired", { defaultValue: "Back content is required" }));
      return;
    }

    if (trimmedFront.length > 1000) {
      setError(t("flashcards.frontTooLong", { defaultValue: "Front content must be less than 1000 characters" }));
      return;
    }

    if (trimmedBack.length > 1000) {
      setError(t("flashcards.backTooLong", { defaultValue: "Back content must be less than 1000 characters" }));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(card.id, {
        front: trimmedFront,
        back: trimmedBack,
      });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update flashcard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setError(null);
    // Reset to original values
    if (card) {
      setFront(card.front);
      setBack(card.back);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {t("common.edit")} {t("flashcards.title")}
          </DialogTitle>
          <DialogDescription>
            {t("flashcards.editDescription", {
              defaultValue: "Update the front and back content of this flashcard.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="front">{t("flashcards.front")}</Label>
            <Textarea
              id="front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder={t("flashcards.frontPlaceholder", { defaultValue: "Enter the question or prompt" })}
              rows={3}
              maxLength={1000}
              disabled={isLoading}
            />
            <div className="text-xs text-muted-foreground">{front.length}/1000</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="back">{t("flashcards.back")}</Label>
            <Textarea
              id="back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder={t("flashcards.backPlaceholder", { defaultValue: "Enter the answer or explanation" })}
              rows={3}
              maxLength={1000}
              disabled={isLoading}
            />
            <div className="text-xs text-muted-foreground">{back.length}/1000</div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditFlashcardDialog({ card, isOpen, setIsOpen, onSave }: EditFlashcardDialogProps) {
  return <EditFlashcardDialogInner card={card} isOpen={isOpen} setIsOpen={setIsOpen} onSave={onSave} />;
}
