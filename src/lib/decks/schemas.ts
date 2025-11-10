import { z } from "zod";

/**
 * Deck-related validation schemas
 */
export const DeckIdSchema = z
  .string({
    required_error: "deckId is required",
    invalid_type_error: "deckId must be a string",
  })
  .uuid({ message: "deckId must be a valid UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)" });

export const deleteDeckParamsSchema = z.object({
  deckId: DeckIdSchema,
});

export const deckIdParamsSchema = z.object({
  deckId: DeckIdSchema,
});

export const createDeckBodySchema = z
  .object({
    name: z
      .string({ invalid_type_error: "name must be a string" })
      .trim()
      .min(1, { message: "name must be at least 1 character long" })
      .max(255, { message: "name must be at most 255 characters long" }),
  })
  .strict({ message: "Unexpected properties provided" });

const ISO_8601_REGEX = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?)(Z|[+-]\d{2}:\d{2})$/;

export const updateDeckBodySchema = z
  .object({
    name: z
      .string({ invalid_type_error: "name must be a string" })
      .trim()
      .min(1, { message: "name must be at least 1 character long" })
      .max(255, { message: "name must be at most 255 characters long" })
      .optional(),
    deletedAt: z
      .union([
        z.string({ invalid_type_error: "deletedAt must be a string" }).refine((value) => ISO_8601_REGEX.test(value), {
          message: "deletedAt must be a valid ISO 8601 timestamp",
        }),
        z.null(),
      ])
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.deletedAt !== undefined, {
    message: "At least one field must be provided",
    path: ["name"],
  });

export type DeleteDeckParams = z.infer<typeof deleteDeckParamsSchema>;
export type DeckIdParams = z.infer<typeof deckIdParamsSchema>;
export type UpdateDeckBody = z.infer<typeof updateDeckBodySchema>;
export type CreateDeckBody = z.infer<typeof createDeckBodySchema>;

const DECK_LIST_SORT_PATTERN = /^(?:-)?(?:name|created_at)$/;

export const listDecksQuerySchema = z.object({
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
  sort: z
    .string({ invalid_type_error: "sort must be a string" })
    .optional()
    .transform((value) => {
      if (!value) {
        return "created_at";
      }

      const trimmed = value.trim();
      return trimmed.length === 0 ? "created_at" : trimmed;
    })
    .refine((value) => DECK_LIST_SORT_PATTERN.test(value), {
      message: "Invalid sort field",
    }),
});

export type ListDecksQueryParams = z.infer<typeof listDecksQuerySchema>;
