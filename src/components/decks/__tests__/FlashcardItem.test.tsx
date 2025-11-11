/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FlashcardItem } from "../FlashcardItem";
import type { FlashcardVM } from "../../../types";
import type { Language } from "@/lib/i18n/config";

// Mock the i18n hook
vi.mock("@/lib/i18n/react", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "flashcards.front": "Front",
        "flashcards.back": "Back",
        "flashcards.source.manual": "Manual",
        "flashcards.source.ai": "AI Generated",
        "flashcards.source.aiEdited": "AI Edited",
        "common.edit": "Edit",
      };
      return translations[key] || key;
    },
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the Button component
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size, className, "aria-label": ariaLabel }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      aria-label={ariaLabel}
      type="button"
      data-testid="edit-button"
    >
      {children}
    </button>
  ),
}));

// Mock lucide-react Edit icon
vi.mock("lucide-react", () => ({
  Edit: () => <svg data-testid="edit-icon" />,
}));

describe("FlashcardItem", () => {
  const mockOnEdit = vi.fn();

  const mockCard: FlashcardVM = {
    id: "card-1",
    front: "What is React?",
    back: "A JavaScript library for building user interfaces",
    source: "manual",
    nextReviewAt: null,
  };

  const defaultProps = {
    card: mockCard,
    lang: "en" as Language,
    onEdit: mockOnEdit,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders front and back text", () => {
    render(<FlashcardItem {...defaultProps} />);

    expect(screen.getByText("Front")).toBeInTheDocument();
    expect(screen.getByText("What is React?")).toBeInTheDocument();

    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.getByText("A JavaScript library for building user interfaces")).toBeInTheDocument();
  });

  it("renders manual source badge with correct styling", () => {
    render(<FlashcardItem {...defaultProps} />);

    const badge = screen.getByText("Manual");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-primary/10", "text-primary");
  });

  it("renders AI source badge with correct styling", () => {
    const aiCard: FlashcardVM = {
      ...mockCard,
      source: "ai",
    };

    render(<FlashcardItem {...defaultProps} card={aiCard} />);

    const badge = screen.getByText("AI Generated");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-secondary/50", "text-secondary-foreground");
  });

  it("renders AI edited source badge with correct styling", () => {
    const aiEditedCard: FlashcardVM = {
      ...mockCard,
      source: "ai_edited",
    };

    render(<FlashcardItem {...defaultProps} card={aiEditedCard} />);

    const badge = screen.getByText("AI Edited");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-secondary/50", "text-secondary-foreground");
  });

  it("renders edit button with icon and correct label", () => {
    render(<FlashcardItem {...defaultProps} />);

    const editButton = screen.getByRole("button", { name: "Edit" });
    expect(editButton).toBeInTheDocument();

    // Check if the Edit icon is rendered
    const editIcon = screen.getByTestId("edit-icon");
    expect(editIcon).toBeInTheDocument();
  });

  it("calls onEdit with correct card when edit button is clicked", async () => {
    const user = userEvent.setup();
    render(<FlashcardItem {...defaultProps} />);

    const editButton = screen.getByRole("button", { name: "Edit" });
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockCard);
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it("renders with proper CSS classes for styling", () => {
    render(<FlashcardItem {...defaultProps} />);

    // Find the main card container (outermost div)
    const cardElement = document.querySelector(".rounded-lg.border");
    expect(cardElement).toHaveClass("rounded-lg", "border", "border-border", "bg-card", "p-4");

    // Check the edit button styling
    const editButton = screen.getByRole("button", { name: "Edit" });
    expect(editButton).toHaveClass("h-8", "w-8", "p-0");
  });

  it("positions elements correctly in the layout", () => {
    render(<FlashcardItem {...defaultProps} />);

    // Check header section with title and controls (the div that contains both front text and controls)
    const headerSection = document.querySelector(".mb-2.flex.items-start.justify-between");
    expect(headerSection).toHaveClass("mb-2", "flex", "items-start", "justify-between");

    // Check front content section (the div containing the front text)
    const frontSection = document.querySelector(".flex-1");
    expect(frontSection).toHaveClass("flex-1");

    // Check controls section (the div containing the badge and edit button)
    const controlsSection = document.querySelector(".ml-4.flex.flex-col.items-end.gap-2");
    expect(controlsSection).toHaveClass("ml-4", "flex", "flex-col", "items-end", "gap-2");
  });

  it("handles long text content properly", () => {
    const longCard: FlashcardVM = {
      ...mockCard,
      front:
        "This is a very long question that might wrap to multiple lines and test how the component handles longer content in the front field",
      back: "This is a very long answer that might also wrap to multiple lines and test how the component handles longer content in the back field as well",
    };

    render(<FlashcardItem {...defaultProps} card={longCard} />);

    expect(screen.getByText(longCard.front)).toBeInTheDocument();
    expect(screen.getByText(longCard.back)).toBeInTheDocument();
  });

  it("displays different source badges correctly", () => {
    const sources: FlashcardVM["source"][] = ["manual", "ai", "ai_edited"];

    sources.forEach((source) => {
      const testCard: FlashcardVM = {
        ...mockCard,
        source,
      };

      const { rerender } = render(<FlashcardItem {...defaultProps} card={testCard} />);

      if (source === "manual") {
        expect(screen.getByText("Manual")).toBeInTheDocument();
      } else if (source === "ai") {
        expect(screen.getByText("AI Generated")).toBeInTheDocument();
      } else if (source === "ai_edited") {
        expect(screen.getByText("AI Edited")).toBeInTheDocument();
      }

      rerender(<></>); // Clean up for next iteration
    });
  });

  it("has proper accessibility attributes", () => {
    render(<FlashcardItem {...defaultProps} />);

    const editButton = screen.getByRole("button", { name: "Edit" });
    expect(editButton).toHaveAttribute("aria-label", "Edit");

    // Check that the button has proper styling for accessibility
    expect(editButton).toHaveAttribute("type", "button");
  });

  it("renders badge with consistent styling across sources", () => {
    const aiCard: FlashcardVM = {
      ...mockCard,
      source: "ai",
    };

    render(<FlashcardItem {...defaultProps} card={aiCard} />);

    const badge = screen.getByText("AI Generated");
    expect(badge).toHaveClass("rounded", "px-2", "py-1", "text-xs", "font-medium");
  });

  it("maintains proper spacing between sections", () => {
    render(<FlashcardItem {...defaultProps} />);

    // Check that front and back sections have proper spacing
    const backSection = screen.getByText("Back").closest("div");
    expect(backSection).not.toHaveClass("mb-2"); // Front section should have margin, back should not
  });
});
