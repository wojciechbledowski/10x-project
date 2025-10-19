import React from "react";
import { DeckCard } from "./DeckCard";
import type { DeckCardVM } from "../../types";

interface DeckGridProps {
  decks: DeckCardVM[];
  onSelect: (id: string) => void;
}

/**
 * Responsive grid wrapper for deck cards
 * Displays cards in a responsive grid layout
 */
export function DeckGrid({ decks, onSelect }: DeckGridProps) {
  if (decks.length === 0) {
    return null; // EmptyState will be rendered separately
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="grid" aria-label="Deck collection">
      {decks.map((deck) => (
        <div key={deck.id} role="gridcell">
          <DeckCard deck={deck} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}
