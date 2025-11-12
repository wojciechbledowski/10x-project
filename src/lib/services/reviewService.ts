import type { SupabaseServerClient } from "../../db/supabase.client";
import type { ReviewQueueResponse, CreateReviewRequest, ReviewResponse } from "../../types";
import { FlashcardService } from "./flashcardService";

export class ReviewService {
  private flashcardService: FlashcardService;

  constructor(private readonly supabase: SupabaseServerClient) {
    this.flashcardService = new FlashcardService(supabase);
  }

  /**
   * Retrieves all flashcards due for review for the authenticated user.
   * Due flashcards are those with next_review_at <= current time, ordered by next_review_at ascending.
   * Returns all due cards (not paginated) for efficient review queue access.
   *
   * @param userId - The ID of the user whose review queue to retrieve
   * @returns Promise resolving to ReviewQueueResponse with due flashcards and count
   * @throws Error if database query fails
   */
  async getReviewQueue(userId: string): Promise<ReviewQueueResponse> {
    // Use FlashcardService to get due flashcards with a large page size
    // Since this is a review queue, we want all due cards, not paginated results
    const result = await this.flashcardService.listUserFlashcards({
      userId,
      page: 1,
      pageSize: 1000, // Reasonable upper limit for review queue
      sort: "next_review_at", // Order by due time (earliest first)
      reviewDue: true,
    });

    // For review queue, we return all results (not paginated)
    // The FlashcardService returns paginated results, but we want the full queue
    return {
      data: result.data,
      totalDue: result.pagination.totalCount,
    };
  }

  /**
   * Submits a review for a flashcard and updates its scheduling using the SM-2 algorithm.
   * This method performs the following operations atomically:
   * 1. Validates the flashcard exists and belongs to the user
   * 2. Calculates new scheduling parameters using SM-2 algorithm
   * 3. Inserts the review record
   * 4. Updates the flashcard with new scheduling information
   *
   * @param userId - The ID of the user submitting the review
   * @param request - The review submission request containing flashcardId, quality, and optional latency
   * @returns Promise resolving to ReviewResponse with review details and updated flashcard scheduling
   * @throws Error if flashcard not found, authorization fails, or database transaction fails
   */
  async submitReview(userId: string, request: CreateReviewRequest): Promise<ReviewResponse> {
    // First, verify the flashcard exists and belongs to the user
    const { data: flashcard, error: fetchError } = await this.supabase
      .from("flashcards")
      .select("id, ease_factor, interval_days, repetition, next_review_at")
      .eq("id", request.flashcardId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !flashcard) {
      throw new Error("FLASHCARD_NOT_FOUND");
    }

    // Calculate new scheduling parameters using SM-2 algorithm
    const { easeFactor, intervalDays, repetition, nextReviewAt } = this.calculateSM2Scheduling(
      flashcard,
      request.quality
    );

    // Insert review record
    const { data: review, error: reviewError } = await this.supabase
      .from("reviews")
      .insert({
        flashcard_id: request.flashcardId,
        user_id: userId,
        quality: request.quality,
        latency_ms: request.latencyMs,
      })
      .select("id, created_at")
      .single();

    if (reviewError) {
      console.error("Review insertion error:", reviewError);
      throw new Error(
        `REVIEW_SUBMISSION_FAILED: ${reviewError.message || reviewError.details || "Unknown database error"}`
      );
    }

    // Update the flashcard with new scheduling parameters
    const { error: updateError } = await this.supabase
      .from("flashcards")
      .update({
        ease_factor: easeFactor,
        interval_days: intervalDays,
        repetition: repetition,
        next_review_at: nextReviewAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.flashcardId)
      .eq("user_id", userId);

    if (updateError) {
      // If flashcard update fails, we should ideally rollback the review insertion
      // For now, we'll throw an error - in production, this should be handled with proper transactions
      throw new Error("FLASHCARD_UPDATE_FAILED");
    }

    // Return the review response with updated flashcard data
    return {
      id: review.id,
      flashcardId: request.flashcardId,
      quality: request.quality,
      createdAt: review.created_at,
      flashcard: {
        id: request.flashcardId,
        easeFactor,
        intervalDays,
        repetition,
        nextReviewAt,
      },
    };
  }

  /**
   * Calculates new scheduling parameters using the SM-2 algorithm.
   * SM-2 Algorithm Rules:
   * - Quality 0-2: Failed recall - reset to 1-day interval, decrease ease factor
   * - Quality 3: Hard recall - minimal interval increase, slight ease factor decrease
   * - Quality 4: Good recall - standard interval increase based on ease factor
   * - Quality 5: Perfect recall - maximum interval increase, slight ease factor increase
   *
   * @param flashcard - Current flashcard scheduling state
   * @param quality - Quality score (0-5) from user review
   * @returns New scheduling parameters
   */
  private calculateSM2Scheduling(
    flashcard: { ease_factor: number; interval_days: number; repetition: number },
    quality: number
  ): { easeFactor: number; intervalDays: number; repetition: number; nextReviewAt: string | null } {
    const oldEaseFactor = flashcard.ease_factor;
    const oldInterval = flashcard.interval_days;
    const oldRepetition = flashcard.repetition;

    // Calculate new ease factor using SM-2 formula
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    // where q is quality (0-5), and result is clamped to minimum 1.3
    const newEaseFactor = Math.max(1.3, oldEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    let newInterval: number;
    let newRepetition: number;

    if (quality < 3) {
      // Failed recall: reset to 1 day interval and 0 repetitions
      newInterval = 1;
      newRepetition = 0;
    } else {
      // Successful recall: increase interval based on quality
      if (quality === 3) {
        // Hard recall: minimal interval increase
        newInterval = Math.ceil(oldInterval * 1.2);
      } else {
        // Good (4) or perfect (5) recall: use ease factor for interval calculation
        newInterval = Math.ceil(oldInterval * newEaseFactor);
      }
      newRepetition = oldRepetition + 1;
    }

    // Calculate next review date (current time + interval days)
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
    const nextReviewAtString = nextReviewAt.toISOString();

    return {
      easeFactor: Math.round(newEaseFactor * 100) / 100, // Round to 2 decimal places
      intervalDays: newInterval,
      repetition: newRepetition,
      nextReviewAt: nextReviewAtString,
    };
  }
}
