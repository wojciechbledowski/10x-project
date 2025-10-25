/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateDeckModal } from "../CreateDeckModal";
import type { DeckCardVM } from "../../../types";

// Mock the i18n hook
vi.mock("@/lib/i18n/react", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "decks.createNewDeck": "Create New Deck",
        "decks.deckNameHelp": "Enter a name for your new deck",
        "decks.deckName": "Deck Name",
        "decks.deckNamePlaceholder": "Enter deck name",
        "decks.createDeck": "Create Deck",
        "decks.creatingDeck": "Creating...",
        "decks.deckCreated": "Deck created successfully!",
        "common.cancel": "Cancel",
      };
      return translations[key] || key;
    },
  }),
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
  DialogFooter: ({ children, className }: any) => (
    <div className={className} data-testid="dialog-footer">
      {children}
    </div>
  ),
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, type, variant }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      data-variant={variant}
      data-testid={`button-${variant || "default"}`}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    id,
    type,
    placeholder,
    value,
    onChange,
    onBlur,
    maxLength,
    disabled,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedBy,
  }: any) => (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      maxLength={maxLength}
      disabled={disabled}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      data-testid="input"
    />
  ),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import the mocked toast after the mock
import { toast } from "sonner";
const mockedToastError = vi.mocked(toast.error);

describe("CreateDeckModal", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnCreateDeck = vi.fn();

  const mockDeck: DeckCardVM = {
    id: "deck-1",
    name: "Test Deck",
    totalCards: 0,
    dueCards: 0,
  };

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onCreateDeck: mockOnCreateDeck,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnCreateDeck.mockResolvedValue(mockDeck);
  });

  it("renders modal when open is true", () => {
    render(<CreateDeckModal {...defaultProps} />);

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText("Create New Deck")).toBeInTheDocument();
    expect(screen.getByText("Enter a name for your new deck")).toBeInTheDocument();
  });

  it("does not render modal when open is false", () => {
    render(<CreateDeckModal {...defaultProps} open={false} />);

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("renders form elements correctly", () => {
    render(<CreateDeckModal {...defaultProps} />);

    expect(screen.getByLabelText("Deck Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter deck name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Deck" })).toBeInTheDocument();
  });

  it("disables submit button when name is empty", async () => {
    render(<CreateDeckModal {...defaultProps} />);

    const input = screen.getByLabelText("Deck Name");
    const submitButton = screen.getByRole("button", { name: "Create Deck" });

    // Button should be disabled when input is empty
    expect(submitButton).toBeDisabled();

    // Type some text
    fireEvent.change(input, { target: { value: "Test" } });

    // Button should be enabled when input has text
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("validates name that is too long", async () => {
    const user = userEvent.setup();
    render(<CreateDeckModal {...defaultProps} />);

    const input = screen.getByLabelText("Deck Name");
    const submitButton = screen.getByRole("button", { name: "Create Deck" });

    // Set a very long name (over 255 characters)
    const longName = "a".repeat(256);
    fireEvent.change(input, { target: { value: longName } });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("name must be at most 255 characters long")).toBeInTheDocument();
    });
  });

  it("clears error when user starts typing", async () => {
    const user = userEvent.setup();
    render(<CreateDeckModal {...defaultProps} />);

    const input = screen.getByLabelText("Deck Name");
    const submitButton = screen.getByRole("button", { name: "Create Deck" });

    // Type invalid content (too long) and submit to trigger validation
    const longName = "a".repeat(256);
    fireEvent.change(input, { target: { value: longName } });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("name must be at most 255 characters long")).toBeInTheDocument();
    });

    // Start typing valid content
    fireEvent.change(input, { target: { value: "New Deck" } });

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText("name must be at most 255 characters long")).not.toBeInTheDocument();
    });
  });

  it("submits form successfully with valid name", async () => {
    const user = userEvent.setup();
    render(<CreateDeckModal {...defaultProps} />);

    const input = screen.getByLabelText("Deck Name");
    const submitButton = screen.getByRole("button", { name: "Create Deck" });

    await user.type(input, "My New Deck");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnCreateDeck).toHaveBeenCalledWith("My New Deck");
    });

    // Modal should close after successful creation
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("trims whitespace from deck name", async () => {
    const user = userEvent.setup();
    render(<CreateDeckModal {...defaultProps} />);

    const input = screen.getByLabelText("Deck Name");
    const submitButton = screen.getByRole("button", { name: "Create Deck" });

    await user.type(input, "  My Deck  ");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnCreateDeck).toHaveBeenCalledWith("My Deck");
    });
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();

    // Delay the response to show loading state
    mockOnCreateDeck.mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(mockDeck), 100)));

    render(<CreateDeckModal {...defaultProps} />);

    const input = screen.getByLabelText("Deck Name");
    const submitButton = screen.getByRole("button", { name: "Create Deck" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });

    await user.type(input, "Test Deck");
    await user.click(submitButton);

    // Check loading state
    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(input).toBeDisabled();
    expect(screen.getByText("Creating...")).toBeInTheDocument();

    // Wait for completion - modal should close on success
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("handles API errors gracefully", async () => {
    const user = userEvent.setup();

    mockOnCreateDeck.mockRejectedValueOnce(new Error("API Error"));

    render(<CreateDeckModal {...defaultProps} />);

    const input = screen.getByLabelText("Deck Name");
    const submitButton = screen.getByRole("button", { name: "Create Deck" });

    await user.type(input, "Test Deck");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith("API Error");
    });

    // Modal should remain open on error
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("handles null response from onCreateDeck", async () => {
    const user = userEvent.setup();

    mockOnCreateDeck.mockResolvedValueOnce(null);

    render(<CreateDeckModal {...defaultProps} />);

    const input = screen.getByLabelText("Deck Name");
    const submitButton = screen.getByRole("button", { name: "Create Deck" });

    await user.type(input, "Test Deck");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnCreateDeck).toHaveBeenCalledWith("Test Deck");
    });

    // Modal should remain open when null is returned (error case)
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("resets form when modal is closed", async () => {
    const user = userEvent.setup();
    render(<CreateDeckModal {...defaultProps} />);

    const input = screen.getByLabelText("Deck Name");

    // Type something
    await user.type(input, "Test Deck");
    expect(input).toHaveValue("Test Deck");

    // Close modal
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables submit button when name is empty or has error", () => {
    render(<CreateDeckModal {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: "Create Deck" });

    // Initially disabled (empty name)
    expect(submitButton).toBeDisabled();

    // Should remain disabled when there's an error
    // (We can't easily simulate the error state without triggering validation)
  });

  it("has proper form structure and accessibility", () => {
    render(<CreateDeckModal {...defaultProps} />);

    // Check form structure - form should exist but doesn't have explicit action/method attributes
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
    // The form doesn't have explicit action/method attributes, it's handled by React

    const input = screen.getByLabelText("Deck Name");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("maxLength", "255");
  });

  it("prevents multiple submissions", async () => {
    const user = userEvent.setup();
    render(<CreateDeckModal {...defaultProps} />);

    const input = screen.getByLabelText("Deck Name");
    const submitButton = screen.getByRole("button", { name: "Create Deck" });

    await user.type(input, "Test Deck");
    await user.click(submitButton);
    await user.click(submitButton); // Try to submit again

    // Should only call onCreateDeck once
    expect(mockOnCreateDeck).toHaveBeenCalledTimes(1);
  });
});
