import { useState, useCallback, useId, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useI18n, I18nProvider } from "@/lib/i18n/react";
import { resetRequestSchema } from "@/lib/auth/schemas";
import { toast } from "sonner";
import type { Language } from "@/lib/i18n/config";

interface RequestResetFormProps {
  onSubmit?: (data: { email: string }) => void;
}

interface RequestResetFormWrapperProps extends RequestResetFormProps {
  lang: Language;
}

/**
 * Form inner component to request a password reset email
 * Simple form with just email field
 */
function RequestResetFormInner({ onSubmit }: RequestResetFormProps) {
  const { t } = useI18n();
  const emailId = useId();
  const emailErrorId = useId();

  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = useCallback(() => {
    const result = resetRequestSchema.safeParse({ email });

    if (!result.success) {
      const newErrors: { email?: string } = {};
      result.error.errors.forEach((err) => {
        newErrors.email = t(err.message);
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [email, t]);

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
          await onSubmit({ email });
          setIsLoading(false);
          setIsSuccess(true);
          return;
        }

        // Call reset password API endpoint
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
          // API returned an error
          const errorMessage = data.error ? t(data.error) : t("auth.errors.unexpectedError");
          toast.error(errorMessage);
          setIsLoading(false);
          return;
        }

        // Success! Show success state
        setIsSuccess(true);
      } catch (error) {
        // Network error or unexpected issue
        // eslint-disable-next-line no-console
        console.error("Reset password request error:", error);
        toast.error(t("auth.errors.networkError"));
        setIsLoading(false);
      }
    },
    [email, onSubmit, validateForm, t]
  );

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="rounded-lg bg-primary/10 p-4">
          <p className="text-sm text-foreground">
            {t("auth.success.resetEmailSent")} <strong>{email}</strong>
            {t("auth.success.resetEmailSentSuffix")}
          </p>
        </div>

        <div className="text-center">
          <a href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
            ← {t("legal.backToLogin")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
      </Button>

      <div className="text-center">
        <a href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
          ← {t("legal.backToLogin")}
        </a>
      </div>
    </form>
  );
}

/**
 * Request reset form component that provides i18n context to RequestResetFormInner
 * Follows the same pattern as Header.tsx for proper context wrapping
 */
export function RequestResetForm({ lang, onSubmit }: RequestResetFormWrapperProps) {
  return (
    <I18nProvider lang={lang}>
      <RequestResetFormInner onSubmit={onSubmit} />
    </I18nProvider>
  );
}
