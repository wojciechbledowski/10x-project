import { useErrorPage } from "./hooks/useErrorPage";
import { ActionButtons } from "./ActionButtons";
import { AlertCircle } from "lucide-react";
import { I18nProvider, useI18n } from "@/lib/i18n/react";
import type { Language } from "@/lib/i18n/config";

interface ErrorContentProps {
  message?: string;
  onRetry?: () => void;
  lang?: Language;
}

/**
 * Error page content component
 * Displays error message and recovery actions
 * Supports dark mode via Tailwind CSS classes
 */
function ErrorContentInner({ message, onRetry }: Omit<ErrorContentProps, "lang">) {
  const { t } = useI18n();
  const { isReloading, retry, hasSourcePage } = useErrorPage();

  const handleRetry = onRetry || retry;
  const displayMessage = message && message.length <= 255 ? message : t("error.somethingWentWrong");

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center">
        {/* Error Illustration */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <AlertCircle className="h-16 w-16 text-destructive" aria-hidden="true" />
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">{t("error.unexpectedError")}</h1>
          <p className="text-muted-foreground">{displayMessage}</p>
        </div>

        {/* Action Buttons */}
        <ActionButtons isReloading={isReloading} onRetry={handleRetry} showRetry={hasSourcePage} />
      </div>
    </div>
  );
}

export function ErrorContent({ message, onRetry, lang = "en" }: ErrorContentProps) {
  return (
    <I18nProvider lang={lang}>
      <ErrorContentInner message={message} onRetry={onRetry} />
    </I18nProvider>
  );
}
