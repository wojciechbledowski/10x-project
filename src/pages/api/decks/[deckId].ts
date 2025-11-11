import type { APIRoute } from "astro";

import { deckIdParamsSchema, updateDeckBodySchema } from "../../../lib/decks/schemas";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { DeckService } from "../../../lib/services/deckService";
import { createErrorResponse, createJsonResponse } from "../../../lib/utils/apiResponse";
import { ConsoleLogger } from "../../../lib/utils/logger";
import type { DeckResponse, UpdateDeckRequest } from "../../../types";

export const prerender = false;

const logger = new ConsoleLogger("GetDeckDetailApi");

export const GET: APIRoute = async ({ params, locals, cookies, request }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated deck detail request", { params });
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const validation = deckIdParamsSchema.safeParse(params);

  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => issue.message);
    logger.warn("Invalid deckId provided", { issues, userId: locals.user.id });
    return createErrorResponse(400, {
      code: "INVALID_ID",
      message: "deckId must be a valid UUID",
      details: issues.map((message) => ({ message })),
    });
  }

  const { deckId } = validation.data;

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

  const deckService = new DeckService(supabase);

  try {
    const deck = await deckService.getDeckDetail(deckId);

    if (!deck) {
      logger.info("Deck not found", { deckId, userId: locals.user.id });
      return createErrorResponse(404, {
        code: "NOT_FOUND",
        message: "Deck not found",
      });
    }

    logger.info("Deck detail retrieved", { deckId, userId: locals.user.id });
    return createJsonResponse<DeckResponse>(200, deck);
  } catch (error) {
    logger.error("Failed to retrieve deck detail", {
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

export const PATCH: APIRoute = async ({ params, locals, cookies, request }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated deck update request", { params });
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const pathValidation = deckIdParamsSchema.safeParse(params);

  if (!pathValidation.success) {
    const issues = pathValidation.error.issues.map((issue) => issue.message);
    logger.warn("Invalid deckId provided for update", { issues, userId: locals.user.id });
    return createErrorResponse(400, {
      code: "INVALID_ID",
      message: "deckId must be a valid UUID",
      details: issues.map((message) => ({ message })),
    });
  }

  let body: UpdateDeckRequest;

  try {
    body = await request.json();
  } catch (error) {
    logger.warn("Invalid JSON body for deck update", {
      deckId: pathValidation.data.deckId,
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createErrorResponse(400, {
      code: "BAD_REQUEST",
      message: "Invalid request body",
    });
  }

  const bodyValidation = updateDeckBodySchema.safeParse(body);

  if (!bodyValidation.success) {
    const details = bodyValidation.error.issues.map((issue) => ({ message: issue.message }));
    logger.warn("Deck update validation failed", {
      deckId: pathValidation.data.deckId,
      userId: locals.user.id,
      details,
    });

    return createErrorResponse(400, {
      code: "VALIDATION_ERROR",
      message: "Invalid update payload",
      details,
    });
  }

  const { deckId } = pathValidation.data;
  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

  const deckService = new DeckService(supabase);

  try {
    const deck = await deckService.updateDeck(locals.user.id, deckId, bodyValidation.data);

    if (!deck) {
      logger.info("Deck not found for update", { deckId, userId: locals.user.id });
      return createErrorResponse(404, {
        code: "NOT_FOUND",
        message: "Deck not found",
      });
    }

    logger.info("Deck updated", { deckId, userId: locals.user.id });
    return createJsonResponse<DeckResponse>(200, deck);
  } catch (error) {
    logger.error("Failed to update deck", {
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
