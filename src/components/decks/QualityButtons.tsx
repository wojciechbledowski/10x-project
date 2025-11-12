import React, { useCallback, useEffect, useRef, useMemo } from "react";
import type { QualityScore, QualityButtonConfig } from "../../types";
import { useI18n } from "../../lib/i18n/react";

/**
 * Props for the QualityButtons component
 */
interface QualityButtonsProps {
  /** Callback when quality is selected */
  onQualitySelect: (score: QualityScore) => void;
  /** Loading state during submission */
  isSubmitting: boolean;
  /** Overall disabled state */
  disabled?: boolean;
}

/**
 * QualityButtons component provides 6 quality rating buttons for SM-2 algorithm.
 * Handles keyboard shortcuts (1-6) and provides proper accessibility.
 */
export function QualityButtons({ onQualitySelect, isSubmitting, disabled = false }: QualityButtonsProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Create quality buttons configuration with translations
  const qualityButtons = useMemo<QualityButtonConfig[]>(
    () => [
      {
        score: 0,
        label: t("review.session.quality.again"),
        description: "Complete blackout - start over",
        color: "bg-red-500 hover:bg-red-600 focus-visible:bg-red-600",
      },
      {
        score: 1,
        label: t("review.session.quality.hard"),
        description: "Incorrect response, but recognized the answer",
        color: "bg-orange-500 hover:bg-orange-600 focus-visible:bg-orange-600",
      },
      {
        score: 2,
        label: t("review.session.quality.good"),
        description: "Correct response with serious difficulty",
        color: "bg-yellow-500 hover:bg-yellow-600 focus-visible:bg-yellow-600",
      },
      {
        score: 3,
        label: t("review.session.quality.good"),
        description: "Correct response after hesitation",
        color: "bg-blue-500 hover:bg-blue-600 focus-visible:bg-blue-600",
      },
      {
        score: 4,
        label: t("review.session.quality.easy"),
        description: "Correct response with ease",
        color: "bg-green-500 hover:bg-green-600 focus-visible:bg-green-600",
      },
      {
        score: 5,
        label: t("review.session.quality.perfect"),
        description: "Perfect response",
        color: "bg-emerald-500 hover:bg-emerald-600 focus-visible:bg-emerald-600",
      },
    ],
    [t]
  );

  /**
   * Handle keyboard navigation within quality buttons
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only handle if not submitting and not disabled
      if (isSubmitting || disabled) return;

      // Handle number keys 1-6 for scores 0-5
      const key = event.key;
      if (key >= "1" && key <= "6") {
        event.preventDefault();
        const score = (parseInt(key) - 1) as QualityScore;
        onQualitySelect(score);
        return;
      }

      // Handle arrow key navigation between buttons
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();

        const currentIndex = buttonRefs.current.findIndex((ref) => ref === document.activeElement);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;

        switch (event.key) {
          case "ArrowRight":
          case "ArrowDown":
            nextIndex = (currentIndex + 1) % 6;
            break;
          case "ArrowLeft":
          case "ArrowUp":
            nextIndex = currentIndex === 0 ? 5 : currentIndex - 1;
            break;
        }

        buttonRefs.current[nextIndex]?.focus();
      }

      // Handle Enter/Space to select current button
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const currentButton = document.activeElement as HTMLButtonElement;
        if (currentButton && buttonRefs.current.includes(currentButton)) {
          const index = buttonRefs.current.indexOf(currentButton);
          if (index >= 0) {
            onQualitySelect(index as QualityScore);
          }
        }
      }
    },
    [onQualitySelect, isSubmitting, disabled]
  );

  // Add keyboard event listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("keydown", handleKeyDown);
      return () => container.removeEventListener("keydown", handleKeyDown);
    }
  }, [handleKeyDown]);

  // Focus management - focus first button when component becomes enabled
  useEffect(() => {
    if (!isSubmitting && !disabled && buttonRefs.current[0]) {
      buttonRefs.current[0].focus();
    }
  }, [isSubmitting, disabled]);

  /**
   * Handle button click
   */
  const handleButtonClick = useCallback(
    (score: QualityScore) => {
      if (isSubmitting || disabled) return;
      onQualitySelect(score);
    },
    [onQualitySelect, isSubmitting, disabled]
  );

  return (
    <div className="w-full max-w-2xl">
      {/* Quality buttons grid */}
      <div
        ref={containerRef}
        className="grid grid-cols-3 gap-3 touch-manipulation"
        role="group"
        aria-label="Rate your recall quality. Use number keys 1-6 or arrow keys to navigate."
      >
        {qualityButtons.map((config, index) => (
          <button
            key={config.score}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            onClick={() => handleButtonClick(config.score)}
            disabled={isSubmitting || disabled}
            className={`
              relative rounded-lg border border-border p-4 text-center transition-all duration-200
              disabled:cursor-not-allowed disabled:opacity-50
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              ${config.color}
              text-white shadow-sm hover:shadow-md active:scale-95
              min-h-[48px] min-w-[48px] /* Ensure minimum touch target size on mobile */
              sm:min-h-[44px] sm:min-w-[44px] /* Slightly smaller on larger screens */
            `}
            aria-label={`Rate as ${config.label}: ${config.description}. Press ${index + 1} or use arrow keys to navigate.`}
          >
            {/* Score number */}
            <div className="text-2xl font-bold mb-1">{config.score}</div>

            {/* Label */}
            <div className="text-sm font-medium">{config.label}</div>

            {/* Loading indicator */}
            {isSubmitting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Keyboard hints */}
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          {t("review.session.card.rate")} • Use arrow keys to navigate • Press Enter or Space to select
        </p>
      </div>
    </div>
  );
}
