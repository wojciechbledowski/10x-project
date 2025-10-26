import React, { useState, useCallback, useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDeckBodySchema } from "../../lib/decks/schemas";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/react";
import type { DeckCardVM } from "../../types";

interface CreateDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateDeck: (name: string) => Promise<DeckCardVM | null>;
}

/**
 * Modal dialog for creating a new deck
 * Includes form validation, optimistic updates, and toast notifications
 */
export function CreateDeckModal({ open, onOpenChange, onCreateDeck }: CreateDeckModalProps) {
  const { t } = useI18n();
  const nameId = useId();
  const errorId = useId();

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateName = useCallback((value: string) => {
    const result = createDeckBodySchema.safeParse({ name: value });
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Invalid name";
      setError(errorMessage);
      return false;
    }
    setError(null);
    return true;
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!validateName(name.trim())) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const newDeck = await onCreateDeck(name.trim());

        if (newDeck) {
          toast.success(t("decks.deckCreated"));
          onOpenChange(false);
          setName("");
          setError(null);
        } else {
          // Error handling is done in the useDecks hook
          // The hook will show appropriate error messages
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create deck";
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [name, validateName, onCreateDeck, onOpenChange, t]
  );

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Reset form when closing
        setName("");
        setError(null);
        setIsLoading(false);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setName(value);

      // Clear error when user starts typing
      if (error) {
        setError(null);
      }
    },
    [error]
  );

  const handleNameBlur = useCallback(() => {
    if (name.trim()) {
      validateName(name.trim());
    }
  }, [name, validateName]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="create-deck-modal">
        <DialogHeader>
          <DialogTitle>{t("decks.createNewDeck")}</DialogTitle>
          <DialogDescription>{t("decks.deckNameHelp")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="create-deck-form">
          <div className="space-y-2">
            <label
              htmlFor={nameId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t("decks.deckName")}
            </label>
            <Input
              id={nameId}
              type="text"
              placeholder={t("decks.deckNamePlaceholder")}
              value={name}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              maxLength={255}
              disabled={isLoading}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              data-testid="deck-name-input"
            />
            {error && (
              <p
                id={errorId}
                className="text-sm text-destructive"
                role="alert"
                aria-live="polite"
                data-testid="deck-name-error"
              >
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              data-testid="cancel-create-deck"
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || !!error} data-testid="submit-create-deck">
              {isLoading ? t("decks.creatingDeck") : t("decks.createDeck")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
