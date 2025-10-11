import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { RotateCw, Home } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";

interface ActionButtonsProps {
  isReloading: boolean;
  onRetry: () => void;
  showRetry?: boolean; // Whether to show the retry button
}

/**
 * Action buttons for error page recovery
 */
export function ActionButtons({ isReloading, onRetry, showRetry = true }: ActionButtonsProps) {
  const { t } = useI18n();

  // Initialize as online to match server render, then update on client
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Update offline status on client
    setIsOffline(!navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleGoHome = () => {
    // Clear error source page when going home
    sessionStorage.removeItem("errorSourcePage");
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
      {showRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          disabled={isReloading || isOffline}
          className="min-w-[140px]"
          aria-label={isOffline ? t("error.cannotRetryOffline") : t("error.retryPageTitle")}
          title={isOffline ? t("error.offline") : undefined}
        >
          {isReloading ? (
            <>
              <RotateCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              {t("common.loading")}
            </>
          ) : (
            <>
              <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("error.retry")}
            </>
          )}
        </Button>
      )}

      <Button
        variant="default"
        onClick={handleGoHome}
        disabled={isReloading}
        className="min-w-[140px]"
        aria-label={t("error.home")}
      >
        <Home className="mr-2 h-4 w-4" aria-hidden="true" />
        {t("error.home")}
      </Button>
    </div>
  );
}
