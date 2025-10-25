/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoginForm } from "../LoginForm";
import type { Language } from "@/lib/i18n/config";

// Mock the i18n hook
vi.mock("@/lib/i18n/react", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "auth.email": "Email",
        "auth.password": "Password",
        "auth.login": "Login",
        "auth.signingIn": "Signing in...",
        "auth.emailPlaceholder": "Enter your email",
        "auth.passwordPlaceholder": "Enter your password",
        "auth.forgotPassword": "Forgot password?",
        "auth.or": "or",
        "auth.dontHaveAccount": "Don't have an account?",
        "auth.signup": "Sign up",
        "auth.errors.invalidEmail": "Please enter a valid email address",
        "auth.errors.emailRequired": "Email is required",
        "auth.errors.passwordRequired": "Password is required",
        "auth.errors.invalidCredentials": "Invalid email or password",
        "auth.errors.unexpectedError": "An unexpected error occurred",
        "auth.errors.networkError": "Network error. Please try again.",
        "auth.success.loginSuccess": "Login successful!",
      };
      return translations[key] || key;
    },
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

// Mock window.location
delete (window as any).location;
(window as any).location = { href: "" } as Location;

describe("LoginForm", () => {
  const defaultProps = {
    lang: "en" as Language,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders login form with all required elements", () => {
    render(<LoginForm {...defaultProps} />);

    // Check form elements
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();

    // Check form structure
    expect(document.querySelector("form")).toBeInTheDocument();

    // Check links
    expect(screen.getByRole("link", { name: "Forgot password?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign up" })).toBeInTheDocument();
  });

  it("displays validation errors for empty fields", async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: "Login" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });

    // Check accessibility attributes
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    expect(emailInput).toHaveAttribute("aria-invalid", "true");
    expect(passwordInput).toHaveAttribute("aria-invalid", "true");
  });

  it("submits form successfully with valid data", async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<LoginForm {...defaultProps} onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: "Login" });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("handles API success and redirects", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<LoginForm {...defaultProps} />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: "Login" });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(window.location.href).toBe("/decks");
    });
  });

  it("displays API error messages", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "auth.errors.invalidCredentials" }),
    });

    render(<LoginForm {...defaultProps} />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: "Login" });

    await user.type(emailInput, "wrong@example.com");
    await user.type(passwordInput, "wrongpassword");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith("Invalid email or password");
    });
  });

  it("handles network errors gracefully", async () => {
    const user = userEvent.setup();

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<LoginForm {...defaultProps} />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: "Login" });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith("Network error. Please try again.");
    });
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();

    // Delay the fetch response
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({}),
              }),
            100
          )
        )
    );

    render(<LoginForm {...defaultProps} />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: "Login" });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    // Check loading state
    expect(submitButton).toBeDisabled();
    expect(screen.getByText("Signing in...")).toBeInTheDocument();
  });

  it("prevents multiple form submissions", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<LoginForm {...defaultProps} />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: "Login" });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);
    await user.click(submitButton); // Try to submit again

    // Should only call fetch once
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("has proper accessibility attributes", () => {
    render(<LoginForm {...defaultProps} />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");

    // Check unique IDs for accessibility
    expect(emailInput).toHaveAttribute("id");
    expect(passwordInput).toHaveAttribute("id");

    // Check form structure - form should exist but doesn't have explicit action/method attributes
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
    // The form doesn't have explicit action/method attributes, it's handled by React
  });
});
