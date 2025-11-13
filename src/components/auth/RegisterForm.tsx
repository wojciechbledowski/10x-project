import { useState, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useI18n, I18nProvider } from "@/lib/i18n/react";
import { registerSchema } from "@/lib/auth/schemas";
import { toast } from "sonner";
import { TextField } from "./TextField";
import { PasswordField } from "./PasswordField";
import { RegistrationSuccess } from "./RegistrationSuccess";
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
    return <RegistrationSuccess onTryAgain={() => setIsSuccess(false)} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <TextField
        label={t("auth.fullName")}
        name="name"
        type="text"
        value={name}
        onChange={setName}
        error={errors.name}
        placeholder="John Doe"
        disabled={isLoading}
      />

      <TextField
        label={t("auth.email")}
        name="email"
        type="email"
        value={email}
        onChange={setEmail}
        error={errors.email}
        placeholder={t("auth.emailPlaceholder")}
        disabled={isLoading}
      />

      <PasswordField
        label={t("auth.password")}
        name="password"
        value={password}
        onChange={setPassword}
        error={errors.password}
        placeholder={t("auth.passwordPlaceholder")}
        disabled={isLoading}
        helperText={t("auth.passwordRequirement")}
      />

      <PasswordField
        label={t("auth.confirmPassword")}
        name="confirm-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        error={errors.confirmPassword}
        placeholder={t("auth.passwordPlaceholder")}
        disabled={isLoading}
      />

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
