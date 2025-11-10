import { z } from "zod";

/**
 * Flashcard-related validation schemas
 */

const ALLOWED_SORT_FIELDS = ["created_at", "updated_at", "next_review_at"] as const;

function isAllowedSortField(value: string | undefined): boolean {
  if (!value) {
    return true;
  }

  const sortField = value.startsWith("-") ? value.slice(1) : value;
  return (ALLOWED_SORT_FIELDS as readonly string[]).includes(sortField);
}

export const listFlashcardsQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: "page must be a number" })
    .int({ message: "page must be an integer" })
    .min(1, { message: "page must be at least 1" })
    .default(1),
  pageSize: z.coerce
    .number({ invalid_type_error: "pageSize must be a number" })
    .int({ message: "pageSize must be an integer" })
    .min(1, { message: "pageSize must be at least 1" })
    .max(100, { message: "pageSize must be at most 100" })
    .default(20),
  sort: z.string({ invalid_type_error: "sort must be a string" }).optional().refine(isAllowedSortField, {
    message: "sort must be one of: created_at, updated_at, next_review_at (prefix with '-' for descending order)",
  }),
  deckId: z
    .string({ invalid_type_error: "deckId must be a string" })
    .uuid({ message: "deckId must be a valid UUID" })
    .optional(),
  reviewDue: z.coerce.boolean({ invalid_type_error: "reviewDue must be a boolean" }).optional(),
  search: z
    .string({ invalid_type_error: "search must be a string" })
    .min(1, { message: "search must be at least 1 character long" })
    .max(500, { message: "search must be at most 500 characters long" })
    .optional(),
  cursor: z.string({ invalid_type_error: "cursor must be a string" }).optional(),
});

export type ListFlashcardsQueryParams = z.infer<typeof listFlashcardsQuerySchema>;

/**
 * Schema for user ID validation
 */
export const UserIdSchema = z
  .string({
    required_error: "userId is required",
    invalid_type_error: "userId must be a string",
  })
  .uuid({ message: "userId must be a valid UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)" });

/**
 * Flashcard source enum values
 */
const SOURCE_ENUM_VALUES = ["manual", "ai", "ai_edited"] as const;

/**
 * Schema for flashcard source validation
 */
export const FlashcardSourceSchema = z.enum(SOURCE_ENUM_VALUES, {
  errorMap: () => ({ message: "source must be one of: manual, ai, ai_edited" }),
});

/**
 * Schema for flashcard ID path parameters
 */
export const flashcardIdParamsSchema = z.object({
  cardId: z
    .string({
      required_error: "cardId is required",
      invalid_type_error: "cardId must be a string",
    })
    .uuid({ message: "cardId must be a valid UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)" }),
});

/**
 * Schema for flashcard update request body
 */
export const updateFlashcardBodySchema = z
  .object({
    front: z
      .string({ invalid_type_error: "front must be a string" })
      .trim()
      .min(1, { message: "front must be at least 1 character long" })
      .max(1000, { message: "front must be at most 1000 characters long" })
      .optional(),
    back: z
      .string({ invalid_type_error: "back must be a string" })
      .trim()
      .min(1, { message: "back must be at least 1 character long" })
      .max(1000, { message: "back must be at most 1000 characters long" })
      .optional(),
    deckId: z
      .union([
        z
          .string({ invalid_type_error: "deckId must be a string" })
          .uuid({ message: "deckId must be a valid UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)" }),
        z.null(),
      ])
      .optional(),
    source: FlashcardSourceSchema.optional(),
  })
  .strict({ message: "Unexpected properties provided" })
  .refine(
    (data) =>
      data.front !== undefined || data.back !== undefined || data.deckId !== undefined || data.source !== undefined,
    {
      message: "At least one field must be provided",
      path: ["front"],
    }
  );

/**
 * Schema for flashcard creation request body
 */
export const createFlashcardBodySchema = z
  .object({
    front: z
      .string({ invalid_type_error: "front must be a string" })
      .trim()
      .min(1, { message: "front must be at least 1 character long" })
      .max(1000, { message: "front must be at most 1000 characters long" }),
    back: z
      .string({ invalid_type_error: "back must be a string" })
      .trim()
      .min(1, { message: "back must be at least 1 character long" })
      .max(1000, { message: "back must be at most 1000 characters long" }),
    deckId: z
      .string({ invalid_type_error: "deckId must be a string" })
      .uuid({ message: "deckId must be a valid UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)" })
      .optional(),
    source: FlashcardSourceSchema.default("manual"),
  })
  .strict({ message: "Unexpected properties provided" });

/**
 * Schema for deck ID validation
 */
export const DeckIdSchema = z
  .string({
    required_error: "deckId is required",
    invalid_type_error: "deckId must be a string",
  })
  .uuid({ message: "deckId must be a valid UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)" });

/**
 * Schema for listing flashcards in a specific deck query parameters
 */
export const listDeckFlashcardsQuerySchema = z.object({
  deckId: DeckIdSchema,
  page: z.coerce
    .number({ invalid_type_error: "page must be a number" })
    .int({ message: "page must be an integer" })
    .min(1, { message: "page must be at least 1" })
    .default(1),
  pageSize: z.coerce
    .number({ invalid_type_error: "pageSize must be a number" })
    .int({ message: "pageSize must be an integer" })
    .min(1, { message: "pageSize must be at least 1" })
    .max(100, { message: "pageSize must be at most 100" })
    .default(20),
  sort: z.string({ invalid_type_error: "sort must be a string" }).optional().refine(isAllowedSortField, {
    message: "sort must be one of: created_at, updated_at, next_review_at (prefix with '-' for descending order)",
  }),
  reviewDue: z.coerce.boolean({ invalid_type_error: "reviewDue must be a boolean" }).optional(),
});

/**
 * Schema for list deck flashcards options
 */
export const listDeckFlashcardsOptionsSchema = z.object({
  userId: UserIdSchema,
  deckId: DeckIdSchema,
  page: z.coerce
    .number({ invalid_type_error: "page must be a number" })
    .int({ message: "page must be an integer" })
    .min(1, { message: "page must be at least 1" })
    .default(1),
  pageSize: z.coerce
    .number({ invalid_type_error: "pageSize must be a number" })
    .int({ message: "pageSize must be an integer" })
    .min(1, { message: "pageSize must be at least 1" })
    .max(100, { message: "pageSize must be at most 100" })
    .default(20),
  sort: z.string({ invalid_type_error: "sort must be a string" }).optional().refine(isAllowedSortField, {
    message: "sort must be one of: created_at, updated_at, next_review_at (prefix with '-' for descending order)",
  }),
  reviewDue: z.boolean({ invalid_type_error: "reviewDue must be a boolean" }).optional(),
});

/**
 * Schema for list user flashcards options
 */
export const listUserFlashcardsOptionsSchema = z.object({
  userId: UserIdSchema,
  page: z.coerce
    .number({ invalid_type_error: "page must be a number" })
    .int({ message: "page must be an integer" })
    .min(1, { message: "page must be at least 1" })
    .default(1),
  pageSize: z.coerce
    .number({ invalid_type_error: "pageSize must be a number" })
    .int({ message: "pageSize must be an integer" })
    .min(1, { message: "pageSize must be at least 1" })
    .max(100, { message: "pageSize must be at most 100" })
    .default(20),
  sort: z.string({ invalid_type_error: "sort must be a string" }).optional().refine(isAllowedSortField, {
    message: "sort must be one of: created_at, updated_at, next_review_at (prefix with '-' for descending order)",
  }),
  deckId: DeckIdSchema.optional(),
  reviewDue: z.boolean({ invalid_type_error: "reviewDue must be a boolean" }).optional(),
  search: z
    .string({ invalid_type_error: "search must be a string" })
    .min(1, { message: "search must be at least 1 character long" })
    .max(500, { message: "search must be at most 500 characters long" })
    .optional(),
});

export type FlashcardIdParams = z.infer<typeof flashcardIdParamsSchema>;
export type UpdateFlashcardBody = z.infer<typeof updateFlashcardBodySchema>;
export type CreateFlashcardBody = z.infer<typeof createFlashcardBodySchema>;
export type ListDeckFlashcardsQueryParams = z.infer<typeof listDeckFlashcardsQuerySchema>;
export type ListDeckFlashcardsOptions = z.infer<typeof listDeckFlashcardsOptionsSchema>;
export type ListUserFlashcardsOptions = z.infer<typeof listUserFlashcardsOptionsSchema>;
