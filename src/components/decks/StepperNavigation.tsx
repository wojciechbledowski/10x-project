import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";
import type { StepperNavigationProps, CardStatus } from "@/types";

function StepperNavigationInner({ currentStep, totalSteps, onStepChange, cardStatuses }: StepperNavigationProps) {
  const { t } = useI18n();

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  }, [currentStep, onStepChange]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      onStepChange(currentStep + 1);
    }
  }, [currentStep, totalSteps, onStepChange]);

  const handleStepClick = useCallback(
    (step: number) => {
      onStepChange(step);
    },
    [onStepChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    },
    [handlePrevious, handleNext]
  );

  // Calculate progress percentage
  const progressPercentage = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  // Status indicator styles
  const getStatusClasses = (status: CardStatus, isActive: boolean) => {
    const baseClasses = "w-3 h-3 rounded-full border-2 transition-colors cursor-pointer";

    if (isActive) {
      return `${baseClasses} border-primary bg-primary`;
    }

    switch (status) {
      case "pending":
        return `${baseClasses} border-muted bg-background hover:border-muted-foreground`;
      case "accepted":
        return `${baseClasses} border-green-500 bg-green-500`;
      case "edited":
        return `${baseClasses} border-blue-500 bg-blue-500`;
      case "deleted":
        return `${baseClasses} border-red-500 bg-red-500`;
      default:
        return `${baseClasses} border-muted bg-background hover:border-muted-foreground`;
    }
  };

  // Generate step indicators
  const stepIndicators = Array.from({ length: totalSteps }, (_, index) => {
    const status = cardStatuses[index] || "pending";
    const isActive = index === currentStep;

    return (
      <button
        key={index}
        onClick={() => handleStepClick(index)}
        className={getStatusClasses(status, isActive)}
        aria-label={`${t("review.step")} ${index + 1} ${t("review.of")} ${totalSteps}`}
        title={`${t("review.step")} ${index + 1}: ${status}`}
      />
    );
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>{t("review.cardProgress", { current: currentStep + 1, total: totalSteps })}</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div
        className="flex items-center justify-center space-x-2 mb-6 overflow-x-auto pb-2"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="tablist"
        aria-label={t("review.cardNavigation")}
      >
        {stepIndicators}
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex items-center space-x-2"
          aria-label={t("review.previousCard")}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("review.previous")}</span>
        </Button>

        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span className="text-center">
            {t("review.stepIndicator", { current: currentStep + 1, total: totalSteps })}
          </span>

          {/* Status legend */}
          <div className="hidden md:flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full border border-muted bg-background" />
              <span>{t("review.status.pending")}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full border-2 border-green-500 bg-green-500" />
              <span>{t("review.status.accepted")}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full border-2 border-blue-500 bg-blue-500" />
              <span>{t("review.status.edited")}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full border-2 border-red-500 bg-red-500" />
              <span>{t("review.status.deleted")}</span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={currentStep === totalSteps - 1}
          className="flex items-center space-x-2"
          aria-label={t("review.nextCard")}
        >
          <span className="hidden sm:inline">{t("review.next")}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile status legend */}
      <div className="md:hidden flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full border border-muted bg-background" />
          <span>{t("review.status.pending")}</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full border-2 border-green-500 bg-green-500" />
          <span>{t("review.status.accepted")}</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full border-2 border-blue-500 bg-blue-500" />
          <span>{t("review.status.edited")}</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full border-2 border-red-500 bg-red-500" />
          <span>{t("review.status.deleted")}</span>
        </div>
      </div>
    </div>
  );
}

export function StepperNavigation(props: StepperNavigationProps) {
  return <StepperNavigationInner {...props} />;
}
