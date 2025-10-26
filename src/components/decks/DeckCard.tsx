import React from "react";
import { useI18n } from "@/lib/i18n/react";
import type { DeckCardVM } from "../../types";

interface DeckCardProps {
  deck: DeckCardVM;
  onSelect: (id: string) => void;
}

/**
 * Interactive card component for displaying a deck
 * Handles both click and keyboard navigation
 */
export function DeckCard({ deck, onSelect }: DeckCardProps) {
  const { t } = useI18n();

  // Simple pluralization helper
  const getCardText = (count: number) => {
    if (count === 1) {
      return t("decks.cardSingular");
    }
    return t("decks.cardPlural");
  };

  const handleSelect = () => {
    onSelect(deck.id);
    // Use window.location for navigation in Astro
    window.location.href = `/decks/${deck.id}`;
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyPress={handleKeyPress}
      className="rounded-lg border border-border bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-border/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
      aria-label={t("decks.openDeck", { name: deck.name })}
      data-testid={`deck-card-${deck.id}`}
    >
      <h3 className="mb-3 text-lg font-semibold text-card-foreground line-clamp-2">{deck.name}</h3>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            {deck.totalCards} {getCardText(deck.totalCards)}
          </span>

          {deck.dueCards > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              {deck.dueCards} due
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
