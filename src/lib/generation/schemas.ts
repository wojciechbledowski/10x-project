import { z } from "zod";

/**
 * Validation schema for generationId path parameter
 * Used in /ai-generations/{generationId} routes
 */
export const generationIdParamsSchema = z.object({
  generationId: z
    .string({
      required_error: "generationId is required",
      invalid_type_error: "generationId must be a string",
    })
    .uuid({ message: "generationId must be a valid UUID format" }),
});

/**
 * Validation schema for batchId path parameter
 * Used in /generation-batches/{batchId} routes
 */
export const batchIdParamsSchema = z.object({
  batchId: z
    .string({
      required_error: "batchId is required",
      invalid_type_error: "batchId must be a string",
    })
    .uuid({ message: "batchId must be a valid UUID format" }),
});

/**
 * Validation schema for flashcard generation request
 * POST /flashcards/generate
 */
export const generateFlashcardsBodySchema = z.object({
  sourceText: z
    .string({
      required_error: "sourceText is required",
      invalid_type_error: "sourceText must be a string",
    })
    .min(1000, "sourceText must be at least 1000 characters long")
    .max(10000, "sourceText must be at most 10000 characters long"),

  deckId: z
    .string({
      invalid_type_error: "deckId must be a string",
    })
    .uuid({ message: "deckId must be a valid UUID format" })
    .optional(),

  temperature: z
    .number({
      invalid_type_error: "temperature must be a number",
    })
    .min(0.0, "temperature must be at least 0.0")
    .max(2.0, "temperature must be at most 2.0")
    .optional()
    .default(0.7),
});

/**
 * Type for flashcard generation request body
 */
export type GenerateFlashcardsRequest = z.infer<typeof generateFlashcardsBodySchema>;
