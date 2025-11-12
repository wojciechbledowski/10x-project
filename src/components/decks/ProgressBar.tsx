import React, { useMemo } from "react";
import type { ProgressData } from "../../types";
import { useI18n } from "../../lib/i18n/react";

/**
 * Props for the ProgressBar component
 */
interface ProgressBarProps {
  /** Current card index (1-based) */
  current: number;
  /** Total cards in session */
  total: number;
  /** Optional styling classes */
  className?: string;
}

/**
 * ProgressBar component displays visual progress indicator with completion percentage and statistics.
 */
export function ProgressBar({ current, total, className = "" }: ProgressBarProps) {
  const { t } = useI18n();

  // Calculate progress data
  const progressData: ProgressData = useMemo(() => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    return {
      current,
      total,
      percentage,
    };
  }, [current, total]);

  // Calculate estimated time remaining (rough estimate based on average 30 seconds per card)
  const estimatedTimeRemaining = useMemo(() => {
    const remainingCards = total - current;
    if (remainingCards <= 0) return null;

    const estimatedSeconds = remainingCards * 30; // 30 seconds per card average
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = estimatedSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [current, total]);

  // Handle edge cases
  if (total === 0) {
    return (
      <div className={`w-full ${className}`}>
        <div className="text-center text-muted-foreground">No cards to review</div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Progress text */}
      <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Card {current} of {total}
        </span>
        {estimatedTimeRemaining && (
          <span>{t("review.session.progress.remaining", { time: estimatedTimeRemaining })}</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progressData.percentage}%` }}
            role="progressbar"
            aria-valuenow={progressData.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Review progress: ${progressData.percentage}% complete`}
          />
        </div>

        {/* Percentage text overlay for larger screens */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-primary-foreground hidden sm:block">
            {progressData.percentage}%
          </span>
        </div>
      </div>

      {/* Completion message */}
      {current === total && total > 0 && (
        <div className="mt-2 text-center text-sm text-green-600 dark:text-green-400">
          {t("review.session.progress.complete")}
        </div>
      )}
    </div>
  );
}
