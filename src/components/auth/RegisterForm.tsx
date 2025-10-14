import { useState, useCallback, useId, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useI18n, I18nProvider } from "@/lib/i18n/react";
import { registerSchema } from "@/lib/auth/schemas";
import { toast } from "sonner";
import type { Language } from "@/lib/i18n/config";

interface RegisterFormProps {
  onSubmit?: (data: { name: string; email: string; password: string }) => void;
}

interface RegisterFormWrapperProps extends RegisterFormProps {
  lang: Language;
}

/**
 * Registration form inner component with name, email, password, and confirm password fields
 * Includes client-side validation with password requirements
 */
function RegisterFormInner({ onSubmit }: RegisterFormProps) {
  const { t } = useI18n();
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const nameErrorId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const confirmPasswordErrorId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = useCallback(() => {
    const result = registerSchema.safeParse({ name, email, password, confirmPassword });

    if (!result.success) {
      const newErrors: {
        name?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
      } = {};

      result.error.errors.forEach((err) => {
        const field = err.path[0] as "name" | "email" | "password" | "confirmPassword";
        newErrors[field] = t(err.message);
      });

      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [name, email, password, confirmPassword, t]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setIsLoading(true);

      try {
        // Call custom onSubmit if provided (for testing)
        if (onSubmit) {
          await onSubmit({ name, email, password });
          setIsLoading(false);
          return;
        }

        // Call register API endpoint
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, password, confirmPassword }),
        });

        const data = await response.json();

        if (!response.ok) {
          // API returned an error
          const errorMessage = data.error ? t(data.error) : t("auth.errors.unexpectedError");
          toast.error(errorMessage);
          setIsLoading(false);
          return;
        }

        // Success! Set success state to show confirmation message
        setIsSuccess(true);
        setIsLoading(false);
      } catch {
        // Network error or unexpected issue
        toast.error(t("auth.errors.networkError"));
        setIsLoading(false);
      }
    },
    [name, email, password, confirmPassword, onSubmit, validateForm, t]
  );

  // Show success message after registration
  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h3 className="text-lg font-medium text-foreground">{t("auth.success.registrationComplete")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.success.checkEmail")}</p>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full">
            <a href="/auth/login">{t("auth.goToLogin")}</a>
          </Button>

          <p className="text-xs text-muted-foreground">
            {t("auth.didntReceiveEmail")}{" "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => {
                setIsSuccess(false);
                // Optionally clear form or keep email for resubmission
              }}
            >
              {t("auth.tryAgain")}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor={nameId} className="mb-2 block text-sm font-medium text-foreground">
          {t("auth.fullName")}
        </label>
        <input
          type="text"
          id={nameId}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
            errors.name ? "border-destructive" : "border-input bg-background"
          }`}
          placeholder="John Doe"
          disabled={isLoading}
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? nameErrorId : undefined}
        />
        {errors.name && (
          <p id={nameErrorId} className="mt-1 text-xs text-destructive" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={emailId} className="mb-2 block text-sm font-medium text-foreground">
          {t("auth.email")}
        </label>
        <input
          type="email"
          id={emailId}
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
            errors.email ? "border-destructive" : "border-input bg-background"
          }`}
          placeholder={t("auth.emailPlaceholder")}
          disabled={isLoading}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? emailErrorId : undefined}
        />
        {errors.email && (
          <p id={emailErrorId} className="mt-1 text-xs text-destructive" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={passwordId} className="mb-2 block text-sm font-medium text-foreground">
          {t("auth.password")}
        </label>
        <input
          type="password"
          id={passwordId}
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
            errors.password ? "border-destructive" : "border-input bg-background"
          }`}
          placeholder={t("auth.passwordPlaceholder")}
          disabled={isLoading}
          aria-invalid={errors.password ? "true" : "false"}
          aria-describedby={errors.password ? passwordErrorId : undefined}
        />
        <p className="mt-1 text-xs text-muted-foreground">{t("auth.passwordRequirement")}</p>
        {errors.password && (
          <p id={passwordErrorId} className="mt-1 text-xs text-destructive" role="alert">
            {errors.password}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={confirmPasswordId} className="mb-2 block text-sm font-medium text-foreground">
          {t("auth.confirmPassword")}
        </label>
        <input
          type="password"
          id={confirmPasswordId}
          name="confirm-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
            errors.confirmPassword ? "border-destructive" : "border-input bg-background"
          }`}
          placeholder={t("auth.passwordPlaceholder")}
          disabled={isLoading}
          aria-invalid={errors.confirmPassword ? "true" : "false"}
          aria-describedby={errors.confirmPassword ? confirmPasswordErrorId : undefined}
        />
        {errors.confirmPassword && (
          <p id={confirmPasswordErrorId} className="mt-1 text-xs text-destructive" role="alert">
            {errors.confirmPassword}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t("auth.signingUp") : t("auth.createAccount")}
      </Button>

      {/* Divider */}
      <div className="flex items-center">
        <div className="flex-1 border-t border-border"></div>
        <span className="px-4 text-xs text-muted-foreground">{t("auth.or")}</span>
        <div className="flex-1 border-t border-border"></div>
      </div>

      {/* Sign In Link */}
      <p className="text-center text-sm text-muted-foreground">
        {t("auth.alreadyHaveAccount")}{" "}
        <a href="/auth/login" className="font-medium text-primary hover:underline">
          {t("auth.login")}
        </a>
      </p>
    </form>
  );
}

/**
 * Register form component that provides i18n context to RegisterFormInner
 * Follows the same pattern as Header.tsx for proper context wrapping
 */
export function RegisterForm({ lang, onSubmit }: RegisterFormWrapperProps) {
  return (
    <I18nProvider lang={lang}>
      <RegisterFormInner onSubmit={onSubmit} />
    </I18nProvider>
  );
}
