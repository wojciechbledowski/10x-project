import { useState, useCallback, useId, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useI18n, I18nProvider } from "@/lib/i18n/react";
import { loginSchema } from "@/lib/auth/schemas";
import { toast } from "sonner";
import type { Language } from "@/lib/i18n/config";

interface LoginFormProps {
  onSubmit?: (data: { email: string; password: string }) => void;
}

interface LoginFormWrapperProps extends LoginFormProps {
  lang: Language;
}

/**
 * Login form inner component with email and password fields
 * Includes client-side validation, API integration, and error display
 */
function LoginFormInner({ onSubmit }: LoginFormProps) {
  const { t } = useI18n();
  const emailId = useId();
  const passwordId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = useCallback(() => {
    const result = loginSchema.safeParse({ email, password });

    if (!result.success) {
      const newErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as "email" | "password";
        newErrors[field] = t(err.message);
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [email, password, t]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Client-side validation
      if (!validateForm()) {
        return;
      }

      setIsLoading(true);

      try {
        // Call custom onSubmit if provided (for testing)
        if (onSubmit) {
          await onSubmit({ email, password });
          setIsLoading(false);
          return;
        }

        // Call login API endpoint
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          // API returned an error
          const errorMessage = data.error ? t(data.error) : t("auth.errors.unexpectedError");
          toast.error(errorMessage);
          setIsLoading(false);
          return;
        }

        // Success! Show toast and redirect
        toast.success(t("auth.success.loginSuccess"));

        // Small delay to let toast show, then redirect
        setTimeout(() => {
          window.location.href = "/decks";
        }, 500);
      } catch (error) {
        // Network error or unexpected issue
        console.error("Login error:", error);
        toast.error(t("auth.errors.networkError"));
        setIsLoading(false);
      }
    },
    [email, password, onSubmit, validateForm, t]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
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
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor={passwordId} className="block text-sm font-medium text-foreground">
            {t("auth.password")}
          </label>
          <a href="/auth/reset-password" className="text-xs text-primary hover:underline">
            {t("auth.forgotPassword")}
          </a>
        </div>
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
        {errors.password && (
          <p id={passwordErrorId} className="mt-1 text-xs text-destructive" role="alert">
            {errors.password}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t("auth.signingIn") : t("auth.login")}
      </Button>

      {/* Divider */}
      <div className="flex items-center">
        <div className="flex-1 border-t border-border"></div>
        <span className="px-4 text-xs text-muted-foreground">{t("auth.or")}</span>
        <div className="flex-1 border-t border-border"></div>
      </div>

      {/* Sign Up Link */}
      <p className="text-center text-sm text-muted-foreground">
        {t("auth.dontHaveAccount")}{" "}
        <a href="/auth/register" className="font-medium text-primary hover:underline">
          {t("auth.signup")}
        </a>
      </p>
    </form>
  );
}

/**
 * Login form component that provides i18n context to LoginFormInner
 * Follows the same pattern as Header.tsx for proper context wrapping
 */
export function LoginForm({ lang, onSubmit }: LoginFormWrapperProps) {
  return (
    <I18nProvider lang={lang}>
      <LoginFormInner onSubmit={onSubmit} />
    </I18nProvider>
  );
}
