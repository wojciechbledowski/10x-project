import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/react";

interface CreateFlashcardDialogProps {
  deckId: string;
  onSave: (front: string, back: string) => Promise<void>;
}

function CreateFlashcardDialogInner({ onSave }: CreateFlashcardDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) {
      setError(t("common.validation.required"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(front.trim(), back.trim());
      setOpen(false);
      setFront("");
      setBack("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create flashcard");
    } finally {
      setIsLoading(false);
    }
  };

  const frontChars = front.length;
  const backChars = back.length;
  const maxChars = 1000;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          {t("flashcards.addCard")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("flashcards.addCard")}</DialogTitle>
          <DialogDescription>{t("flashcards.createCardDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="front" className="text-sm font-medium">
              {t("flashcards.front")}
            </Label>
            <Textarea
              id="front"
              placeholder={t("flashcards.frontPlaceholder")}
              value={front}
              onChange={(e) => setFront(e.target.value)}
              className="mt-2 min-h-[80px] resize-none"
              maxLength={maxChars}
              disabled={isLoading}
            />
            <div className="mt-1 text-xs text-muted-foreground">
              {frontChars}/{maxChars} {t("common.characters")}
            </div>
          </div>

          <div>
            <Label htmlFor="back" className="text-sm font-medium">
              {t("flashcards.back")}
            </Label>
            <Textarea
              id="back"
              placeholder={t("flashcards.backPlaceholder")}
              value={back}
              onChange={(e) => setBack(e.target.value)}
              className="mt-2 min-h-[80px] resize-none"
              maxLength={maxChars}
              disabled={isLoading}
            />
            <div className="mt-1 text-xs text-muted-foreground">
              {backChars}/{maxChars} {t("common.characters")}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!front.trim() || !back.trim() || isLoading} className="min-w-[100px]">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("common.creating")}
              </>
            ) : (
              t("common.create")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateFlashcardDialog(props: CreateFlashcardDialogProps) {
  return <CreateFlashcardDialogInner {...props} />;
}
