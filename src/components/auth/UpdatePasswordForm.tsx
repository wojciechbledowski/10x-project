import { useState, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useI18n, I18nProvider } from "@/lib/i18n/react";
import { updatePasswordSchema } from "@/lib/auth/schemas";
import { toast } from "sonner";
import { PasswordField } from "./PasswordField";
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
      <PasswordField
        label={t("profile.currentPassword")}
        name="currentPassword"
        value={currentPassword}
        onChange={setCurrentPassword}
        error={errors.currentPassword}
        placeholder={t("auth.passwordPlaceholder")}
        disabled={isLoading}
      />

      <PasswordField
        label={t("profile.newPassword")}
        name="newPassword"
        value={newPassword}
        onChange={setNewPassword}
        error={errors.newPassword}
        placeholder={t("auth.passwordPlaceholder")}
        disabled={isLoading}
      />

      <PasswordField
        label={t("profile.confirmNewPassword")}
        name="confirmPassword"
        value={confirmPassword}
        onChange={setConfirmPassword}
        error={errors.confirmPassword}
        placeholder={t("auth.passwordPlaceholder")}
        disabled={isLoading}
      />

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
