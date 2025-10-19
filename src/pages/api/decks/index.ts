import type { APIRoute } from "astro";

import type { DeckResponse, DecksListResponse } from "../../../types";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { DeckService } from "../../../lib/services/deckService";
import { createErrorResponse, createJsonResponse } from "../../../lib/utils/apiResponse";
import { ConsoleLogger } from "../../../lib/utils/logger";
import { createDeckBodySchema, listDecksQuerySchema } from "../../../lib/decks/schemas";
import { SlidingWindowRateLimiter } from "../../../lib/utils/rateLimiter";

export const prerender = false;

const listLogger = new ConsoleLogger("ListDecksApi");
const createLogger = new ConsoleLogger("CreateDeckApi");

const DECK_CREATION_MAX_REQUESTS = 10;
const DECK_CREATION_WINDOW_MS = 60_000;
const deckCreationLimiters = new Map<string, SlidingWindowRateLimiter>();

function getDeckCreationLimiter(userId: string): SlidingWindowRateLimiter {
  const existingLimiter = deckCreationLimiters.get(userId);

  if (existingLimiter) {
    return existingLimiter;
  }

  const limiter = new SlidingWindowRateLimiter(DECK_CREATION_MAX_REQUESTS, DECK_CREATION_WINDOW_MS);
  deckCreationLimiters.set(userId, limiter);
  return limiter;
}

export const GET: APIRoute = async ({ url, locals, cookies, request }) => {
  if (!locals.user) {
    listLogger.warn("Unauthenticated deck list request");
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const query = Object.fromEntries(url.searchParams.entries());
  const validation = listDecksQuerySchema.safeParse(query);

  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => issue.message);
    listLogger.warn("Invalid query parameters", { issues, userId: locals.user.id });
    return createErrorResponse(400, {
      code: "INVALID_QUERY",
      message: "Invalid query parameters",
      details: issues.map((message) => ({ message })),
    });
  }

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

  const deckService = new DeckService(supabase);

  try {
    const response = await deckService.listDecks(locals.user.id, validation.data);
    listLogger.info("Deck list retrieved", {
      userId: locals.user.id,
      page: validation.data.page,
      pageSize: validation.data.pageSize,
    });
    return createJsonResponse<DecksListResponse>(200, response);
  } catch (error) {
    listLogger.error("Failed to list decks", {
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createErrorResponse(500, {
      code: "SERVER_ERROR",
      message: "Unexpected error",
    });
  }
};

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  if (!locals.user) {
    createLogger.warn("Unauthenticated deck create request");
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const rateLimiter = getDeckCreationLimiter(locals.user.id);

  const allowed = await rateLimiter.checkLimit();

  if (!allowed) {
    createLogger.warn("Deck creation rate limited", { userId: locals.user.id });
    return createErrorResponse(
      429,
      {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many deck creation requests. Please try again later.",
      },
      {
        headers: {
          "Retry-After": String(Math.ceil(DECK_CREATION_WINDOW_MS / 1000)),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    createLogger.warn("Invalid JSON body", {
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return createErrorResponse(400, {
      code: "INVALID_BODY",
      message: "Request body must be valid JSON",
    });
  }

  const validation = createDeckBodySchema.safeParse(body);

  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => issue.message);
    createLogger.warn("Deck creation validation failed", { issues, userId: locals.user.id });
    return createErrorResponse(400, {
      code: "INVALID_BODY",
      message: "Invalid deck payload",
      details: issues.map((message) => ({ message })),
    });
  }

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

  const startTime = performance.now();

  const deckService = new DeckService(supabase);

  try {
    const deck = await deckService.createDeck(locals.user.id, validation.data);
    await rateLimiter.recordUsage();
    const durationMs = performance.now() - startTime;
    const remaining = DECK_CREATION_MAX_REQUESTS - rateLimiter.getCurrentCount();

    createLogger.info("Deck created", {
      userId: locals.user.id,
      deckId: deck.id,
      durationMs: Math.round(durationMs),
      remainingSlots: Math.max(remaining, 0),
      windowMs: DECK_CREATION_WINDOW_MS,
    });

    return createJsonResponse<DeckResponse>(201, deck, {
      headers: {
        Location: `/decks/${deck.id}`,
      },
    });
  } catch (error) {
    const supabaseError = error as { code?: string; message?: string };

    if (supabaseError?.code === "23505") {
      createLogger.warn("Deck name conflict", { userId: locals.user.id, error: supabaseError.message });
      return createErrorResponse(409, {
        code: "DECK_NAME_CONFLICT",
        message: "A deck with this name already exists",
      });
    }

    createLogger.error("Failed to create deck", {
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createErrorResponse(500, {
      code: "SERVER_ERROR",
      message: "Unexpected error",
    });
  }
};
