import { describe, it, expect } from "vitest";
import { createJsonResponse, createErrorResponse } from "../apiResponse";
import type { ApiErrorResponse } from "../../../types";

describe("API Response Utilities", () => {
  describe("createJsonResponse", () => {
    it("should create a Response with correct status and JSON payload", () => {
      // Arrange
      const status = 200;
      const payload = { message: "Success", data: { id: 123 } };

      // Act
      const response = createJsonResponse(status, payload);

      // Assert
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(status);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("should serialize payload to JSON correctly", async () => {
      // Arrange
      const payload = {
        user: { id: 1, name: "John Doe" },
        items: [1, 2, 3],
        nested: { deep: { value: true } },
      };

      // Act
      const response = createJsonResponse(201, payload);
      const body = await response.json();

      // Assert
      expect(body).toEqual(payload);
    });

    it("should handle primitive payloads", async () => {
      // Arrange
      const testCases = [
        { payload: "string response", expected: "string response" },
        { payload: 42, expected: 42 },
        { payload: true, expected: true },
        { payload: null, expected: null },
        { payload: [], expected: [] },
      ];

      // Act & Assert
      for (const { payload, expected } of testCases) {
        const response = createJsonResponse(200, payload);
        const body = await response.json();
        expect(body).toEqual(expected);
      }
    });

    it("should include custom headers when provided", () => {
      // Arrange
      const customHeaders = {
        "X-Custom-Header": "custom-value",
        "X-Request-ID": "req-123",
      };

      // Act
      const response = createJsonResponse(200, { data: "test" }, { headers: customHeaders });

      // Assert
      expect(response.headers.get("X-Custom-Header")).toBe("custom-value");
      expect(response.headers.get("X-Request-ID")).toBe("req-123");
      // Default headers should still be present
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("should override default headers with custom ones", () => {
      // Arrange
      const customHeaders = {
        "Content-Type": "application/xml",
        "Cache-Control": "max-age=3600",
      };

      // Act
      const response = createJsonResponse(200, { data: "test" }, { headers: customHeaders });

      // Assert
      expect(response.headers.get("Content-Type")).toBe("application/xml");
      expect(response.headers.get("Cache-Control")).toBe("max-age=3600");
    });

    it("should handle empty options object", () => {
      // Act
      const response = createJsonResponse(200, { data: "test" }, {});

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("should handle undefined options", () => {
      // Act
      const response = createJsonResponse(200, { data: "test" });

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("should support different HTTP status codes", () => {
      // Arrange
      const testCases = [
        { status: 200, description: "OK" },
        { status: 201, description: "Created" },
        { status: 400, description: "Bad Request" },
        { status: 401, description: "Unauthorized" },
        { status: 403, description: "Forbidden" },
        { status: 404, description: "Not Found" },
        { status: 409, description: "Conflict" },
        { status: 422, description: "Unprocessable Entity" },
        { status: 429, description: "Too Many Requests" },
        { status: 500, description: "Internal Server Error" },
        { status: 502, description: "Bad Gateway" },
        { status: 503, description: "Service Unavailable" },
      ];

      // Act & Assert
      testCases.forEach(({ status, description }) => {
        const response = createJsonResponse(status, { message: description });
        expect(response.status).toBe(status);
      });
    });
  });

  describe("createErrorResponse", () => {
    it("should create an error response with correct structure", async () => {
      // Arrange
      const status = 400;
      const error: ApiErrorResponse["error"] = {
        code: "VALIDATION_ERROR",
        message: "Invalid input data",
      };

      // Act
      const response = createErrorResponse(status, error);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(status);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(body).toEqual({ error });
    });

    it("should handle error with details", async () => {
      // Arrange
      const status = 422;
      const error: ApiErrorResponse["error"] = {
        code: "VALIDATION_ERROR",
        message: "Multiple validation errors",
        details: [
          { field: "email", message: "Invalid email format" },
          { field: "password", message: "Password too short" },
          { message: "General error without field" },
        ],
      };

      // Act
      const response = createErrorResponse(status, error);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(status);
      expect(body.error).toEqual(error);
      expect(body.error.details).toHaveLength(3);
    });

    it("should handle error without details", async () => {
      // Arrange
      const status = 404;
      const error: ApiErrorResponse["error"] = {
        code: "NOT_FOUND",
        message: "Resource not found",
      };

      // Act
      const response = createErrorResponse(status, error);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(status);
      expect(body.error).toEqual(error);
      expect(body.error.details).toBeUndefined();
    });

    it("should support custom headers", () => {
      // Arrange
      const status = 429;
      const error: ApiErrorResponse["error"] = {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests",
      };
      const customHeaders = {
        "Retry-After": "60",
        "X-Rate-Limit-Remaining": "0",
      };

      // Act
      const response = createErrorResponse(status, error, { headers: customHeaders });

      // Assert
      expect(response.status).toBe(status);
      expect(response.headers.get("Retry-After")).toBe("60");
      expect(response.headers.get("X-Rate-Limit-Remaining")).toBe("0");
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should handle different error types", () => {
      // Arrange
      const errorCases: { status: number; error: ApiErrorResponse["error"] }[] = [
        {
          status: 400,
          error: { code: "VALIDATION_ERROR", message: "Bad request" },
        },
        {
          status: 401,
          error: { code: "AUTH_ERROR", message: "Unauthorized" },
        },
        {
          status: 403,
          error: { code: "FORBIDDEN", message: "Access denied" },
        },
        {
          status: 404,
          error: { code: "NOT_FOUND", message: "Resource not found" },
        },
        {
          status: 409,
          error: { code: "CONFLICT", message: "Resource already exists" },
        },
        {
          status: 429,
          error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests" },
        },
        {
          status: 500,
          error: { code: "INTERNAL_ERROR", message: "Internal server error" },
        },
      ];

      // Act & Assert
      errorCases.forEach(({ status, error }) => {
        const response = createErrorResponse(status, error);
        expect(response.status).toBe(status);
        expect(response.headers.get("Content-Type")).toBe("application/json");
      });
    });
  });

  describe("Response structure validation", () => {
    it("should create responses that conform to expected API contracts", async () => {
      // Arrange
      const successResponse = createJsonResponse(200, {
        data: { id: 123, name: "Test Item" },
        meta: { page: 1, limit: 20, total: 100 },
      });

      const errorResponse = createErrorResponse(400, {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: [{ field: "name", message: "Required field" }],
      });

      // Act
      const successBody = await successResponse.json();
      const errorBody = await errorResponse.json();

      // Assert
      expect(successBody).toHaveProperty("data");
      expect(successBody).toHaveProperty("meta");
      expect(successBody.data).toHaveProperty("id");
      expect(successBody.data).toHaveProperty("name");

      expect(errorBody).toHaveProperty("error");
      expect(errorBody.error).toHaveProperty("code");
      expect(errorBody.error).toHaveProperty("message");
      expect(errorBody.error).toHaveProperty("details");
      expect(Array.isArray(errorBody.error.details)).toBe(true);
    });

    it("should maintain consistent header structure", () => {
      // Arrange & Act
      const responses = [
        createJsonResponse(200, { data: "test" }),
        createJsonResponse(201, { data: "created" }),
        createErrorResponse(400, { code: "ERROR", message: "Bad request" }),
        createErrorResponse(500, { code: "ERROR", message: "Server error" }),
      ];

      // Assert
      responses.forEach((response) => {
        expect(response.headers.get("Content-Type")).toBe("application/json");
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(response).toBeInstanceOf(Response);
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle large payloads", () => {
      // Arrange
      const largePayload = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: "A".repeat(100), // 100 char string
        })),
      };

      // Act & Assert
      expect(() => createJsonResponse(200, largePayload)).not.toThrow();
    });

    it("should handle special characters in payload", async () => {
      // Arrange
      const payloadWithSpecialChars = {
        message: "Hello 🌍 World! @#$%^&*()",
        unicode: "🚀 Unicode test: ñáéíóú",
        json: '{"nested": "object"}',
        html: "<div>HTML content</div>",
      };

      // Act
      const response = createJsonResponse(200, payloadWithSpecialChars);
      const body = await response.json();

      // Assert
      expect(body).toEqual(payloadWithSpecialChars);
    });

    it("should handle Date objects in payload", async () => {
      // Arrange
      const date = new Date("2025-01-01T12:00:00Z");
      const payload = {
        createdAt: date,
        updatedAt: date,
        metadata: {
          timestamp: date.getTime(),
        },
      };

      // Act
      const response = createJsonResponse(200, payload);
      const body = await response.json();

      // Assert
      expect(body.createdAt).toBe(date.toISOString());
      expect(body.updatedAt).toBe(date.toISOString());
      expect(body.metadata.timestamp).toBe(date.getTime());
    });
  });
});
