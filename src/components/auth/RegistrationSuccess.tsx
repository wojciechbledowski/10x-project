import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/react";

interface RegistrationSuccessProps {
  onTryAgain: () => void;
}

/**
 * Success message displayed after successful registration
 */
export function RegistrationSuccess({ onTryAgain }: RegistrationSuccessProps) {
  const { t } = useI18n();

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
          <button type="button" className="text-primary hover:underline" onClick={onTryAgain}>
            {t("auth.tryAgain")}
          </button>
        </p>
      </div>
    </div>
  );
}
