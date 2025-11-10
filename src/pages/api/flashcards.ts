import type { APIRoute } from "astro";

import { listFlashcardsQuerySchema, createFlashcardBodySchema } from "../../lib/flashcards/schemas";
import { createSupabaseServerInstance } from "../../db/supabase.client";
import { FlashcardService } from "../../lib/services/flashcardService";
import { createErrorResponse, createJsonResponse } from "../../lib/utils/apiResponse";
import { ConsoleLogger } from "../../lib/utils/logger";
import { SlidingWindowRateLimiter } from "../../lib/utils/rateLimiter";
import type { FlashcardsListResponse, FlashcardResponse } from "../../types";

export const prerender = false;

const logger = new ConsoleLogger("ListFlashcardsApi");

// Rate limiting for flashcard creation: 50 flashcards per minute per user
const FLASHCARD_CREATION_MAX_REQUESTS = 50;
const FLASHCARD_CREATION_WINDOW_MS = 60_000; // 1 minute
const flashcardCreationLimiters = new Map<string, SlidingWindowRateLimiter>();

function getFlashcardCreationLimiter(userId: string): SlidingWindowRateLimiter {
  const existingLimiter = flashcardCreationLimiters.get(userId);
  if (existingLimiter) return existingLimiter;

  const limiter = new SlidingWindowRateLimiter(FLASHCARD_CREATION_MAX_REQUESTS, FLASHCARD_CREATION_WINDOW_MS);
  flashcardCreationLimiters.set(userId, limiter);
  return limiter;
}

/**
 * GET /api/flashcards
 *
 * Retrieves a paginated list of flashcards owned by the authenticated user.
 * Supports filtering by deck, review due status, full-text search, and sorting.
 * Only the flashcard owner may access their own flashcards.
 */
export const GET: APIRoute = async ({ url, locals, cookies, request }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated flashcards list request", { url: url.pathname });
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const validation = listFlashcardsQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    logger.warn("Invalid query parameters", {
      issues,
      userId: locals.user.id,
      url: url.pathname,
    });
    return createErrorResponse(400, {
      code: "INVALID_PARAMETERS",
      message: "Invalid query parameters",
      details: issues,
    });
  }

  const queryParams = validation.data;

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

  const flashcardService = new FlashcardService(supabase);

  try {
    const result = await flashcardService.listUserFlashcards({
      userId: locals.user.id,
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      sort: queryParams.sort,
      deckId: queryParams.deckId,
      reviewDue: queryParams.reviewDue,
      search: queryParams.search,
    });

    logger.info("Flashcards list retrieved successfully", {
      userId: locals.user.id,
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      totalCount: result.pagination.totalCount,
      filters: {
        deckId: queryParams.deckId,
        reviewDue: queryParams.reviewDue,
        search: queryParams.search,
      },
    });

    return createJsonResponse<FlashcardsListResponse>(200, result);
  } catch (error) {
    // Handle specific service errors
    if (error instanceof Error && error.message === "DECK_NOT_FOUND_OR_INACCESSIBLE") {
      logger.info("Deck not found or not accessible for filtering", {
        userId: locals.user.id,
        deckId: queryParams.deckId,
      });
      return createErrorResponse(404, {
        code: "DECK_NOT_FOUND",
        message: "Specified deck not found or not accessible",
      });
    }

    logger.error("Failed to retrieve flashcards list", {
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
      url: url.pathname,
      queryParams,
    });

    return createErrorResponse(500, {
      code: "SERVER_ERROR",
      message: "Unexpected error",
    });
  }
};

/**
 * POST /api/flashcards
 *
 * Creates a new flashcard for the authenticated user.
 * Supports optional deck assignment and source attribution.
 * SM-2 scheduling defaults are applied automatically.
 */
export const POST: APIRoute = async ({ request, locals, cookies }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated flashcard creation request");
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  // Rate limiting check
  const rateLimiter = getFlashcardCreationLimiter(locals.user.id);
  const allowed = await rateLimiter.checkLimit();
  if (!allowed) {
    logger.warn("Flashcard creation rate limited", { userId: locals.user.id });
    return createErrorResponse(
      429,
      {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many flashcard creation requests. Please try again later.",
      },
      {
        headers: {
          "Retry-After": String(Math.ceil(FLASHCARD_CREATION_WINDOW_MS / 1000)),
        },
      }
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    logger.warn("Invalid JSON body", {
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return createErrorResponse(400, {
      code: "INVALID_BODY",
      message: "Request body must be valid JSON",
    });
  }

  const validation = createFlashcardBodySchema.safeParse(body);
  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => issue.message);
    logger.warn("Flashcard creation validation failed", {
      issues,
      userId: locals.user.id,
    });
    return createErrorResponse(400, {
      code: "INVALID_BODY",
      message: "Invalid flashcard payload",
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
    const flashcard = await flashcardService.createFlashcard(locals.user.id, validation.data);

    await rateLimiter.recordUsage();

    logger.info("Flashcard created", {
      userId: locals.user.id,
      flashcardId: flashcard.id,
      deckId: validation.data.deckId,
      source: validation.data.source,
    });

    return createJsonResponse<FlashcardResponse>(201, flashcard, {
      headers: {
        Location: `/api/flashcards/${flashcard.id}`,
      },
    });
  } catch (error) {
    const serviceError = error as { message?: string };

    if (serviceError?.message?.includes("Deck not found")) {
      logger.warn("Deck ownership validation failed", {
        userId: locals.user.id,
        deckId: validation.data.deckId,
      });
      return createErrorResponse(404, {
        code: "DECK_NOT_FOUND",
        message: "Referenced deck does not exist or is not owned by you",
      });
    }

    logger.error("Failed to create flashcard", {
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createErrorResponse(500, {
      code: "SERVER_ERROR",
      message: "Unexpected error occurred while creating flashcard",
    });
  }
};
