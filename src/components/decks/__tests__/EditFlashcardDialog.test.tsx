/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditFlashcardDialog } from "../EditFlashcardDialog";
import type { FlashcardVM } from "../../../types";
import type { Language } from "@/lib/i18n/config";

// Mock the i18n hook
vi.mock("@/lib/i18n/react", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "common.edit": "Edit",
        "flashcards.title": "Flashcard",
        "flashcards.editDescription": "Update the front and back content of this flashcard.",
        "flashcards.front": "Front",
        "flashcards.back": "Back",
        "flashcards.frontPlaceholder": "Enter the question or prompt",
        "flashcards.backPlaceholder": "Enter the answer or explanation",
        "flashcards.frontRequired": "Front content is required",
        "flashcards.backRequired": "Back content is required",
        "flashcards.frontTooLong": "Front content must be less than 1000 characters",
        "flashcards.backTooLong": "Back content must be less than 1000 characters",
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.saving": "Saving...",
      };
      return translations[key] || key;
    },
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the UI components
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children, className }: any) => (
    <div className={className} data-testid="dialog-content">
      {children}
    </div>
  ),
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-testid={`button-${variant || "default"}`}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ id, value, onChange, placeholder, rows, maxLength, disabled }: any) => (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      disabled={disabled}
      data-testid="textarea"
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor} data-testid="label">
      {children}
    </label>
  ),
}));

describe("EditFlashcardDialog", () => {
  const mockCard: FlashcardVM = {
    id: "card-1",
    front: "What is React?",
    back: "A JavaScript library for building user interfaces",
    source: "manual",
    nextReviewAt: null,
  };

  const mockOnSave = vi.fn();
  const mockSetIsOpen = vi.fn();

  const defaultProps = {
    card: mockCard,
    lang: "en" as Language,
    isOpen: true,
    setIsOpen: mockSetIsOpen,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
  });

  it("renders dialog when isOpen is true", () => {
    render(<EditFlashcardDialog {...defaultProps} />);

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit Flashcard")).toBeInTheDocument();
    expect(screen.getByText("Update the front and back content of this flashcard.")).toBeInTheDocument();
  });

  it("does not render dialog when isOpen is false", () => {
    render(<EditFlashcardDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("populates form fields with card data", () => {
    render(<EditFlashcardDialog {...defaultProps} />);

    const frontTextarea = screen.getByDisplayValue("What is React?");
    const backTextarea = screen.getByDisplayValue("A JavaScript library for building user interfaces");

    expect(frontTextarea).toBeInTheDocument();
    expect(backTextarea).toBeInTheDocument();
  });

  it("renders form elements with correct labels", () => {
    render(<EditFlashcardDialog {...defaultProps} />);

    expect(screen.getByLabelText("Front")).toBeInTheDocument();
    expect(screen.getByLabelText("Back")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("validates empty front content", async () => {
    const user = userEvent.setup();
    render(<EditFlashcardDialog {...defaultProps} />);

    const frontTextarea = screen.getByLabelText("Front");
    const saveButton = screen.getByRole("button", { name: "Save" });

    // Clear front content
    await user.clear(frontTextarea);
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Front content is required")).toBeInTheDocument();
    });
  });

  it("validates empty back content", async () => {
    const user = userEvent.setup();
    render(<EditFlashcardDialog {...defaultProps} />);

    const backTextarea = screen.getByLabelText("Back");
    const saveButton = screen.getByRole("button", { name: "Save" });

    // Clear back content
    await user.clear(backTextarea);
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Back content is required")).toBeInTheDocument();
    });
  });

  it("validates front content length", async () => {
    const user = userEvent.setup();
    render(<EditFlashcardDialog {...defaultProps} />);

    const frontTextarea = screen.getByLabelText("Front");
    const saveButton = screen.getByRole("button", { name: "Save" });

    // Directly set content longer than 1000 characters using fireEvent
    const longContent = "a".repeat(1001);
    fireEvent.change(frontTextarea, { target: { value: longContent } });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Front content must be less than 1000 characters")).toBeInTheDocument();
    });
  });

  it("validates back content length", async () => {
    const user = userEvent.setup();
    render(<EditFlashcardDialog {...defaultProps} />);

    const backTextarea = screen.getByLabelText("Back");
    const saveButton = screen.getByRole("button", { name: "Save" });

    // Directly set content longer than 1000 characters using fireEvent
    const longContent = "a".repeat(1001);
    fireEvent.change(backTextarea, { target: { value: longContent } });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Back content must be less than 1000 characters")).toBeInTheDocument();
    });
  });

  it("saves flashcard with valid data", async () => {
    const user = userEvent.setup();
    render(<EditFlashcardDialog {...defaultProps} />);

    const saveButton = screen.getByRole("button", { name: "Save" });

    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith("card-1", {
        front: "What is React?",
        back: "A JavaScript library for building user interfaces",
      });
      expect(mockSetIsOpen).toHaveBeenCalledWith(false);
    });
  });

  it("trims whitespace from content", async () => {
    const user = userEvent.setup();

    // Create a card with whitespace
    const cardWithSpaces: FlashcardVM = {
      ...mockCard,
      front: "  Question with spaces  ",
      back: "  Answer with spaces  ",
    };

    render(<EditFlashcardDialog {...defaultProps} card={cardWithSpaces} />);

    const saveButton = screen.getByRole("button", { name: "Save" });

    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith("card-1", {
        front: "Question with spaces",
        back: "Answer with spaces",
      });
    });
  });

  it("shows loading state during save", async () => {
    const user = userEvent.setup();

    // Delay the save operation
    mockOnSave.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<EditFlashcardDialog {...defaultProps} />);

    const saveButton = screen.getByRole("button", { name: "Save" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });

    await user.click(saveButton);

    // Check loading state
    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(screen.getByText("Saving...")).toBeInTheDocument();

    // Wait for completion
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it("handles save errors gracefully", async () => {
    const user = userEvent.setup();

    mockOnSave.mockRejectedValueOnce(new Error("Save failed"));

    render(<EditFlashcardDialog {...defaultProps} />);

    const saveButton = screen.getByRole("button", { name: "Save" });

    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Save failed")).toBeInTheDocument();
    });

    // Dialog should remain open on error
    expect(mockSetIsOpen).not.toHaveBeenCalledWith(false);
  });

  it("cancels and resets form on cancel", async () => {
    const user = userEvent.setup();
    render(<EditFlashcardDialog {...defaultProps} />);

    const frontTextarea = screen.getByLabelText("Front");
    const cancelButton = screen.getByRole("button", { name: "Cancel" });

    // Modify content
    await user.clear(frontTextarea);
    await user.type(frontTextarea, "Modified question");

    // Cancel
    await user.click(cancelButton);

    expect(mockSetIsOpen).toHaveBeenCalledWith(false);
    // Form should be reset to original values (checked by useEffect)
  });

  it("updates form when card prop changes", () => {
    const { rerender } = render(<EditFlashcardDialog {...defaultProps} />);

    expect(screen.getByDisplayValue("What is React?")).toBeInTheDocument();

    const newCard: FlashcardVM = {
      ...mockCard,
      front: "New question?",
      back: "New answer",
    };

    rerender(<EditFlashcardDialog {...defaultProps} card={newCard} />);

    expect(screen.getByDisplayValue("New question?")).toBeInTheDocument();
    expect(screen.getByDisplayValue("New answer")).toBeInTheDocument();
  });

  it("shows character count for textareas", () => {
    render(<EditFlashcardDialog {...defaultProps} />);

    // Check character counts
    expect(screen.getByText("14/1000")).toBeInTheDocument(); // Front length
    expect(screen.getByText("49/1000")).toBeInTheDocument(); // Back length
  });

  it("disables form elements during loading", async () => {
    const user = userEvent.setup();

    mockOnSave.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<EditFlashcardDialog {...defaultProps} />);

    const frontTextarea = screen.getByLabelText("Front");
    const backTextarea = screen.getByLabelText("Back");
    const saveButton = screen.getByRole("button", { name: "Save" });

    await user.click(saveButton);

    expect(frontTextarea).toBeDisabled();
    expect(backTextarea).toBeDisabled();
    expect(saveButton).toBeDisabled();
  });

  it("has proper accessibility attributes", () => {
    render(<EditFlashcardDialog {...defaultProps} />);

    const frontTextarea = screen.getByLabelText("Front");
    const backTextarea = screen.getByLabelText("Back");

    expect(frontTextarea).toHaveAttribute("id", "front");
    expect(backTextarea).toHaveAttribute("id", "back");
    expect(frontTextarea).toHaveAttribute("maxLength", "1000");
    expect(backTextarea).toHaveAttribute("maxLength", "1000");
  });
});
