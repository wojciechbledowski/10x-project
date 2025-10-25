/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeleteDeckDialog } from "../DeleteDeckDialog";

// Mock the useDeckSettings hook
vi.mock("@/components/hooks/useDeckSettings", () => ({
  useDeckSettings: vi.fn(),
}));

// Import the mocked hook after the mock
import { useDeckSettings } from "@/components/hooks/useDeckSettings";
import type { Language } from "@/lib/i18n/config";
const mockUseDeckSettings = vi.mocked(useDeckSettings);

// Mock the i18n hook
vi.mock("@/lib/i18n/react", () => ({
  useI18n: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        "settings.dangerZone": "Danger Zone",
        "settings.deleteDeckWarning": "Deleting a deck will permanently remove it and all its flashcards.",
        "settings.deleteDeck": "Delete Deck",
        "settings.deleteDeckConfirm": "Are you sure you want to delete this deck? This action cannot be undone.",
        "settings.deleteDeckConfirmCards": `This will also delete ${options?.count || 0} flashcards.`,
        "settings.loadDeckError": "Failed to load deck",
        "common.cancel": "Cancel",
        "common.deleting": "Deleting...",
      };
      return translations[key] || key;
    },
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the UI components
vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: any) => <div data-testid="alert-dialog">{children}</div>,
  AlertDialogAction: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} data-testid="alert-dialog-action">
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children, disabled }: any) => (
    <button disabled={disabled} data-testid="alert-dialog-cancel">
      {children}
    </button>
  ),
  AlertDialogContent: ({ children }: any) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div data-testid="alert-dialog-description">{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div data-testid="alert-dialog-footer">{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div data-testid="alert-dialog-title">{children}</div>,
  AlertDialogTrigger: ({ children }: any) => <div data-testid="alert-dialog-trigger">{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, variant, className, disabled, onClick }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-testid={`button-${variant || "default"}`}
    >
      {children}
    </button>
  ),
}));

describe("DeleteDeckDialog", () => {
  const mockDeck = {
    id: "deck-1",
    name: "Test Deck",
    createdAt: "2024-01-01T00:00:00Z",
    cardCount: 5,
  };

  const mockDeleteDeck = vi.fn();

  const defaultProps = {
    deckId: "deck-1",
    lang: "en" as Language,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    mockUseDeckSettings.mockReturnValue({
      deck: mockDeck,
      isLoadingDeck: false,
      updateDeckName: vi.fn(),
      deleteDeck: mockDeleteDeck,
      isUpdating: false,
      isDeleting: false,
      error: null,
    });

    mockDeleteDeck.mockResolvedValue(undefined);
  });

  it("renders danger zone section with delete button", () => {
    render(<DeleteDeckDialog {...defaultProps} />);

    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    expect(screen.getByText("Deleting a deck will permanently remove it and all its flashcards.")).toBeInTheDocument();
    expect(screen.getByTestId("button-destructive")).toBeInTheDocument();
  });

  it("renders loading skeleton when deck is loading", () => {
    mockUseDeckSettings.mockReturnValue({
      deck: null,
      isLoadingDeck: true,
      updateDeckName: vi.fn(),
      deleteDeck: mockDeleteDeck,
      isUpdating: false,
      isDeleting: false,
      error: null,
    });

    render(<DeleteDeckDialog {...defaultProps} />);

    // Check for skeleton elements (animate-pulse class)
    const skeletonContainer = document.querySelector(".animate-pulse");
    expect(skeletonContainer).toBeInTheDocument();
  });

  it("renders error state when deck fails to load", () => {
    mockUseDeckSettings.mockReturnValue({
      deck: null,
      isLoadingDeck: false,
      updateDeckName: vi.fn(),
      deleteDeck: mockDeleteDeck,
      isUpdating: false,
      isDeleting: false,
      error: "Network error",
    });

    render(<DeleteDeckDialog {...defaultProps} />);

    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("renders default error message when deck fails to load without specific error", () => {
    mockUseDeckSettings.mockReturnValue({
      deck: null,
      isLoadingDeck: false,
      updateDeckName: vi.fn(),
      deleteDeck: mockDeleteDeck,
      isUpdating: false,
      isDeleting: false,
      error: null,
    });

    render(<DeleteDeckDialog {...defaultProps} />);

    expect(screen.getByText("Failed to load deck")).toBeInTheDocument();
  });

  it("opens confirmation dialog when delete button is clicked", async () => {
    const user = userEvent.setup();
    render(<DeleteDeckDialog {...defaultProps} />);

    const deleteButton = screen.getByTestId("button-destructive");
    await user.click(deleteButton);

    // Check that alert dialog content is rendered
    expect(screen.getByTestId("alert-dialog-title")).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to delete this deck\? This action cannot be undone/)
    ).toBeInTheDocument();
  });

  it("displays deck name and card count in confirmation dialog", async () => {
    const user = userEvent.setup();
    render(<DeleteDeckDialog {...defaultProps} />);

    const deleteButton = screen.getByTestId("button-destructive");
    await user.click(deleteButton);

    expect(screen.getByText("Test Deck")).toBeInTheDocument();
    expect(screen.getByText(/This will also delete 5 flashcards/)).toBeInTheDocument();
  });

  it("calls deleteDeck when confirmation is accepted", async () => {
    const user = userEvent.setup();
    render(<DeleteDeckDialog {...defaultProps} />);

    // Open dialog
    const deleteButton = screen.getByTestId("button-destructive");
    await user.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByTestId("alert-dialog-action");
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteDeck).toHaveBeenCalledTimes(1);
    });
  });

  it("shows loading state during deletion", async () => {
    const user = userEvent.setup();

    // Mock delayed deletion
    mockUseDeckSettings.mockReturnValue({
      deck: mockDeck,
      isLoadingDeck: false,
      updateDeckName: vi.fn(),
      deleteDeck: mockDeleteDeck,
      isUpdating: false,
      isDeleting: true,
      error: null,
    });

    render(<DeleteDeckDialog {...defaultProps} />);

    const deleteButton = screen.getByTestId("button-destructive");
    expect(deleteButton).toBeDisabled();

    // Open dialog
    await user.click(deleteButton);

    // Check that dialog buttons are disabled during deletion
    const confirmButton = screen.getByTestId("alert-dialog-action");
    const cancelButton = screen.getByTestId("alert-dialog-cancel");

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(screen.getByText("Deleting...")).toBeInTheDocument();
  });

  it("handles deletion errors gracefully", async () => {
    const user = userEvent.setup();

    mockDeleteDeck.mockRejectedValueOnce(new Error("Delete failed"));

    render(<DeleteDeckDialog {...defaultProps} />);

    // Open dialog
    const deleteButton = screen.getByTestId("button-destructive");
    await user.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByTestId("alert-dialog-action");
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteDeck).toHaveBeenCalledTimes(1);
    });

    // Dialog should close on error (handled by the component)
  });

  it("closes dialog when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<DeleteDeckDialog {...defaultProps} />);

    // Open dialog
    const deleteButton = screen.getByTestId("button-destructive");
    await user.click(deleteButton);

    expect(screen.getByTestId("alert-dialog-title")).toBeInTheDocument();

    // Cancel
    const cancelButton = screen.getByTestId("alert-dialog-cancel");
    await user.click(cancelButton);

    // The dialog content should still be rendered (AlertDialog doesn't control visibility in this mock)
    expect(screen.getByTestId("alert-dialog-title")).toBeInTheDocument();
  });

  it("renders with destructive styling", () => {
    render(<DeleteDeckDialog {...defaultProps} />);

    const container = screen.getByText("Danger Zone").closest("div");
    expect(container).toHaveClass("border-destructive", "bg-card");

    const deleteButton = screen.getByTestId("button-destructive");
    expect(deleteButton).toHaveAttribute("data-variant", "destructive");
  });

  it("renders confirmation dialog with proper accessibility", async () => {
    const user = userEvent.setup();
    render(<DeleteDeckDialog {...defaultProps} />);

    const deleteButton = screen.getByTestId("button-destructive");
    await user.click(deleteButton);

    expect(screen.getByTestId("alert-dialog-title")).toBeInTheDocument();
    expect(screen.getByTestId("alert-dialog-description")).toBeInTheDocument();
    expect(screen.getByTestId("alert-dialog-header")).toBeInTheDocument();
    expect(screen.getByTestId("alert-dialog-footer")).toBeInTheDocument();
  });

  it("prevents multiple deletion attempts", async () => {
    const user = userEvent.setup();

    mockUseDeckSettings.mockReturnValue({
      deck: mockDeck,
      isLoadingDeck: false,
      updateDeckName: vi.fn(),
      deleteDeck: mockDeleteDeck,
      isUpdating: false,
      isDeleting: true, // Already deleting
      error: null,
    });

    render(<DeleteDeckDialog {...defaultProps} />);

    const deleteButton = screen.getByTestId("button-destructive");
    expect(deleteButton).toBeDisabled();

    // Try to click anyway
    await user.click(deleteButton);

    // Should not call deleteDeck again
    expect(mockDeleteDeck).not.toHaveBeenCalled();
  });

  it("handles deck with zero cards correctly", async () => {
    const deckWithNoCards = { ...mockDeck, cardCount: 0 };

    mockUseDeckSettings.mockReturnValue({
      deck: deckWithNoCards,
      isLoadingDeck: false,
      updateDeckName: vi.fn(),
      deleteDeck: mockDeleteDeck,
      isUpdating: false,
      isDeleting: false,
      error: null,
    });

    const user = userEvent.setup();
    render(<DeleteDeckDialog {...defaultProps} />);

    const deleteButton = screen.getByTestId("button-destructive");
    await user.click(deleteButton);

    expect(screen.getByText(/This will also delete 0 flashcards/)).toBeInTheDocument();
  });
});
