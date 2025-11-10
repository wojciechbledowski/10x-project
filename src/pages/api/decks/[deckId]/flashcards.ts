import { createSupabaseServerInstance } from "@/db/supabase.client";
import { DeckIdSchema, listDeckFlashcardsQuerySchema } from "@/lib/flashcards/schemas";
import { ConsoleLogger } from "@/lib/openrouter";
import { FlashcardService } from "@/lib/services/flashcardService";
import { createErrorResponse, createJsonResponse } from "@/lib/utils/apiResponse";
import type { FlashcardsListResponse } from "@/types";
import type { APIRoute } from "astro";

export const prerender = false;

const logger = new ConsoleLogger("ListDeckFlashcardsApi");

export const GET: APIRoute = async ({ params, url, locals, cookies, request }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated deck flashcards request", { params });
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const deckIdValidation = DeckIdSchema.safeParse(params.deckId);

  if (!deckIdValidation.success) {
    const issues = deckIdValidation.error.issues.map((issue) => issue.message);

    logger.warn("Invalid deckId provided", { issues, userId: locals.user.id });

    return createErrorResponse(400, {
      code: "INVALID_ID",
      message: "deckId must be a valid UUID",
      details: issues.map((message) => ({ message })),
    });
  }

  const searchParams = Object.fromEntries(url.searchParams.entries());

  const validationResult = listDeckFlashcardsQuerySchema.safeParse({
    deckId: deckIdValidation.data,
    ...searchParams,
  });

  if (!validationResult.success) {
    const issues = validationResult.error.issues.map((issue) => ({
      message: issue.message,
      field: issue.path.at(-1)?.toString(),
    }));

    logger.warn("Invalid query parameters", { issues, userId: locals.user.id });

    return createErrorResponse(400, {
      code: "INVALID_QUERY",
      message: "Invalid query parameters provided",
      details: issues,
    });
  }

  const { deckId, page, pageSize, sort, reviewDue } = validationResult.data;

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

  const flashcardService = new FlashcardService(supabase);

  try {
    const response = await flashcardService.listDeckFlashcards({
      userId: locals.user.id,
      deckId,
      page,
      pageSize,
      sort,
      reviewDue,
    });

    if (!response) {
      logger.info("Deck not found for flashcards listing", { userId: locals.user.id, deckId });

      return createErrorResponse(404, {
        code: "NOT_FOUND",
        message: "Deck not found",
      });
    }

    logger.info("Deck flashcards retrieved", {
      userId: locals.user.id,
      deckId,
      page,
      pageSize,
      sort,
      reviewDue,
    });

    return createJsonResponse<FlashcardsListResponse>(200, response);
  } catch (error) {
    logger.error("Failed to list deck flashcards", {
      deckId,
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createErrorResponse(500, {
      code: "SERVER_ERROR",
      message: "Unexpected error",
    });
  }
};
