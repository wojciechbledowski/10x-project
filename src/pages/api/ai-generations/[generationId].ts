import type { APIRoute } from "astro";

import { generationIdParamsSchema } from "../../../lib/generation/schemas";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { AiGenerationService } from "../../../lib/services/aiGeneration.service";
import { createErrorResponse, createJsonResponse } from "../../../lib/utils/apiResponse";
import { ConsoleLogger } from "../../../lib/utils/logger";
import type { AiGenerationResponse } from "../../../types";

export const prerender = false;

const logger = new ConsoleLogger("GetAiGenerationApi");

export const GET: APIRoute = async ({ params, locals, cookies, request }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated AI generation request", { params });
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const validation = generationIdParamsSchema.safeParse(params);

  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => issue.message);
    logger.warn("Invalid generationId provided", { issues, userId: locals.user.id });
    return createErrorResponse(400, {
      code: "INVALID_ID",
      message: "generationId must be a valid UUID",
      details: issues.map((message) => ({ message })),
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
    const generation = await generationService.getGenerationWithFlashcards(locals.user.id, generationId);

    if (!generation) {
      logger.info("AI generation not found", { generationId, userId: locals.user.id });
      return createErrorResponse(404, {
        code: "NOT_FOUND",
        message: "AI generation not found",
      });
    }

    logger.info("AI generation retrieved", { generationId, userId: locals.user.id });
    return createJsonResponse<AiGenerationResponse>(200, generation);
  } catch (error) {
    logger.error("Failed to retrieve AI generation", {
      generationId,
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createErrorResponse(500, {
      code: "SERVER_ERROR",
      message: "Unexpected error",
    });
  }
};
