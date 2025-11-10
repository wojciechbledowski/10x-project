import type { APIRoute } from "astro";

import { batchIdParamsSchema } from "../../../lib/generation/schemas";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { AiGenerationService } from "../../../lib/services/aiGeneration.service";
import { createErrorResponse, createJsonResponse } from "../../../lib/utils/apiResponse";
import { ConsoleLogger } from "../../../lib/utils/logger";
import type { GenerationBatchResponse } from "../../../types";

export const prerender = false;

const logger = new ConsoleLogger("GetGenerationBatchApi");

export const GET: APIRoute = async ({ params, locals, cookies, request }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated generation batch request", { params });
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const validation = batchIdParamsSchema.safeParse(params);

  if (!validation.success) {
    const issues = validation.error.issues.map((issue: { message: string }) => issue.message);
    logger.warn("Invalid batchId provided", { issues, userId: locals.user.id });
    return createErrorResponse(400, {
      code: "INVALID_BATCH_ID",
      message: "batchId must be a valid UUID",
      details: issues.map((message: string) => ({ message })),
    });
  }

  const { batchId } = validation.data;

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

  const generationService = new AiGenerationService(supabase);

  try {
    const batch = await generationService.getGenerationBatch(locals.user.id, batchId);

    if (!batch) {
      logger.info("Generation batch not found", { batchId, userId: locals.user.id });
      return createErrorResponse(404, {
        code: "BATCH_NOT_FOUND",
        message: "Generation batch not found",
      });
    }

    logger.info("Generation batch retrieved", { batchId, userId: locals.user.id });
    return createJsonResponse<GenerationBatchResponse>(200, batch);
  } catch (error) {
    logger.error("Failed to retrieve generation batch", {
      batchId,
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createErrorResponse(500, {
      code: "SERVER_ERROR",
      message: "Unexpected error",
    });
  }
};
