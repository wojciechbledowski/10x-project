import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";
import type { GenerateFlashcardsRequest, GenerateFlashcardsResponse } from "@/types";

interface GenerateFlashcardsDialogProps {
  deckId: string;
  onGenerationComplete: (batchId: string) => void;
}

function GenerateFlashcardsDialogInner({ deckId, onGenerationComplete }: GenerateFlashcardsDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minLength = 1000;
  const maxLength = 10000;
  const currentLength = sourceText.length;
  const isValidLength = currentLength >= minLength && currentLength <= maxLength;

  const handleGenerate = async () => {
    if (!isValidLength) return;

    setIsLoading(true);
    setError(null);

    try {
      const requestBody: GenerateFlashcardsRequest = {
        deckId,
        sourceText: sourceText.trim(),
      };

      const response = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to generate flashcards");
      }

      const data: GenerateFlashcardsResponse = await response.json();

      // Close the dialog and notify parent of completion
      setOpen(false);
      setSourceText("");
      onGenerationComplete(data.batchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Sparkles className="mr-2 h-4 w-4" />
          {t("flashcards.generateFlashcards")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("flashcards.generateFlashcards")}
          </DialogTitle>
          <DialogDescription>{t("flashcards.generateDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="source-text" className="text-sm font-medium">
              {t("flashcards.sourceText")}
            </Label>
            <Textarea
              id="source-text"
              placeholder={t("flashcards.sourceTextPlaceholder")}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="mt-2 min-h-[200px] resize-none"
              maxLength={maxLength}
              disabled={isLoading}
            />
            <div className="mt-2 flex items-center justify-between text-sm">
              <span
                className={
                  currentLength < minLength || currentLength > maxLength ? "text-destructive" : "text-muted-foreground"
                }
              >
                {currentLength}/{maxLength} {t("common.characters")}
              </span>
              {currentLength < minLength && (
                <span className="text-destructive">{t("common.validation.minLength", { min: minLength })}</span>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="rounded-md bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">{t("flashcards.generationTips")}</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {t("flashcards.tip1")}</li>
              <li>• {t("flashcards.tip2")}</li>
              <li>• {t("flashcards.tip3")}</li>
              <li>• {t("flashcards.tip4")}</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleGenerate} disabled={!isValidLength || isLoading} className="min-w-[120px]">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("flashcards.generating")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {t("flashcards.generate")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GenerateFlashcardsDialog(props: GenerateFlashcardsDialogProps) {
  return <GenerateFlashcardsDialogInner {...props} />;
}
