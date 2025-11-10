import type { APIRoute } from "astro";
import { generationIdParamsSchema } from "../../../../lib/generation/schemas";
import { createSupabaseServerInstance } from "../../../../db/supabase.client";
import { AiGenerationService } from "../../../../lib/services/aiGeneration.service";
import { createErrorResponse, createJsonResponse } from "../../../../lib/utils/apiResponse";
import { ConsoleLogger } from "../../../../lib/utils/logger";
import type { AiGenerationResponse } from "../../../../types";

export const prerender = false;

const logger = new ConsoleLogger("RetryAiGenerationApi");

/**
 * POST /api/ai-generations/{generationId}/retry
 *
 * Retries a failed AI flashcard generation by creating a new generation record
 * with the same parameters and triggering background processing.
 */
export const POST: APIRoute = async ({ params, locals, cookies, request }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated retry request", { params });
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  // Validate generationId parameter
  const validation = generationIdParamsSchema.safeParse(params);
  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    logger.warn("Invalid generationId provided", {
      issues,
      userId: locals.user.id,
    });
    return createErrorResponse(400, {
      code: "INVALID_ID",
      message: "generationId must be a valid UUID",
      details: issues,
    });
  }

  const { generationId } = validation.data;

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

  const generationService = new AiGenerationService(supabase);

  try {
    // Create retry generation
    const newGeneration = await generationService.retryGeneration(locals.user.id, generationId);

    logger.info("AI generation retry created", {
      userId: locals.user.id,
      originalGenerationId: generationId,
      newGenerationId: newGeneration.id,
    });

    return createJsonResponse<AiGenerationResponse>(201, newGeneration, {
      headers: {
        Location: `/ai-generations/${newGeneration.id}`,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Handle specific error cases
    if (errorMessage === "GENERATION_NOT_FOUND") {
      logger.info("Generation not found for retry", {
        generationId,
        userId: locals.user.id,
      });
      return createErrorResponse(404, {
        code: "NOT_FOUND",
        message: "AI generation not found or access denied",
      });
    }

    if (errorMessage === "INVALID_STATUS") {
      logger.warn("Cannot retry generation with invalid status", {
        generationId,
        userId: locals.user.id,
      });
      return createErrorResponse(409, {
        code: "INVALID_STATUS",
        message: "Can only retry generations with ERROR status",
      });
    }

    // Handle database or other errors
    logger.error("Failed to process retry request", {
      generationId,
      userId: locals.user.id,
      error: errorMessage,
    });

    return createErrorResponse(500, {
      code: "SERVER_ERROR",
      message: "Failed to create retry generation",
    });
  }
};
