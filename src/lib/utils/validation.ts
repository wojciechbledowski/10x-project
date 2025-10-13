/**
 * Generic Validation Utilities
 *
 * Provides validation helpers using Zod schemas for type-safe data validation.
 */

import { z } from "zod";
import { SchemaValidationError } from "./errors";

/**
 * Validate data against a Zod schema
 *
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @param schemaName - Optional name for error messages
 * @returns Validated and typed data
 * @throws SchemaValidationError if validation fails
 */
export function validateWithZod<T>(data: unknown, schema: z.ZodSchema<T>, schemaName?: string): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);

      throw new SchemaValidationError(`Schema validation failed for ${schemaName || "data"}`, validationErrors, error);
    }
    throw error;
  }
}

/**
 * Safely validate data without throwing errors
 *
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @returns Object with success flag and data or error
 */
export function safeValidateWithZod<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Extract and parse JSON content from string or object
 *
 * @param content - String or object containing JSON data
 * @returns Parsed JSON data
 * @throws SchemaValidationError if parsing fails
 */
export function extractJsonContent(content: string | Record<string, unknown>): unknown {
  // If content is already an object, return it
  if (typeof content === "object" && content !== null) {
    return content;
  }

  // If content is a string, try to parse it as JSON
  if (typeof content === "string") {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new SchemaValidationError(
        "Failed to parse content as JSON",
        [`Content is not valid JSON: ${content.substring(0, 100)}...`],
        error as Error
      );
    }
  }

  throw new SchemaValidationError("Invalid content type", [`Expected string or object, got ${typeof content}`]);
}

/**
 * Validate and extract JSON content from a message-like structure
 *
 * @param message - Object with content property
 * @param schema - Zod schema to validate against
 * @param schemaName - Optional name for error messages
 * @returns Validated and typed data
 */
export function validateJsonMessage<T>(
  message: { content: string | Record<string, unknown> },
  schema: z.ZodSchema<T>,
  schemaName?: string
): T {
  const jsonContent = extractJsonContent(message.content);
  return validateWithZod(jsonContent, schema, schemaName);
}

/**
 * Common validation schemas
 */

// Email validation
export const EmailSchema = z.string().email();

// UUID validation
export const UUIDSchema = z.string().uuid();

// URL validation
export const URLSchema = z.string().url();

// ISO date string validation
export const ISODateSchema = z.string().datetime();

// Positive integer validation
export const PositiveIntSchema = z.number().int().positive();

// Non-negative integer validation
export const NonNegativeIntSchema = z.number().int().nonnegative();

// Generic JSON object schema
export const JsonObjectSchema = z.record(z.unknown());

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type Pagination = z.infer<typeof PaginationSchema>;
