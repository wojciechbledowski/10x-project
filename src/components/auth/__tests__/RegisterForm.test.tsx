/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegisterForm } from "../RegisterForm";
import type { Language } from "@/lib/i18n/config";

// Mock the i18n hook
vi.mock("@/lib/i18n/react", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "auth.fullName": "Full Name",
        "auth.email": "Email",
        "auth.password": "Password",
        "auth.confirmPassword": "Confirm Password",
        "auth.createAccount": "Create Account",
        "auth.signingUp": "Signing up...",
        "auth.emailPlaceholder": "Enter your email",
        "auth.passwordPlaceholder": "Enter your password",
        "auth.passwordRequirement": "Password must be at least 8 characters long",
        "auth.or": "or",
        "auth.alreadyHaveAccount": "Already have an account?",
        "auth.login": "Login",
        "auth.success.registrationComplete": "Registration Complete",
        "auth.success.checkEmail": "Please check your email to verify your account",
        "auth.goToLogin": "Go to Login",
        "auth.didntReceiveEmail": "Didn't receive the email?",
        "auth.tryAgain": "Try Again",
        "auth.errors.nameRequired": "Name is required",
        "auth.errors.emailRequired": "Email is required",
        "auth.errors.invalidEmail": "Please enter a valid email address",
        "auth.errors.passwordRequired": "Password is required",
        "auth.errors.passwordTooShort": "Password must be at least 8 characters",
        "auth.errors.passwordMismatch": "Passwords do not match",
        "auth.errors.passwordComplexity":
          "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        "auth.errors.emailAlreadyExists": "An account with this email already exists",
        "auth.errors.unexpectedError": "An unexpected error occurred",
        "auth.errors.networkError": "Network error. Please try again.",
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
const toastErrorMock = vi.mocked(toast.error);

// Mock window.location
delete (window as any).location;
(window as any).location = { href: "" } as Location;

describe("RegisterForm", () => {
  const defaultProps = {
    lang: "en" as Language,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders registration form with all required elements", () => {
    render(<RegisterForm {...defaultProps} />);

    // Check form elements
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();

    // Check form structure
    expect(document.querySelector("form")).toBeInTheDocument();

    // Check links
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();

    // Check password requirement text
    expect(screen.getByText("Password must be at least 8 characters long")).toBeInTheDocument();
  });

  it("displays validation errors for empty fields", async () => {
    const user = userEvent.setup();
    render(<RegisterForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: "Create Account" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
      expect(
        screen.getByText("Password must contain at least one uppercase letter, one lowercase letter, and one number")
      ).toBeInTheDocument();
    });
  });

  it("displays validation error for password too short", async () => {
    const user = userEvent.setup();
    render(<RegisterForm {...defaultProps} />);

    const nameInput = screen.getByLabelText("Full Name");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: "Create Account" });

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "short");
    await user.type(confirmPasswordInput, "short");
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Password must contain at least one uppercase letter, one lowercase letter, and one number")
      ).toBeInTheDocument();
    });
  });

  it("displays validation error for password mismatch", async () => {
    const user = userEvent.setup();
    render(<RegisterForm {...defaultProps} />);

    const nameInput = screen.getByLabelText("Full Name");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: "Create Account" });

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "password123");
    await user.type(confirmPasswordInput, "differentpassword");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  it("shows validation errors for empty required fields", async () => {
    const user = userEvent.setup();
    render(<RegisterForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: "Create Account" });

    // Submit empty form to trigger validation errors
    await user.click(submitButton);

    // Verify errors are displayed
    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
      expect(
        screen.getByText("Password must contain at least one uppercase letter, one lowercase letter, and one number")
      ).toBeInTheDocument();
    });
  });

  it("submits form successfully with valid data", async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<RegisterForm {...defaultProps} onSubmit={mockOnSubmit} />);

    const nameInput = screen.getByLabelText("Full Name");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: "Create Account" });

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "Password123");
    await user.type(confirmPasswordInput, "Password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com",
        password: "Password123",
      });
    });
  });

  it("handles API success and shows success state", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    // Don't provide onSubmit so it makes the actual API call
    render(<RegisterForm {...defaultProps} onSubmit={undefined} />);

    const nameInput = screen.getByLabelText("Full Name");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: "Create Account" });

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "Password123");
    await user.type(confirmPasswordInput, "Password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Registration Complete")).toBeInTheDocument();
      expect(screen.getByText("Please check your email to verify your account")).toBeInTheDocument();
    });
  });

  it("displays API error messages", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "auth.errors.emailAlreadyExists" }),
    });

    // Don't provide onSubmit so it makes the actual API call
    render(<RegisterForm {...defaultProps} onSubmit={undefined} />);

    const nameInput = screen.getByLabelText("Full Name");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: "Create Account" });

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "existing@example.com");
    await user.type(passwordInput, "Password123");
    await user.type(confirmPasswordInput, "Password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("An account with this email already exists");
    });
  });

  it("handles network errors gracefully", async () => {
    const user = userEvent.setup();

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    // Don't provide onSubmit so it makes the actual API call
    render(<RegisterForm {...defaultProps} onSubmit={undefined} />);

    const nameInput = screen.getByLabelText("Full Name");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: "Create Account" });

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "Password123");
    await user.type(confirmPasswordInput, "Password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Network error. Please try again.");
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

    // Don't provide onSubmit so it makes the actual API call and shows loading state
    render(<RegisterForm {...defaultProps} onSubmit={undefined} />);

    const nameInput = screen.getByLabelText("Full Name");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: "Create Account" });

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "Password123");
    await user.type(confirmPasswordInput, "Password123");
    await user.click(submitButton);

    // Check loading state - only the submit button should be disabled
    expect(submitButton).toBeDisabled();
    expect(screen.getByText("Signing up...")).toBeInTheDocument();

    // Wait for completion - should show success UI
    await waitFor(() => {
      expect(screen.getByText("Registration Complete")).toBeInTheDocument();
    });
  });

  it("prevents multiple form submissions", async () => {
    const user = userEvent.setup();

    // Use a delayed response to ensure loading state is set
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({}),
              }),
            50
          )
        )
    );

    // Don't provide onSubmit so it makes the actual API call and sets loading state
    render(<RegisterForm {...defaultProps} onSubmit={undefined} />);

    const nameInput = screen.getByLabelText("Full Name");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: "Create Account" });

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "Password123");
    await user.type(confirmPasswordInput, "Password123");
    await user.click(submitButton);

    // Wait a bit for loading state to be set
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    await user.click(submitButton); // Try to submit again

    // Should only call fetch once
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("allows retry after successful registration", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<RegisterForm {...defaultProps} />);

    // First, complete registration
    const nameInput = screen.getByLabelText("Full Name");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: "Create Account" });

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "Password123");
    await user.type(confirmPasswordInput, "Password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Registration Complete")).toBeInTheDocument();
    });

    // Click "Try Again" button
    const tryAgainButton = screen.getByRole("button", { name: "Try Again" });
    await user.click(tryAgainButton);

    // Should return to form
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.queryByText("Registration Complete")).not.toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    render(<RegisterForm {...defaultProps} />);

    const nameInput = screen.getByLabelText("Full Name");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");

    // Check unique IDs for accessibility
    expect(nameInput).toHaveAttribute("id");
    expect(emailInput).toHaveAttribute("id");
    expect(passwordInput).toHaveAttribute("id");
    expect(confirmPasswordInput).toHaveAttribute("id");

    // Check form structure - form should exist but doesn't have action/method attributes
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
    // The form doesn't have explicit action/method attributes, it's handled by React
  });
});
