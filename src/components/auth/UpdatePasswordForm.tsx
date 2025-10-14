import { useState, useCallback, useId, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useI18n, I18nProvider } from "@/lib/i18n/react";
import { updatePasswordSchema } from "@/lib/auth/schemas";
import { toast } from "sonner";
import type { Language } from "@/lib/i18n/config";

interface UpdatePasswordFormProps {
  onSubmit?: (data: { currentPassword: string; newPassword: string }) => void;
}

interface UpdatePasswordFormWrapperProps extends UpdatePasswordFormProps {
  lang: Language;
}

/**
 * Update password form inner component with current password, new password, and confirm fields
 * Includes client-side validation, API integration, and error display
 */
function UpdatePasswordFormInner({ onSubmit }: UpdatePasswordFormProps) {
  const { t } = useI18n();
  const currentPasswordId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();
  const currentPasswordErrorId = useId();
  const newPasswordErrorId = useId();
  const confirmPasswordErrorId = useId();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = useCallback(() => {
    const result = updatePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmNewPassword: confirmPassword,
    });

    if (!result.success) {
      const newErrors: {
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
      } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as "currentPassword" | "newPassword" | "confirmPassword";
        newErrors[field] = t(err.message);
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [currentPassword, newPassword, confirmPassword, t]);

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
          await onSubmit({ currentPassword, newPassword });
          setIsLoading(false);
          return;
        }

        // Call update password API endpoint
        const response = await fetch("/api/auth/update-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword: confirmPassword }),
        });

        const data = await response.json();

        if (!response.ok) {
          // API returned an error
          const errorMessage = data.error ? t(data.error) : t("auth.errors.unexpectedError");
          toast.error(errorMessage);
          setIsLoading(false);
          return;
        }

        // Success! Show toast and reset form
        toast.success(t("profile.passwordUpdated"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (error) {
        // Network error or unexpected issue
        console.error("Update password error:", error);
        toast.error(t("auth.errors.networkError"));
      } finally {
        setIsLoading(false);
      }
    },
    [currentPassword, newPassword, confirmPassword, onSubmit, validateForm, t]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor={currentPasswordId} className="mb-2 block text-sm font-medium text-foreground">
          {t("profile.currentPassword")}
        </label>
        <input
          type="password"
          id={currentPasswordId}
          name="currentPassword"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
            errors.currentPassword ? "border-destructive" : "border-input bg-background"
          }`}
          placeholder={t("auth.passwordPlaceholder")}
          disabled={isLoading}
          aria-invalid={errors.currentPassword ? "true" : "false"}
          aria-describedby={errors.currentPassword ? currentPasswordErrorId : undefined}
        />
        {errors.currentPassword && (
          <p id={currentPasswordErrorId} className="mt-1 text-xs text-destructive" role="alert">
            {errors.currentPassword}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={newPasswordId} className="mb-2 block text-sm font-medium text-foreground">
          {t("profile.newPassword")}
        </label>
        <input
          type="password"
          id={newPasswordId}
          name="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
            errors.newPassword ? "border-destructive" : "border-input bg-background"
          }`}
          placeholder={t("auth.passwordPlaceholder")}
          disabled={isLoading}
          aria-invalid={errors.newPassword ? "true" : "false"}
          aria-describedby={errors.newPassword ? newPasswordErrorId : undefined}
        />
        {errors.newPassword && (
          <p id={newPasswordErrorId} className="mt-1 text-xs text-destructive" role="alert">
            {errors.newPassword}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={confirmPasswordId} className="mb-2 block text-sm font-medium text-foreground">
          {t("profile.confirmNewPassword")}
        </label>
        <input
          type="password"
          id={confirmPasswordId}
          name="confirmPassword"
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
        {isLoading ? t("profile.updatingPassword") : t("profile.updatePassword")}
      </Button>
    </form>
  );
}

/**
 * Update password form component that provides i18n context
 */
export function UpdatePasswordForm({ lang, onSubmit }: UpdatePasswordFormWrapperProps) {
  return (
    <I18nProvider lang={lang}>
      <UpdatePasswordFormInner onSubmit={onSubmit} />
    </I18nProvider>
  );
}
