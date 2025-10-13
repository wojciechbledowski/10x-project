/**
 * Generic Utilities - Public API
 *
 * Main entry point for generic utility functions and classes.
 * These utilities can be used across different services and modules.
 */

// Logger
export { ConsoleLogger, NoopLogger } from "./logger";
export type { Logger } from "./logger";

// Errors
export {
  AppError,
  HttpError,
  RateLimitError,
  AuthError,
  ValidationError,
  NotFoundError,
  ParseError,
  SchemaValidationError,
  TimeoutError,
  NetworkError,
  ForbiddenError,
  InternalError,
} from "./errors";

// Rate Limiter
export { NoopRateLimiter, TokenBucketRateLimiter, SlidingWindowRateLimiter } from "./rateLimiter";
export type { RateLimiter } from "./rateLimiter";

// Validation
export {
  validateWithZod,
  safeValidateWithZod,
  extractJsonContent,
  validateJsonMessage,
  EmailSchema,
  UUIDSchema,
  URLSchema,
  ISODateSchema,
  PositiveIntSchema,
  NonNegativeIntSchema,
  JsonObjectSchema,
  PaginationSchema,
} from "./validation";
export type { Pagination } from "./validation";
