import type { APIRoute } from "astro";

import { flashcardIdParamsSchema, updateFlashcardBodySchema } from "../../../lib/flashcards/schemas";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { FlashcardService } from "../../../lib/services/flashcardService";
import { createErrorResponse, createJsonResponse } from "../../../lib/utils/apiResponse";
import { ConsoleLogger } from "../../../lib/utils/logger";
import type { FlashcardResponse } from "../../../types";

export const prerender = false;

const logger = new ConsoleLogger("GetFlashcardApi");

/**
 * GET /api/flashcards/{cardId}
 *
 * Retrieves a single flashcard by its unique identifier.
 * Only the flashcard owner may access their own flashcards.
 */
export const GET: APIRoute = async ({ params, locals, cookies, request }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated flashcard request", { params });
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const validation = flashcardIdParamsSchema.safeParse(params);

  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => issue.message);
    logger.warn("Invalid cardId provided", { issues, userId: locals.user.id });
    return createErrorResponse(400, {
      code: "INVALID_ID",
      message: "cardId must be a valid UUID",
      details: issues.map((message) => ({ message })),
    });
  }

  const { cardId } = validation.data;

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

  const flashcardService = new FlashcardService(supabase);

  try {
    const flashcard = await flashcardService.getFlashcard(cardId);

    if (!flashcard) {
      logger.info("Flashcard not found", { cardId, userId: locals.user.id });
      return createErrorResponse(404, {
        code: "NOT_FOUND",
        message: "Flashcard not found",
      });
    }

    logger.info("Flashcard retrieved", { cardId, userId: locals.user.id });
    return createJsonResponse<FlashcardResponse>(200, flashcard);
  } catch (error) {
    logger.error("Failed to retrieve flashcard", {
      cardId,
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createErrorResponse(500, {
      code: "SERVER_ERROR",
      message: "Unexpected error",
    });
  }
};

/**
 * DELETE /api/flashcards/{cardId}
 *
 * Soft-deletes the specified flashcard by setting its deleted_at timestamp.
 * Only the flashcard owner may perform this action.
 * Operation is idempotent: attempting to delete an already-deleted flashcard returns 409.
 */
export const DELETE: APIRoute = async ({ params, locals, cookies, request }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated flashcard delete request", { params });
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const validation = flashcardIdParamsSchema.safeParse(params);

  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => issue.message);
    logger.warn("Invalid cardId provided", { issues, userId: locals.user.id });
    return createErrorResponse(400, {
      code: "INVALID_ID",
      message: "cardId must be a valid UUID",
      details: issues.map((message) => ({ message })),
    });
  }

  const { cardId } = validation.data;

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

  const flashcardService = new FlashcardService(supabase);

  try {
    const deletedFlashcard = await flashcardService.softDeleteFlashcard(locals.user.id, cardId);

    if (!deletedFlashcard) {
      logger.info("Flashcard not found or not accessible", { cardId, userId: locals.user.id });
      return createErrorResponse(404, {
        code: "NOT_FOUND",
        message: "Flashcard not found",
      });
    }

    logger.info("Flashcard soft-deleted successfully", { cardId, userId: locals.user.id });
    return createJsonResponse<FlashcardResponse>(200, deletedFlashcard);
  } catch (error) {
    // Handle specific error cases
    if (error instanceof Error && error.message === "ALREADY_DELETED") {
      logger.info("Attempted to delete already soft-deleted flashcard", { cardId, userId: locals.user.id });
      return createErrorResponse(409, {
        code: "ALREADY_DELETED",
        message: "Flashcard already soft-deleted",
      });
    }

    logger.error("Failed to soft-delete flashcard", {
      cardId,
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createErrorResponse(500, {
      code: "SERVER_ERROR",
      message: "Internal server error",
    });
  }
};

/**
 * PATCH /api/flashcards/{cardId}
 *
 * Updates an existing flashcard with new content, deck assignment, or source.
 * Only the flashcard owner may perform this action.
 * At least one field must be provided for update.
 * Operation triggers an audit event for tracking changes.
 */
export const PATCH: APIRoute = async ({ params, request, locals, cookies }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated flashcard update request");
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  // Validate path parameters
  const pathValidation = flashcardIdParamsSchema.safeParse(params);
  if (!pathValidation.success) {
    const issues = pathValidation.error.issues.map((issue) => issue.message);
    logger.warn("Invalid cardId parameter", {
      issues,
      userId: locals.user.id,
      params,
    });
    return createErrorResponse(400, {
      code: "INVALID_CARD_ID",
      message: "cardId must be a valid UUID",
      details: issues.map((message) => ({ message })),
    });
  }

  const { cardId } = pathValidation.data;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    logger.warn("Invalid JSON body", {
      userId: locals.user.id,
      cardId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return createErrorResponse(400, {
      code: "INVALID_BODY",
      message: "Request body must be valid JSON",
    });
  }

  const bodyValidation = updateFlashcardBodySchema.safeParse(body);
  if (!bodyValidation.success) {
    const issues = bodyValidation.error.issues.map((issue) => issue.message);
    logger.warn("Flashcard update validation failed", {
      issues,
      userId: locals.user.id,
      cardId,
    });
    return createErrorResponse(400, {
      code: "VALIDATION_ERROR",
      message: "Invalid flashcard update payload",
      details: issues.map((message) => ({ message })),
    });
  }

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

  const flashcardService = new FlashcardService(supabase);

  try {
    const updatedFlashcard = await flashcardService.updateFlashcard(locals.user.id, cardId, bodyValidation.data);

    logger.info("Flashcard updated", {
      userId: locals.user.id,
      cardId,
      updatedFields: Object.keys(bodyValidation.data),
    });

    return createJsonResponse<FlashcardResponse>(200, updatedFlashcard);
  } catch (error) {
    const serviceError = error as { message?: string };

    if (serviceError?.message?.includes("Flashcard not found")) {
      logger.warn("Flashcard ownership validation failed", {
        userId: locals.user.id,
        cardId,
      });
      return createErrorResponse(404, {
        code: "FLASHCARD_NOT_FOUND",
        message: "Flashcard not found or not owned by you",
      });
    }

    if (serviceError?.message?.includes("Referenced deck")) {
      logger.warn("Deck ownership validation failed", {
        userId: locals.user.id,
        cardId,
        deckId: bodyValidation.data.deckId,
      });
      return createErrorResponse(404, {
        code: "DECK_NOT_FOUND",
        message: "Referenced deck does not exist or is not owned by you",
      });
    }

    logger.error("Failed to update flashcard", {
      userId: locals.user.id,
      cardId,
      error: error instanceof Error ? error.message : error,
      errorType: typeof error,
      errorKeys: error && typeof error === "object" ? Object.keys(error) : null,
    });

    return createErrorResponse(500, {
      code: "SERVER_ERROR",
      message: "Unexpected error occurred while updating flashcard",
    });
  }
};
