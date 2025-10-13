/**
 * Generic Error Utilities
 *
 * Base error classes and common error types for application-wide error handling.
 */

/**
 * Base application error class
 * Extends Error with additional properties for better error handling
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly cause?: Error;
  public readonly statusCode?: number;

  constructor(message: string, code: string, cause?: Error, statusCode?: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.cause = cause;
    this.statusCode = statusCode;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      cause: this.cause?.message,
    };
  }
}

/**
 * HTTP error with status code and response body
 */
export class HttpError extends AppError {
  public readonly status: number;
  public readonly body?: string;

  constructor(message: string, status: number, body?: string, cause?: Error) {
    super(message, "HTTP_ERROR", cause, status);
    this.status = status;
    this.body = body;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      status: this.status,
      body: this.body,
    };
  }
}

/**
 * Rate limit exceeded error (HTTP 429)
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, cause?: Error) {
    super(message, "RATE_LIMIT_EXCEEDED", cause, 429);
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Authentication error (HTTP 401)
 */
export class AuthError extends AppError {
  constructor(message = "Invalid credentials or authentication failed", cause?: Error) {
    super(message, "AUTH_ERROR", cause, 401);
  }
}

/**
 * Validation error for malformed requests (HTTP 400)
 */
export class ValidationError extends AppError {
  public readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super(message, "VALIDATION_ERROR", cause, 400);
    this.details = details;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details,
    };
  }
}

/**
 * Resource not found error (HTTP 404)
 */
export class NotFoundError extends AppError {
  public readonly resourceType?: string;
  public readonly resourceId?: string;

  constructor(message: string, resourceType?: string, resourceId?: string, cause?: Error) {
    super(message, "NOT_FOUND", cause, 404);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      resourceType: this.resourceType,
      resourceId: this.resourceId,
    };
  }
}

/**
 * JSON parse failure error
 */
export class ParseError extends AppError {
  public readonly rawData?: string;

  constructor(message: string, rawData?: string, cause?: Error) {
    super(message, "PARSE_ERROR", cause);
    // Cap raw data length for logging safety
    this.rawData = rawData?.substring(0, 500);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      rawData: this.rawData,
    };
  }
}

/**
 * Schema validation error for structured data
 */
export class SchemaValidationError extends AppError {
  public readonly validationErrors?: string[];

  constructor(message: string, validationErrors?: string[], cause?: Error) {
    super(message, "SCHEMA_VALIDATION_ERROR", cause, 400);
    this.validationErrors = validationErrors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors,
    };
  }
}

/**
 * Timeout error for requests exceeding time limit
 */
export class TimeoutError extends AppError {
  public readonly timeoutMs?: number;

  constructor(message: string, timeoutMs?: number, cause?: Error) {
    super(message, "TIMEOUT_ERROR", cause, 408);
    this.timeoutMs = timeoutMs;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      timeoutMs: this.timeoutMs,
    };
  }
}

/**
 * Network or connectivity failure error
 */
export class NetworkError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, "NETWORK_ERROR", cause);
  }
}

/**
 * Forbidden access error (HTTP 403)
 */
export class ForbiddenError extends AppError {
  constructor(message = "Access forbidden", cause?: Error) {
    super(message, "FORBIDDEN", cause, 403);
  }
}

/**
 * Internal server error (HTTP 500)
 */
export class InternalError extends AppError {
  constructor(message = "Internal server error", cause?: Error) {
    super(message, "INTERNAL_ERROR", cause, 500);
  }
}
