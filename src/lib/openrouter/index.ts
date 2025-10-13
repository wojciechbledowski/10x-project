/**
 * OpenRouter Service - Public API
 *
 * Main entry point for the OpenRouter service.
 * Re-exports service-specific types and classes.
 */

// Main service
export { OpenRouterService } from "./service";

// Types
export type {
  ChatMessage,
  ChatOptions,
  ChatCompletion,
  ChatRequestPayload,
  OpenRouterConfig,
  ModelParams,
  JsonSchemaResponseFormat,
  UsageInfo,
  ChatChoice,
} from "./openrouter.types";

// Service-specific errors
export { OpenRouterError, ModelError } from "./errors";

// Re-export commonly used generic utilities for convenience
export type { Logger } from "@/lib/utils/logger";
export type { RateLimiter } from "@/lib/utils/rateLimiter";

// Re-export commonly used error types
export {
  HttpError,
  RateLimitError,
  AuthError,
  ValidationError,
  ParseError,
  SchemaValidationError,
  TimeoutError,
  NetworkError,
} from "@/lib/utils/errors";

// Re-export logger implementations
export { ConsoleLogger, NoopLogger } from "@/lib/utils/logger";

// Re-export rate limiter implementations
export { NoopRateLimiter, TokenBucketRateLimiter } from "@/lib/utils/rateLimiter";

// Re-export validation utilities
export { validateWithZod, validateJsonMessage } from "@/lib/utils/validation";
