import type { APIRoute } from "astro";

import type { ReviewQueueResponse } from "../../../types";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { ReviewService } from "../../../lib/services/reviewService";
import { createErrorResponse, createJsonResponse } from "../../../lib/utils/apiResponse";
import { ConsoleLogger } from "../../../lib/utils/logger";
import { getReviewQueueQuerySchema } from "../../../lib/reviews/schemas";

export const prerender = false;

const logger = new ConsoleLogger("ReviewQueueApi");

export const GET: APIRoute = async ({ url, locals, cookies, request }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated review queue request");
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  // Validate query parameters
  const query = Object.fromEntries(url.searchParams.entries());
  const validation = getReviewQueueQuerySchema.safeParse(query);

  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => issue.message);
    logger.warn("Invalid query parameters for review queue", {
      issues,
      userId: locals.user.id,
    });
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

  const reviewService = new ReviewService(supabase);

  try {
    const response = await reviewService.getReviewQueue(locals.user.id);
    logger.info("Review queue retrieved", {
      userId: locals.user.id,
      totalDue: response.totalDue,
    });
    return createJsonResponse<ReviewQueueResponse>(200, response);
  } catch (error) {
    logger.error("Failed to get review queue", {
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createErrorResponse(500, {
      code: "SERVER_ERROR",
      message: "Unexpected error",
    });
  }
};
