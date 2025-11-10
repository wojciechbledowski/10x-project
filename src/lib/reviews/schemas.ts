import { z } from "zod";

/**
 * Reviews-related validation schemas
 */

// Schema for GET /reviews/queue - ensures no unexpected query parameters
export const getReviewQueueQuerySchema = z
  .object({})
  .strict({ message: "Unexpected query parameters provided" })
  .optional()
  .default({});

// Schema for POST /reviews - validates review submission request
export const createReviewRequestSchema = z
  .object({
    flashcardId: z.string().uuid("flashcardId must be a valid UUID"),
    quality: z.number().int().min(0).max(5, "quality must be between 0 and 5"),
    latencyMs: z.number().int().positive("latencyMs must be a positive integer").optional(),
  })
  .strict({ message: "Unexpected properties provided" });

// Type for the query parameters (empty object for now, but allows for future extension)
export type GetReviewQueueQueryParams = z.infer<typeof getReviewQueueQuerySchema>;

// Type for review creation request
export type CreateReviewRequestInput = z.infer<typeof createReviewRequestSchema>;
