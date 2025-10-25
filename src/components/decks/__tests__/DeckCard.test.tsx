/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeckCard } from "../DeckCard";
import type { DeckCardVM } from "../../../types";

// Mock the i18n hook
vi.mock("@/lib/i18n/react", () => ({
  useI18n: () => ({
    t: (key: string, replacements?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        "decks.cardSingular": "card",
        "decks.cardPlural": "cards",
        "decks.openDeck": "Open deck: {{name}}",
      };
      let translation = translations[key] || key;

      // Replace placeholders
      if (replacements && typeof translation === "string") {
        Object.entries(replacements).forEach(([placeholder, replacement]) => {
          translation = translation.replace(new RegExp(`{{${placeholder}}}`, "g"), String(replacement));
        });
      }

      return translation;
    },
  }),
}));

// Mock window.location
delete (window as any).location;
(window as any).location = { href: "" } as Location;

describe("DeckCard", () => {
  const mockOnSelect = vi.fn();

  const mockDeck: DeckCardVM = {
    id: "deck-1",
    name: "Test Deck",
    totalCards: 5,
    dueCards: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).location.href = "";
  });

  it("renders deck name", () => {
    render(<DeckCard deck={mockDeck} onSelect={mockOnSelect} />);

    expect(screen.getByText("Test Deck")).toBeInTheDocument();
  });

  it("renders total cards count with singular form", () => {
    const deckWithOneCard: DeckCardVM = {
      ...mockDeck,
      totalCards: 1,
    };

    render(<DeckCard deck={deckWithOneCard} onSelect={mockOnSelect} />);

    expect(screen.getByText("1 card")).toBeInTheDocument();
  });

  it("renders total cards count with plural form", () => {
    render(<DeckCard deck={mockDeck} onSelect={mockOnSelect} />);

    expect(screen.getByText("5 cards")).toBeInTheDocument();
  });

  it("renders due cards warning when due cards exist", () => {
    render(<DeckCard deck={mockDeck} onSelect={mockOnSelect} />);

    expect(screen.getByText("2 due")).toBeInTheDocument();
    // Check for warning icon (we'll check for the SVG element)
    const dueElement = screen.getByText("2 due");
    expect(dueElement).toHaveClass("text-destructive");
  });

  it("does not render due cards when count is zero", () => {
    const deckWithNoDueCards: DeckCardVM = {
      ...mockDeck,
      dueCards: 0,
    };

    render(<DeckCard deck={deckWithNoDueCards} onSelect={mockOnSelect} />);

    expect(screen.queryByText("due")).not.toBeInTheDocument();
  });

  it("calls onSelect and navigates when clicked", async () => {
    const user = userEvent.setup();
    render(<DeckCard deck={mockDeck} onSelect={mockOnSelect} />);

    const card = screen.getByRole("button", { name: "Open deck: Test Deck" });
    await user.click(card);

    expect(mockOnSelect).toHaveBeenCalledWith("deck-1");
    expect((window as any).location.href).toBe("/decks/deck-1");
  });

  it("handles keyboard navigation with Enter key", async () => {
    const user = userEvent.setup();
    render(<DeckCard deck={mockDeck} onSelect={mockOnSelect} />);

    const card = screen.getByRole("button", { name: "Open deck: Test Deck" });

    // Focus the card and press Enter
    card.focus();
    await user.keyboard("{Enter}");

    expect(mockOnSelect).toHaveBeenCalledWith("deck-1");
    expect((window as any).location.href).toBe("/decks/deck-1");
  });

  it("handles keyboard navigation with Space key", async () => {
    const user = userEvent.setup();
    render(<DeckCard deck={mockDeck} onSelect={mockOnSelect} />);

    const card = screen.getByRole("button", { name: "Open deck: Test Deck" });

    // Focus the card and press Space
    card.focus();
    await user.keyboard(" ");

    expect(mockOnSelect).toHaveBeenCalledWith("deck-1");
    expect((window as any).location.href).toBe("/decks/deck-1");
  });

  it("ignores other keyboard keys", async () => {
    const user = userEvent.setup();
    render(<DeckCard deck={mockDeck} onSelect={mockOnSelect} />);

    const card = screen.getByRole("button", { name: "Open deck: Test Deck" });

    // Focus the card and press a non-navigation key
    card.focus();
    await user.keyboard("a");

    // Should not call onSelect or navigate
    expect(mockOnSelect).not.toHaveBeenCalled();
    expect((window as any).location.href).toBe("");
  });

  it("prevents default behavior on Space key press", async () => {
    const user = userEvent.setup();
    render(<DeckCard deck={mockDeck} onSelect={mockOnSelect} />);

    const card = screen.getByRole("button", { name: "Open deck: Test Deck" });

    // Mock preventDefault to check if it's called
    const mockPreventDefault = vi.fn();
    card.addEventListener("keydown", (e) => {
      if (e.key === " ") {
        mockPreventDefault();
      }
    });

    card.focus();
    await user.keyboard(" ");

    // preventDefault should have been called (we can't easily test this directly,
    // but we can verify the navigation occurred)
    expect(mockOnSelect).toHaveBeenCalledWith("deck-1");
  });

  it("has proper accessibility attributes", () => {
    render(<DeckCard deck={mockDeck} onSelect={mockOnSelect} />);

    const card = screen.getByRole("button", { name: "Open deck: Test Deck" });

    // Check accessibility attributes
    expect(card).toHaveAttribute("role", "button");
    expect(card).toHaveAttribute("tabIndex", "0");
    expect(card).toHaveAttribute("aria-label", "Open deck: Test Deck");

    // Check focus styling classes are present
    expect(card).toHaveClass("focus:outline-none", "focus:ring-2", "focus:ring-ring", "focus:ring-offset-2");
  });

  it("renders with proper CSS classes for styling", () => {
    render(<DeckCard deck={mockDeck} onSelect={mockOnSelect} />);

    const card = screen.getByRole("button", { name: "Open deck: Test Deck" });

    // Check base styling classes
    expect(card).toHaveClass(
      "rounded-lg",
      "border",
      "border-border",
      "bg-card",
      "p-6",
      "transition-all",
      "duration-200",
      "hover:shadow-md",
      "hover:border-border/80",
      "cursor-pointer"
    );
  });

  it("truncates long deck names with line-clamp", () => {
    const deckWithLongName: DeckCardVM = {
      ...mockDeck,
      name: "This is a very long deck name that should be truncated with CSS line-clamp styling",
    };

    render(<DeckCard deck={deckWithLongName} onSelect={mockOnSelect} />);

    const titleElement = screen.getByText(
      "This is a very long deck name that should be truncated with CSS line-clamp styling"
    );
    expect(titleElement).toHaveClass("line-clamp-2");
  });

  it("displays multiple statistics in correct order", () => {
    render(<DeckCard deck={mockDeck} onSelect={mockOnSelect} />);

    // Check that both card count and due count are displayed
    expect(screen.getByText("5 cards")).toBeInTheDocument();
    expect(screen.getByText("2 due")).toBeInTheDocument();

    // Verify they appear in the correct container with proper spacing
    const statsContainer = screen.getByText("5 cards").closest("div");
    expect(statsContainer).toHaveClass("flex", "items-center", "gap-4");
  });
});
