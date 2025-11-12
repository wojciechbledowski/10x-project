import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ReviewSessionCardVM } from "../../types";
import { useI18n } from "../../lib/i18n/react";

/**
 * Props for the ReviewCard component
 */
interface ReviewCardProps {
  /** Current card data and display state */
  card: ReviewSessionCardVM;
  /** Callback when card is flipped */
  onFlip: () => void;
}

/**
 * ReviewCard component displays a flashcard with front/back content and flip animation.
 * Handles click and keyboard interactions for revealing the answer.
 */
export function ReviewCard({ card, onFlip }: ReviewCardProps) {
  const { t } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  /**
   * Handle card click to flip
   */
  const handleCardClick = useCallback(
    (event: React.MouseEvent) => {
      // Prevent flip if already flipped or animating
      if (card.isFlipped || isAnimating) return;

      event.preventDefault();
      setIsAnimating(true);

      // Trigger flip after a brief delay for animation
      setTimeout(() => {
        onFlip();
        setIsAnimating(false);
      }, 150);
    },
    [card.isFlipped, isAnimating, onFlip]
  );

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
  }, []);

  /**
   * Handle touch end - detect tap vs swipe
   */
  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (!touchStartX || !touchStartY || card.isFlipped || isAnimating) {
        setTouchStartX(null);
        setTouchStartY(null);
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // If movement is small (less than 10px), treat as tap
      if (distance < 10) {
        event.preventDefault();
        setIsAnimating(true);
        setTimeout(() => {
          onFlip();
          setIsAnimating(false);
        }, 150);
      }

      setTouchStartX(null);
      setTouchStartY(null);
    },
    [touchStartX, touchStartY, card.isFlipped, isAnimating, onFlip]
  );

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Space key to flip card
      if (event.code === "Space" && !card.isFlipped && !isAnimating) {
        event.preventDefault();
        setIsAnimating(true);

        setTimeout(() => {
          onFlip();
          setIsAnimating(false);
        }, 150);
      }
    },
    [card.isFlipped, isAnimating, onFlip]
  );

  // Add keyboard event listener
  useEffect(() => {
    const cardElement = cardRef.current;
    if (cardElement) {
      cardElement.addEventListener("keydown", handleKeyDown);
      return () => cardElement.removeEventListener("keydown", handleKeyDown);
    }
  }, [handleKeyDown]);

  // Focus card when it becomes current
  useEffect(() => {
    if (cardRef.current && !card.isFlipped) {
      cardRef.current.focus();
    }
  }, [card.id, card.isFlipped]);

  return (
    <div className="flex justify-center">
      <div className="perspective-1000 w-full max-w-lg">
        <div
          ref={cardRef}
          className={`
            relative h-64 w-full cursor-pointer transform-style-preserve-3d transition-transform duration-500
            ${card.isFlipped ? "rotate-y-180" : ""}
            ${isAnimating ? "pointer-events-none" : ""}
            min-h-[44px] min-w-[44px] /* Ensure minimum touch target size */
            touch-manipulation no-select /* Optimize for touch devices */
          `}
          onClick={handleCardClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onKeyDown={(e) => e.preventDefault()} // Prevent default to avoid page scroll
          tabIndex={0}
          role="button"
          aria-label={
            card.isFlipped
              ? "Card showing answer. Press space or click to continue."
              : "Card showing question. Press space or click to reveal answer."
          }
          aria-live="polite"
        >
          {/* Front of card */}
          <div
            className={`
              absolute inset-0 backface-hidden rounded-lg border border-border bg-card p-8 shadow-lg
              flex items-center justify-center text-center
              ${card.showBack ? "hidden" : ""}
            `}
          >
            <div className="text-2xl font-medium text-card-foreground">{card.front}</div>
          </div>

          {/* Back of card */}
          <div
            className={`
              absolute inset-0 backface-hidden rotate-y-180 rounded-lg border border-border bg-card p-8 shadow-lg
              flex items-center justify-center text-center
              ${!card.showBack ? "hidden" : ""}
            `}
          >
            <div className="text-2xl font-medium text-card-foreground">{card.back}</div>
          </div>
        </div>

        {/* Flip hint */}
        {!card.isFlipped && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">{t("review.session.card.reveal")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
