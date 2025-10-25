/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SortDropdown } from "../SortDropdown";

// Mock the i18n hook
vi.mock("@/lib/i18n/react", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "decks.newestFirst": "Newest First",
        "decks.oldestFirst": "Oldest First",
        "decks.nameAZ": "Name A-Z",
        "decks.sortBy": "Sort by",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock the UI components
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <option value={value} data-testid={`select-item-${value}`}>
      {children}
    </option>
  ),
  SelectTrigger: ({ children, "aria-label": ariaLabel }: any) => (
    <button data-testid="select-trigger" aria-label={ariaLabel}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>,
}));

// Mock lucide-react icon
vi.mock("lucide-react", () => ({
  ArrowUpDown: ({ className, "aria-hidden": ariaHidden }: any) => (
    <svg data-testid="sort-icon" className={className} aria-hidden={ariaHidden} />
  ),
}));

describe("SortDropdown", () => {
  const mockOnChange = vi.fn();

  it("renders sort dropdown with icon and trigger", () => {
    render(<SortDropdown value="created_at" onChange={mockOnChange} />);

    expect(screen.getByTestId("sort-icon")).toBeInTheDocument();
    expect(screen.getByTestId("select-trigger")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort by")).toBeInTheDocument();
  });

  it("renders all sort options", () => {
    render(<SortDropdown value="created_at" onChange={mockOnChange} />);

    expect(screen.getByTestId("select-item-created_at")).toBeInTheDocument();
    expect(screen.getByTestId("select-item--created_at")).toBeInTheDocument();
    expect(screen.getByTestId("select-item-name")).toBeInTheDocument();

    expect(screen.getByText("Newest First")).toBeInTheDocument();
    expect(screen.getByText("Oldest First")).toBeInTheDocument();
    expect(screen.getByText("Name A-Z")).toBeInTheDocument();
  });

  it("displays current selected value", () => {
    render(<SortDropdown value="-created_at" onChange={mockOnChange} />);

    const select = screen.getByTestId("select");
    expect(select).toHaveAttribute("data-value", "-created_at");
  });

  it("has proper accessibility attributes", () => {
    render(<SortDropdown value="created_at" onChange={mockOnChange} />);

    const trigger = screen.getByTestId("select-trigger");
    expect(trigger).toHaveAttribute("aria-label", "Sort by");

    const icon = screen.getByTestId("sort-icon");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("renders with proper CSS classes", () => {
    render(<SortDropdown value="created_at" onChange={mockOnChange} />);

    // Check container styling
    const container = screen.getByTestId("sort-icon").closest("div");
    expect(container).toHaveClass("flex", "items-center", "gap-2");

    // Check trigger styling (this would be applied by the mocked component)
    const trigger = screen.getByTestId("select-trigger");
    expect(trigger).toBeInTheDocument();
  });
});
