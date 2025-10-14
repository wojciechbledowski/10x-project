import { useState, useCallback, useId, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useI18n, I18nProvider } from "@/lib/i18n/react";
import { resetPasswordSchema } from "@/lib/auth/schemas";
import { toast } from "sonner";
import type { Language } from "@/lib/i18n/config";

interface ResetPasswordFormProps {
  token: string;
  onSubmit?: (data: { token: string; password: string }) => void;
}

interface ResetPasswordFormWrapperProps extends ResetPasswordFormProps {
  lang: Language;
}

/**
 * Form inner component to set a new password after clicking the reset link
 * Includes password and confirm password fields with validation
 */
function ResetPasswordFormInner({ token, onSubmit }: ResetPasswordFormProps) {
  const { t } = useI18n();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const passwordErrorId = useId();
  const confirmPasswordErrorId = useId();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = useCallback(() => {
    const result = resetPasswordSchema.safeParse({ password, confirmPassword });

    if (!result.success) {
      const newErrors: { password?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as "password" | "confirmPassword";
        newErrors[field] = t(err.message);
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [password, confirmPassword, t]);

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
          await onSubmit({ token, password });
          setIsLoading(false);
          return;
        }

        // Call reset password with token API endpoint
        const response = await fetch(`/api/auth/reset-password/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password, confirmPassword: confirmPassword }),
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
        toast.success(t("auth.success.passwordReset"));

        // Small delay to let toast show, then redirect
        setTimeout(() => {
          window.location.href = "/auth/login";
        }, 500);
      } catch (error) {
        // Network error or unexpected issue
        // eslint-disable-next-line no-console
        console.error("Reset password error:", error);
        toast.error(t("auth.errors.networkError"));
      } finally {
        setIsLoading(false);
      }
    },
    [token, password, confirmPassword, onSubmit, validateForm, t]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor={passwordId} className="mb-2 block text-sm font-medium text-foreground">
          {t("profile.newPassword")}
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
        {isLoading ? t("auth.resettingPassword") : t("auth.resetPassword")}
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
 * Reset password form component that provides i18n context to ResetPasswordFormInner
 * Follows the same pattern as Header.tsx for proper context wrapping
 */
export function ResetPasswordForm({ lang, token, onSubmit }: ResetPasswordFormWrapperProps) {
  return (
    <I18nProvider lang={lang}>
      <ResetPasswordFormInner token={token} onSubmit={onSubmit} />
    </I18nProvider>
  );
}
