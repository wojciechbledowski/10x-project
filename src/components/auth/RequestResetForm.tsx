import { useState, useCallback, useId, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useI18n, I18nProvider } from "@/lib/i18n/react";
import { resetRequestSchema } from "@/lib/auth/schemas";
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

      if (!validateForm()) {
        return;
      }

      setIsLoading(true);

      // Call the onSubmit handler if provided (will connect to API later)
      if (onSubmit) {
        await onSubmit({ email });
      }

      setIsLoading(false);
      setIsSuccess(true);
    },
    [email, onSubmit, validateForm]
  );

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="rounded-lg bg-primary/10 p-4">
          <p className="text-sm text-foreground">
            If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
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
