import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { I18nProvider, useI18n } from "@/lib/i18n/react";
import { useDeckSettings } from "@/components/hooks/useDeckSettings";
import type { Language } from "@/lib/i18n/config";

interface DeckSettingsFormProps {
  deckId: string;
  lang: Language;
}

function DeckSettingsFormInner({ deckId }: { deckId: string }) {
  const { t } = useI18n();
  const { deck, isLoadingDeck, updateDeckName, isUpdating, error: hookError } = useDeckSettings(deckId);
  const [deckName, setDeckName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync deckName with deck data when it loads
  useEffect(() => {
    if (deck) {
      setDeckName(deck.name);
      // Set initial page title
      if (typeof window !== "undefined") {
        document.title = `${deck.name} - Flashcard App`;

        // Update header title with a small delay to ensure Header component is hydrated
        setTimeout(() => {
          const headerTitle = document.querySelector("h1");
          if (headerTitle) {
            headerTitle.textContent = deck.name;
          }
        }, 50);
      }
    }
  }, [deck]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deckName.trim()) {
      setLocalError(t("settings.deckNameRequired", { defaultValue: "Deck name is required" }));
      return;
    }

    if (deckName.length > 255) {
      setLocalError(t("settings.deckNameTooLong", { defaultValue: "Deck name must be less than 255 characters" }));
      return;
    }

    setLocalError(null);

    try {
      await updateDeckName(deckName.trim());
      // Update page title directly
      if (typeof window !== "undefined") {
        const newTitle = deckName.trim();
        document.title = `${newTitle} - Flashcard App`;

        // Update header title with a small delay to ensure Header component is hydrated
        setTimeout(() => {
          const headerTitle = document.querySelector("h1");
          if (headerTitle) {
            headerTitle.textContent = newTitle;
          }
        }, 50);
      }
    } catch {
      // Error is handled by the hook
    }
  };

  if (isLoadingDeck) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-muted rounded mb-4"></div>
          <div className="h-10 bg-muted rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-destructive">
          {hookError || t("settings.loadDeckError", { defaultValue: "Failed to load deck" })}
        </p>
      </div>
    );
  }

  const hasChanges = deckName.trim() !== deck.name;
  const isValid = deckName.trim().length > 0 && deckName.length <= 255;
  const error = localError || hookError;

  return (
    <div className="rounded-lg border border-border bg-card p-6" data-testid="deck-settings-form">
      <h3 className="mb-4 text-lg font-semibold text-card-foreground">{t("settings.deckName")}</h3>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="deck-settings-form-element">
        <div className="space-y-2">
          <Label htmlFor="deckName">{t("settings.deckName")}</Label>
          <Input
            id="deckName"
            type="text"
            value={deckName}
            onChange={(e) => {
              setDeckName(e.target.value);
              setLocalError(null);
            }}
            placeholder={t("decks.deckNamePlaceholder")}
            maxLength={255}
            disabled={isUpdating}
            data-testid="deck-name-input"
          />
          {error && (
            <p className="text-sm text-destructive" role="alert" data-testid="deck-settings-error">
              {error}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={!hasChanges || !isValid || isUpdating}
          className="w-full sm:w-auto"
          data-testid="deck-settings-save-button"
        >
          {isUpdating ? t("common.saving") : t("common.save")}
        </Button>
      </form>
    </div>
  );
}

export function DeckSettingsForm({ deckId, lang }: DeckSettingsFormProps) {
  return (
    <I18nProvider lang={lang}>
      <DeckSettingsFormInner deckId={deckId} />
    </I18nProvider>
  );
}
