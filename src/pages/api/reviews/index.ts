import type { APIRoute } from "astro";

import type { ReviewResponse } from "../../../types";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { ReviewService } from "../../../lib/services/reviewService";
import { createErrorResponse, createJsonResponse } from "../../../lib/utils/apiResponse";
import { ConsoleLogger } from "../../../lib/utils/logger";
import { createReviewRequestSchema } from "../../../lib/reviews/schemas";

export const prerender = false;

const logger = new ConsoleLogger("ReviewSubmitApi");

export const POST: APIRoute = async ({ locals, cookies, request }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated review submission attempt");
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  // Parse and validate request body
  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch (error) {
    logger.warn("Invalid JSON in review submission request", {
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return createErrorResponse(400, {
      code: "INVALID_JSON",
      message: "Request body must be valid JSON",
    });
  }

  // Validate request body against schema
  const validation = createReviewRequestSchema.safeParse(requestBody);
  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    logger.warn("Invalid review submission request", {
      userId: locals.user.id,
      issues,
    });
    return createErrorResponse(400, {
      code: "VALIDATION_ERROR",
      message: "Invalid request parameters",
      details: issues,
    });
  }

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

  const reviewService = new ReviewService(supabase);

  try {
    const response = await reviewService.submitReview(locals.user.id, validation.data);
    logger.info("Review submitted successfully", {
      userId: locals.user.id,
      reviewId: response.id,
      flashcardId: response.flashcardId,
      quality: response.quality,
      newIntervalDays: response.flashcard.intervalDays,
    });
    return createJsonResponse<ReviewResponse>(201, response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage === "FLASHCARD_NOT_FOUND") {
      logger.warn("Review submission failed - flashcard not found", {
        userId: locals.user.id,
        flashcardId: validation.data.flashcardId,
      });
      return createErrorResponse(404, {
        code: "FLASHCARD_NOT_FOUND",
        message: "Flashcard not found or access denied",
      });
    }

    logger.error("Review submission failed", {
      userId: locals.user.id,
      flashcardId: validation.data.flashcardId,
      error: errorMessage,
    });

    return createErrorResponse(500, {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    });
  }
};
