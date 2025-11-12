import { useCallback, useEffect, useState, useRef } from "react";
import type {
  ReviewQueueResponse,
  CreateReviewRequest,
  ReviewSessionCardVM,
  ReviewSessionVM,
  QualityScore,
} from "../../types";

/**
 * Hook for managing review session state and operations
 */
export function useReviewSession() {
  // Queue and session state
  const [queue, setQueue] = useState<ReviewQueueResponse | null>(null);
  const [currentCard, setCurrentCard] = useState<ReviewSessionCardVM | null>(null);
  const [sessionProgress, setSessionProgress] = useState<ReviewSessionVM>({
    currentCardIndex: 0,
    totalCards: 0,
    completedCards: 0,
    sessionStartTime: new Date(),
    averageLatencyMs: 0,
  });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track review start time for latency calculation
  const reviewStartTimeRef = useRef<number | null>(null);

  /**
   * Load the review queue from API with retry logic
   */
  const loadQueue = useCallback(async (retryCount = 0): Promise<void> => {
    const maxRetries = 3;
    const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/reviews/queue", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required. Please sign in again.");
        }
        if (response.status === 429) {
          throw new Error("Too many requests. Please wait a moment and try again.");
        }
        if (response.status >= 500 && retryCount < maxRetries) {
          // Server error - retry with backoff
          console.warn(`Review queue load failed (attempt ${retryCount + 1}), retrying in ${retryDelay}ms`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          return loadQueue(retryCount + 1);
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to load review queue (HTTP ${response.status})`);
      }

      const data: ReviewQueueResponse = await response.json();

      // Handle empty queue
      if (data.totalDue === 0) {
        setQueue(data);
        setCurrentCard(null);
        setSessionProgress({
          currentCardIndex: 0,
          totalCards: 0,
          completedCards: 0,
          sessionStartTime: new Date(),
          averageLatencyMs: 0,
        });
        return;
      }

      // Validate queue data
      if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
        throw new Error("Invalid review queue data received");
      }

      // Initialize session with first card
      const firstCard: ReviewSessionCardVM = {
        id: data.data[0].id,
        front: data.data[0].front || "No front content",
        back: data.data[0].back || "No back content",
        source: data.data[0].source,
        isFlipped: false,
        showBack: false,
      };

      setQueue(data);
      setCurrentCard(firstCard);
      setSessionProgress({
        currentCardIndex: 0,
        totalCards: data.totalDue,
        completedCards: 0,
        sessionStartTime: new Date(),
        averageLatencyMs: 0,
      });

      // Start latency tracking for first card
      reviewStartTimeRef.current = Date.now();
    } catch (err) {
      const error = err as Error;
      console.error("Failed to load review queue:", error);

      // Log client error for monitoring
      try {
        const { logClientError } = await import("../../lib/logClientError");
        await logClientError({
          path: "/review",
          message: error.message,
          stack: error.stack,
          userAgent: navigator.userAgent,
        });
      } catch (logError) {
        console.error("Failed to log error:", logError);
      }

      const errorMessage = error.message || "Failed to load review queue";
      setError(errorMessage);
      setQueue(null);
      setCurrentCard(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Submit a quality review and advance to next card
   */
  const submitReview = useCallback(
    async (quality: QualityScore, retryCount = 0): Promise<void> => {
      if (!currentCard || !queue) {
        throw new Error("No current card to review");
      }

      // Calculate latency
      const latencyMs = reviewStartTimeRef.current ? Date.now() - reviewStartTimeRef.current : 0;

      try {
        setIsSubmitting(true);
        setError(null);

        const request: CreateReviewRequest = {
          flashcardId: currentCard.id,
          quality,
          latencyMs,
        };

        const response = await fetch("/api/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication expired. Please sign in again.");
          }
          if (response.status === 404) {
            throw new Error("Card not found. It may have been deleted.");
          }
          if (response.status === 429) {
            throw new Error("Too many reviews submitted. Please wait a moment.");
          }
          if (response.status >= 500 && retryCount < 2) {
            // Server error - retry with exponential backoff
            const retryDelay = Math.pow(2, retryCount) * 1000;
            console.warn(`Review submission failed (attempt ${retryCount + 1}), retrying in ${retryDelay}ms`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            return submitReview(quality, retryCount + 1);
          }

          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Failed to submit review (HTTP ${response.status})`);
        }

        // Update session progress
        const newCompletedCards = sessionProgress.completedCards + 1;
        const newAverageLatency =
          (sessionProgress.averageLatencyMs * sessionProgress.completedCards + latencyMs) / newCompletedCards;

        // Check if session is complete
        if (newCompletedCards >= sessionProgress.totalCards) {
          // Session complete - clear current card
          setCurrentCard(null);
          setSessionProgress({
            ...sessionProgress,
            completedCards: newCompletedCards,
            averageLatencyMs: newAverageLatency,
          });
          return;
        }

        // Move to next card
        const nextCardIndex = sessionProgress.currentCardIndex + 1;
        const nextCardData = queue.data[nextCardIndex];

        if (!nextCardData) {
          // This shouldn't happen if our progress tracking is correct
          throw new Error("Next card not found in queue");
        }

        const nextCard: ReviewSessionCardVM = {
          id: nextCardData.id,
          front: nextCardData.front,
          back: nextCardData.back,
          source: nextCardData.source,
          isFlipped: false,
          showBack: false,
        };

        setCurrentCard(nextCard);
        setSessionProgress({
          ...sessionProgress,
          currentCardIndex: nextCardIndex,
          completedCards: newCompletedCards,
          averageLatencyMs: newAverageLatency,
        });

        // Start latency tracking for next card
        reviewStartTimeRef.current = Date.now();
      } catch (err) {
        const error = err as Error;
        console.error("Failed to submit review:", error);

        // Log client error for monitoring
        try {
          const { logClientError } = await import("../../lib/logClientError");
          await logClientError({
            path: "/review",
            message: error.message,
            stack: error.stack,
            userAgent: navigator.userAgent,
          });
        } catch (logError) {
          console.error("Failed to log error:", logError);
        }

        const errorMessage = error.message || "Failed to submit review";
        setError(errorMessage);
        // Don't advance on error - allow retry
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentCard, queue, sessionProgress]
  );

  /**
   * Flip the current card to show back
   */
  const flipCard = useCallback(() => {
    if (!currentCard) return;

    setCurrentCard({
      ...currentCard,
      isFlipped: true,
      showBack: true,
    });
  }, [currentCard]);

  /**
   * Exit the review session and navigate back to decks
   */
  const exitSession = useCallback(async (): Promise<void> => {
    // Clear the session state
    setQueue(null);
    setCurrentCard(null);
    setSessionProgress({
      currentCardIndex: 0,
      totalCards: 0,
      completedCards: 0,
      sessionStartTime: new Date(),
      averageLatencyMs: 0,
    });
    setError(null);

    // Navigate back to the decks page
    window.location.href = "/decks";
  }, []);

  /**
   * Get the next card in the queue (for internal use)
   */
  const getNextCard = useCallback((): ReviewSessionCardVM | null => {
    if (!queue || sessionProgress.currentCardIndex + 1 >= queue.totalDue) {
      return null;
    }

    const nextCardData = queue.data[sessionProgress.currentCardIndex + 1];
    if (!nextCardData) return null;

    return {
      id: nextCardData.id,
      front: nextCardData.front,
      back: nextCardData.back,
      source: nextCardData.source,
      isFlipped: false,
      showBack: false,
    };
  }, [queue, sessionProgress.currentCardIndex]);

  // Load queue on mount
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  return {
    // State
    queue,
    currentCard,
    sessionProgress,
    isLoading,
    isSubmitting,
    error,

    // Actions
    loadQueue,
    submitReview,
    flipCard,
    exitSession,
    getNextCard,
  };
}
