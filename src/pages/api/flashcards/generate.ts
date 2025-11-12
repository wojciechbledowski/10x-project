import type { APIRoute } from "astro";
import { generateFlashcardsBodySchema, type GenerateFlashcardsRequest } from "../../../lib/generation/schemas";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { AiGenerationService } from "../../../lib/services/aiGeneration.service";
import { OpenRouterService } from "../../../lib/openrouter/service";
import { createErrorResponse, createJsonResponse } from "../../../lib/utils/apiResponse";
import { ConsoleLogger } from "../../../lib/utils/logger";
import { SlidingWindowRateLimiter } from "../../../lib/utils/rateLimiter";
import { OPENROUTER_API_KEY } from "astro:env/server";

export const prerender = false;

const logger = new ConsoleLogger("FlashcardGenerationApi");

// Rate limiting for AI generation: 10 generations per hour per user
const AI_GENERATION_MAX_REQUESTS = 10;
const AI_GENERATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const aiGenerationLimiters = new Map<string, SlidingWindowRateLimiter>();

function getAiGenerationLimiter(userId: string): SlidingWindowRateLimiter {
  const existingLimiter = aiGenerationLimiters.get(userId);
  if (existingLimiter) return existingLimiter;

  const limiter = new SlidingWindowRateLimiter(AI_GENERATION_MAX_REQUESTS, AI_GENERATION_WINDOW_MS);
  aiGenerationLimiters.set(userId, limiter);
  return limiter;
}

/**
 * POST /api/flashcards/generate
 *
 * Initiates asynchronous flashcard generation using AI services.
 * Accepts text content and optional parameters, creates a generation batch,
 * and returns a batchId for status polling.
 */
export const POST: APIRoute = async ({ request, locals, cookies }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated flashcard generation request");
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  // Rate limiting check
  const rateLimiter = getAiGenerationLimiter(locals.user.id);
  const allowed = await rateLimiter.checkLimit();
  if (!allowed) {
    logger.warn("AI generation rate limited", { userId: locals.user.id });
    return createErrorResponse(
      429,
      {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many AI generation requests. Please try again later.",
      },
      {
        headers: {
          "Retry-After": String(Math.ceil(AI_GENERATION_WINDOW_MS / 1000)),
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

  const validation = generateFlashcardsBodySchema.safeParse(body);
  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    logger.warn("Flashcard generation validation failed", {
      issues,
      userId: locals.user.id,
    });
    return createErrorResponse(400, {
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: issues,
    });
  }

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

  // Initialize OpenRouter service for synchronous generation
  const openRouterService = new OpenRouterService({
    apiKey: OPENROUTER_API_KEY,
    defaultModel: "microsoft/wizardlm-2-8x22b",
  });

  const aiGenerationService = new AiGenerationService(supabase, openRouterService);

  try {
    const requestData: GenerateFlashcardsRequest = validation.data;

    // Validate deck ownership if deckId provided
    if (requestData.deckId) {
      const isValidDeck = await aiGenerationService.validateDeckOwnership(locals.user.id, requestData.deckId);
      if (!isValidDeck) {
        logger.warn("Deck ownership validation failed", {
          userId: locals.user.id,
          deckId: requestData.deckId,
        });
        return createErrorResponse(404, {
          code: "DECK_NOT_FOUND",
          message: "Referenced deck does not exist or is not owned by you",
        });
      }
    }

    // Record rate limit usage
    await rateLimiter.recordUsage();

    // Generate flashcards directly
    const generatedFlashcards = await aiGenerationService.generateFlashcardsDirect(locals.user.id, requestData);

    logger.info("Flashcards generated successfully", {
      userId: locals.user.id,
      deckId: requestData.deckId,
      sourceTextLength: requestData.sourceText.length,
      generatedCount: generatedFlashcards.length,
    });

    return createJsonResponse(200, {
      flashcards: generatedFlashcards,
    });
  } catch (error) {
    logger.error("Failed to generate flashcards", {
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createErrorResponse(500, {
      code: "SERVER_ERROR",
      message: "Unexpected error occurred while generating flashcards",
    });
  }
};
