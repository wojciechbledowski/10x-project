import React, { useState, useEffect, useCallback, useRef } from "react";
import { ReviewCard } from "./ReviewCard";
import { QualityButtons } from "./QualityButtons";
import { ProgressBar } from "./ProgressBar";
import { useReviewSession } from "../hooks/useReviewSession";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { I18nProvider, useI18n } from "../../lib/i18n/react";
import type { QualityScore } from "../../types";
import type { Language } from "../../lib/i18n/config";

/**
 * Inner ReviewSessionView component - contains the actual review logic
 */
function ReviewSessionViewInner() {
  const { t } = useI18n();
  const { queue, currentCard, sessionProgress, isLoading, isSubmitting, error, submitReview, flipCard, exitSession } =
    useReviewSession();

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  /**
   * Handle quality score selection
   */
  const handleQualitySelect = async (quality: QualityScore) => {
    await submitReview(quality);
  };

  /**
   * Handle exit confirmation
   */
  const handleExitConfirm = async () => {
    await exitSession();
    setShowExitConfirm(false);
  };

  /**
   * Handle global keyboard navigation
   */
  const handleGlobalKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle keyboard events if we're in a dialog or loading
      if (showExitConfirm || isLoading || isSubmitting) return;

      // Escape key - show exit confirmation
      if (event.key === "Escape") {
        event.preventDefault();
        setShowExitConfirm(true);
        return;
      }

      // Tab key - ensure focus stays within the review session
      if (event.key === "Tab") {
        // Focus management is handled by individual components
        // but we could add more sophisticated focus trapping here
      }
    },
    [showExitConfirm, isLoading, isSubmitting]
  );

  /**
   * Announce changes to screen readers
   */
  const announceToScreenReader = useCallback((message: string) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  }, []);

  // Add global keyboard listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("keydown", handleGlobalKeyDown);
      return () => container.removeEventListener("keydown", handleGlobalKeyDown);
    }
  }, [handleGlobalKeyDown]);

  // Announce card changes
  useEffect(() => {
    if (currentCard) {
      const cardNumber = sessionProgress.currentCardIndex + 1;
      const totalCards = sessionProgress.totalCards;
      announceToScreenReader(`Card ${cardNumber} of ${totalCards}. ${currentCard.front}`);
    }
  }, [currentCard, sessionProgress.currentCardIndex, sessionProgress.totalCards, announceToScreenReader]);

  // Focus management - focus the main container when session starts
  useEffect(() => {
    if (containerRef.current && !isLoading && currentCard) {
      containerRef.current.focus();
    }
  }, [isLoading, currentCard]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("review.session.loading")}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-destructive mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">{t("review.session.errorTitle")}</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => (window.location.href = "/decks")}>{t("review.session.tryAgain")}</Button>
        </div>
      </div>
    );
  }

  // Empty queue state
  if (!currentCard && queue && queue.totalDue === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">{t("review.session.emptyState.title")}</h2>
          <p className="text-muted-foreground mb-6">{t("review.session.emptyState.description")}</p>
          <div className="space-y-2 text-sm text-muted-foreground mb-4">
            <p>{t("review.session.emptyState.tip")}</p>
            <p>{t("review.session.emptyState.scheduling")}</p>
          </div>
          <Button onClick={() => (window.location.href = "/decks")}>{t("review.session.complete.backToDecks")}</Button>
        </div>
      </div>
    );
  }

  // Session complete state
  if (!currentCard && sessionProgress.totalCards > 0 && sessionProgress.completedCards === sessionProgress.totalCards) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold mb-2">{t("review.session.complete.title")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("review.session.complete.description", { count: sessionProgress.totalCards })}
          </p>
          <div className="space-y-2 text-sm text-muted-foreground mb-6">
            <p>{t("review.session.complete.averageTime", { time: Math.round(sessionProgress.averageLatencyMs) })}</p>
            <p>{t("review.session.complete.rescheduling")}</p>
          </div>
          <Button onClick={() => (window.location.href = "/decks")}>{t("review.session.complete.backToDecks")}</Button>
        </div>
      </div>
    );
  }

  // No current card (shouldn't happen in normal flow)
  if (!currentCard) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No card available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col"
      tabIndex={-1}
      role="application"
      aria-label="Daily review session"
      aria-live="polite"
    >
      {/* Screen reader announcements */}
      <div ref={liveRegionRef} aria-live="assertive" aria-atomic="true" className="sr-only" />

      {/* Header with progress and exit */}
      <header className="flex items-center justify-between p-3 sm:p-4 border-b" role="banner">
        <div className="flex-1 max-w-md">
          <ProgressBar current={sessionProgress.currentCardIndex + 1} total={sessionProgress.totalCards} />
        </div>

        <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("review.session.exit.confirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("review.session.exit.confirmDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("review.session.exit.continue")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleExitConfirm}>{t("review.session.exit.exit")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 space-y-6 sm:space-y-8" role="main">
        {/* Review Card */}
        <div className="w-full max-w-2xl">
          <ReviewCard card={currentCard} onFlip={flipCard} />
        </div>

        {/* Quality Buttons (only show after card is flipped) */}
        {currentCard.isFlipped && (
          <div className="w-full max-w-2xl">
            <QualityButtons
              onQualitySelect={handleQualitySelect}
              isSubmitting={isSubmitting}
              disabled={!currentCard.showBack}
            />
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * ReviewSessionView component orchestrates the entire review session.
 * Integrates all sub-components and manages session lifecycle.
 */
export function ReviewSessionView({ lang = "en" }: { lang?: Language }) {
  return (
    <I18nProvider lang={lang}>
      <ReviewSessionViewInner />
    </I18nProvider>
  );
}
