import { describe, it, expect } from "vitest";
import {
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
} from "../errors";

describe("Error Utilities", () => {
  describe("AppError", () => {
    it("should create error with message, code, and statusCode", () => {
      // Arrange & Act
      const error = new AppError("Test message", "TEST_CODE", undefined, 400);

      // Assert
      expect(error.message).toBe("Test message");
      expect(error.code).toBe("TEST_CODE");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("AppError");
    });

    it("should preserve cause error", () => {
      // Arrange
      const cause = new Error("Original error");

      // Act
      const error = new AppError("Test message", "TEST_CODE", cause);

      // Assert
      expect(error.cause).toBe(cause);
    });

    it("should capture stack trace", () => {
      // Arrange & Act
      const error = new AppError("Test message", "TEST_CODE");

      // Assert
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("AppError");
    });

    it("should serialize to JSON correctly", () => {
      // Arrange
      const cause = new Error("Original error");
      const error = new AppError("Test message", "TEST_CODE", cause, 400);

      // Act
      const json = error.toJSON();

      // Assert
      expect(json).toEqual({
        name: "AppError",
        message: "Test message",
        code: "TEST_CODE",
        statusCode: 400,
        cause: "Original error",
      });
    });

    it("should handle undefined cause in JSON serialization", () => {
      // Arrange
      const error = new AppError("Test message", "TEST_CODE");

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.cause).toBeUndefined();
    });
  });

  describe("HttpError", () => {
    it("should create HTTP error with status and body", () => {
      // Arrange & Act
      const error = new HttpError("Not found", 404, "Resource not found");

      // Assert
      expect(error.message).toBe("Not found");
      expect(error.code).toBe("HTTP_ERROR");
      expect(error.status).toBe(404);
      expect(error.body).toBe("Resource not found");
      expect(error.statusCode).toBe(404);
    });

    it("should handle undefined body", () => {
      // Arrange & Act
      const error = new HttpError("Server error", 500);

      // Assert
      expect(error.body).toBeUndefined();
    });

    it("should serialize to JSON with HTTP-specific fields", () => {
      // Arrange
      const error = new HttpError("Not found", 404, "Resource not found");

      // Act
      const json = error.toJSON();

      // Assert
      expect(json).toEqual({
        name: "HttpError",
        message: "Not found",
        code: "HTTP_ERROR",
        statusCode: 404,
        cause: undefined,
        status: 404,
        body: "Resource not found",
      });
    });
  });

  describe("RateLimitError", () => {
    it("should create rate limit error with retry after", () => {
      // Arrange & Act
      const error = new RateLimitError("Too many requests", 60);

      // Assert
      expect(error.message).toBe("Too many requests");
      expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(60);
    });

    it("should handle undefined retry after", () => {
      // Arrange & Act
      const error = new RateLimitError("Too many requests");

      // Assert
      expect(error.retryAfter).toBeUndefined();
    });

    it("should serialize to JSON with retry after", () => {
      // Arrange
      const error = new RateLimitError("Too many requests", 60);

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.retryAfter).toBe(60);
    });
  });

  describe("AuthError", () => {
    it("should create auth error with default message", () => {
      // Arrange & Act
      const error = new AuthError();

      // Assert
      expect(error.message).toBe("Invalid credentials or authentication failed");
      expect(error.code).toBe("AUTH_ERROR");
      expect(error.statusCode).toBe(401);
    });

    it("should create auth error with custom message", () => {
      // Arrange & Act
      const error = new AuthError("Custom auth error");

      // Assert
      expect(error.message).toBe("Custom auth error");
    });
  });

  describe("ValidationError", () => {
    it("should create validation error with details", () => {
      // Arrange
      const details = { field: "email", issue: "invalid format" };

      // Act
      const error = new ValidationError("Validation failed", details);

      // Assert
      expect(error.message).toBe("Validation failed");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });

    it("should handle undefined details", () => {
      // Arrange & Act
      const error = new ValidationError("Validation failed");

      // Assert
      expect(error.details).toBeUndefined();
    });

    it("should serialize to JSON with details", () => {
      // Arrange
      const details = { field: "email" };
      const error = new ValidationError("Validation failed", details);

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.details).toEqual(details);
    });
  });

  describe("NotFoundError", () => {
    it("should create not found error with resource info", () => {
      // Arrange & Act
      const error = new NotFoundError("Deck not found", "deck", "deck-123");

      // Assert
      expect(error.message).toBe("Deck not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.resourceType).toBe("deck");
      expect(error.resourceId).toBe("deck-123");
    });

    it("should handle undefined resource info", () => {
      // Arrange & Act
      const error = new NotFoundError("Resource not found");

      // Assert
      expect(error.resourceType).toBeUndefined();
      expect(error.resourceId).toBeUndefined();
    });

    it("should serialize to JSON with resource info", () => {
      // Arrange
      const error = new NotFoundError("Deck not found", "deck", "deck-123");

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.resourceType).toBe("deck");
      expect(json.resourceId).toBe("deck-123");
    });
  });

  describe("ParseError", () => {
    it("should create parse error with raw data", () => {
      // Arrange
      const rawData = '{"invalid": json}';
      const cause = new Error("JSON parse error");

      // Act
      const error = new ParseError("Failed to parse", rawData, cause);

      // Assert
      expect(error.message).toBe("Failed to parse");
      expect(error.code).toBe("PARSE_ERROR");
      expect(error.rawData).toBe(rawData);
      expect(error.cause).toBe(cause);
    });

    it("should truncate raw data longer than 500 characters", () => {
      // Arrange
      const longRawData = "x".repeat(600);

      // Act
      const error = new ParseError("Parse failed", longRawData);

      // Assert
      expect(error.rawData).toBe("x".repeat(500));
    });

    it("should handle undefined raw data", () => {
      // Arrange & Act
      const error = new ParseError("Parse failed");

      // Assert
      expect(error.rawData).toBeUndefined();
    });

    it("should serialize to JSON with raw data", () => {
      // Arrange
      const rawData = "invalid json";
      const error = new ParseError("Parse failed", rawData);

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.rawData).toBe(rawData);
    });
  });

  describe("SchemaValidationError", () => {
    it("should create schema validation error with validation errors", () => {
      // Arrange
      const validationErrors = ["name: Required", "age: Must be positive"];

      // Act
      const error = new SchemaValidationError("Schema validation failed", validationErrors);

      // Assert
      expect(error.message).toBe("Schema validation failed");
      expect(error.code).toBe("SCHEMA_VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.validationErrors).toEqual(validationErrors);
    });

    it("should handle undefined validation errors", () => {
      // Arrange & Act
      const error = new SchemaValidationError("Schema validation failed");

      // Assert
      expect(error.validationErrors).toBeUndefined();
    });

    it("should serialize to JSON with validation errors", () => {
      // Arrange
      const validationErrors = ["name: Required"];
      const error = new SchemaValidationError("Validation failed", validationErrors);

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.validationErrors).toEqual(validationErrors);
    });
  });

  describe("TimeoutError", () => {
    it("should create timeout error with timeout duration", () => {
      // Arrange & Act
      const error = new TimeoutError("Request timed out", 5000);

      // Assert
      expect(error.message).toBe("Request timed out");
      expect(error.code).toBe("TIMEOUT_ERROR");
      expect(error.statusCode).toBe(408);
      expect(error.timeoutMs).toBe(5000);
    });

    it("should handle undefined timeout", () => {
      // Arrange & Act
      const error = new TimeoutError("Request timed out");

      // Assert
      expect(error.timeoutMs).toBeUndefined();
    });

    it("should serialize to JSON with timeout", () => {
      // Arrange
      const error = new TimeoutError("Request timed out", 5000);

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.timeoutMs).toBe(5000);
    });
  });

  describe("NetworkError", () => {
    it("should create network error", () => {
      // Arrange
      const cause = new Error("Connection failed");

      // Act
      const error = new NetworkError("Network failure", cause);

      // Assert
      expect(error.message).toBe("Network failure");
      expect(error.code).toBe("NETWORK_ERROR");
      expect(error.cause).toBe(cause);
      expect(error.statusCode).toBeUndefined();
    });
  });

  describe("ForbiddenError", () => {
    it("should create forbidden error with default message", () => {
      // Arrange & Act
      const error = new ForbiddenError();

      // Assert
      expect(error.message).toBe("Access forbidden");
      expect(error.code).toBe("FORBIDDEN");
      expect(error.statusCode).toBe(403);
    });

    it("should create forbidden error with custom message", () => {
      // Arrange & Act
      const error = new ForbiddenError("Custom forbidden message");

      // Assert
      expect(error.message).toBe("Custom forbidden message");
    });
  });

  describe("InternalError", () => {
    it("should create internal error with default message", () => {
      // Arrange & Act
      const error = new InternalError();

      // Assert
      expect(error.message).toBe("Internal server error");
      expect(error.code).toBe("INTERNAL_ERROR");
      expect(error.statusCode).toBe(500);
    });

    it("should create internal error with custom message", () => {
      // Arrange & Act
      const error = new InternalError("Custom internal error");

      // Assert
      expect(error.message).toBe("Custom internal error");
    });
  });

  describe("Error inheritance", () => {
    it("should maintain proper prototype chain", () => {
      // Arrange & Act
      const httpError = new HttpError("Test", 404);
      const rateLimitError = new RateLimitError("Test");
      const authError = new AuthError("Test");

      // Assert
      expect(httpError).toBeInstanceOf(HttpError);
      expect(httpError).toBeInstanceOf(AppError);
      expect(httpError).toBeInstanceOf(Error);

      expect(rateLimitError).toBeInstanceOf(RateLimitError);
      expect(rateLimitError).toBeInstanceOf(AppError);

      expect(authError).toBeInstanceOf(AuthError);
      expect(authError).toBeInstanceOf(AppError);
    });

    it("should have correct constructor names", () => {
      // Arrange & Act
      const errors = [
        new HttpError("Test", 404),
        new RateLimitError("Test"),
        new AuthError("Test"),
        new ValidationError("Test"),
        new NotFoundError("Test"),
        new ParseError("Test"),
        new SchemaValidationError("Test"),
        new TimeoutError("Test"),
        new NetworkError("Test"),
        new ForbiddenError("Test"),
        new InternalError("Test"),
      ];

      // Assert
      expect(errors[0].name).toBe("HttpError");
      expect(errors[1].name).toBe("RateLimitError");
      expect(errors[2].name).toBe("AuthError");
      expect(errors[3].name).toBe("ValidationError");
      expect(errors[4].name).toBe("NotFoundError");
      expect(errors[5].name).toBe("ParseError");
      expect(errors[6].name).toBe("SchemaValidationError");
      expect(errors[7].name).toBe("TimeoutError");
      expect(errors[8].name).toBe("NetworkError");
      expect(errors[9].name).toBe("ForbiddenError");
      expect(errors[10].name).toBe("InternalError");
    });
  });
});
