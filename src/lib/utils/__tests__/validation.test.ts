import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
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
  type Pagination,
} from "../validation";
import { SchemaValidationError } from "../errors";

describe("Validation Utilities", () => {
  describe("validateWithZod", () => {
    it("should return validated data when validation succeeds", () => {
      // Arrange
      const schema = z.string().min(3);
      const validData = "hello";

      // Act
      const result = validateWithZod(validData, schema);

      // Assert
      expect(result).toBe(validData);
    });

    it("should throw SchemaValidationError when validation fails", () => {
      // Arrange
      const schema = z.string().min(5);
      const invalidData = "hi";

      // Act & Assert
      expect(() => validateWithZod(invalidData, schema)).toThrow(SchemaValidationError);
    });

    it("should include schema name in error message when provided", () => {
      // Arrange
      const schema = z.string().min(5);
      const invalidData = "hi";
      const schemaName = "TestSchema";

      // Act & Assert
      expect(() => validateWithZod(invalidData, schema, schemaName)).toThrow("Schema validation failed for TestSchema");
    });

    it("should transform validation errors into readable format", () => {
      // Arrange
      const schema = z.object({
        name: z.string().min(2),
        age: z.number().positive(),
      });
      const invalidData = { name: "", age: -5 };

      // Act & Assert
      try {
        validateWithZod(invalidData, schema);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaValidationError);
        const schemaError = error as SchemaValidationError;
        expect(schemaError.validationErrors).toBeDefined();
        expect(schemaError.validationErrors).toHaveLength(2);
      }
    });
  });

  describe("safeValidateWithZod", () => {
    it("should return success result with data when validation succeeds", () => {
      // Arrange
      const schema = z.string().min(3);
      const validData = "hello";

      // Act
      const result = safeValidateWithZod(validData, schema);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(validData);
      }
    });

    it("should return failure result with error when validation fails", () => {
      // Arrange
      const schema = z.string().min(5);
      const invalidData = "hi";

      // Act
      const result = safeValidateWithZod(invalidData, schema);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe("extractJsonContent", () => {
    it("should return object as-is when content is already an object", () => {
      // Arrange
      const content = { key: "value", number: 42 };

      // Act
      const result = extractJsonContent(content);

      // Assert
      expect(result).toEqual(content);
      expect(result).toBe(content); // Should return same reference
    });

    it("should parse valid JSON string and return parsed object", () => {
      // Arrange
      const content = '{"key": "value", "number": 42}';
      const expected = { key: "value", number: 42 };

      // Act
      const result = extractJsonContent(content);

      // Assert
      expect(result).toEqual(expected);
    });

    it("should throw SchemaValidationError when JSON parsing fails", () => {
      // Arrange
      const invalidJson = '{"invalid": json}';

      // Act & Assert
      expect(() => extractJsonContent(invalidJson)).toThrow(SchemaValidationError);
      expect(() => extractJsonContent(invalidJson)).toThrow("Failed to parse content as JSON");
    });

    it("should throw SchemaValidationError for non-string non-object content", () => {
      // Arrange
      const invalidContent = 42;

      // Act & Assert
      expect(() => extractJsonContent(invalidContent as unknown as string | Record<string, unknown>)).toThrow(
        SchemaValidationError
      );
      expect(() => extractJsonContent(invalidContent as unknown as string | Record<string, unknown>)).toThrow(
        "Invalid content type"
      );
    });
  });

  describe("validateJsonMessage", () => {
    it("should extract and validate JSON content from message object", () => {
      // Arrange
      const schema = z.object({ name: z.string(), age: z.number() });
      const message = {
        content: '{"name": "John", "age": 30}',
      };

      // Act
      const result = validateJsonMessage(message, schema);

      // Assert
      expect(result).toEqual({ name: "John", age: 30 });
    });

    it("should handle object content directly", () => {
      // Arrange
      const schema = z.object({ name: z.string(), age: z.number() });
      const message = {
        content: { name: "John", age: 30 },
      };

      // Act
      const result = validateJsonMessage(message, schema);

      // Assert
      expect(result).toEqual({ name: "John", age: 30 });
    });

    it("should throw SchemaValidationError when JSON parsing fails", () => {
      // Arrange
      const schema = z.object({ name: z.string() });
      const message = {
        content: '{"invalid": json}',
      };

      // Act & Assert
      expect(() => validateJsonMessage(message, schema)).toThrow(SchemaValidationError);
    });

    it("should throw SchemaValidationError when validation fails", () => {
      // Arrange
      const schema = z.object({ name: z.string(), age: z.number().positive() });
      const message = {
        content: '{"name": "John", "age": -5}',
      };

      // Act & Assert
      expect(() => validateJsonMessage(message, schema)).toThrow(SchemaValidationError);
    });
  });

  describe("Common validation schemas", () => {
    describe("EmailSchema", () => {
      it("should validate correct email addresses", () => {
        const validEmails = ["test@example.com", "user.name@domain.co.uk", "test+tag@gmail.com"];

        validEmails.forEach((email) => {
          expect(() => EmailSchema.parse(email)).not.toThrow();
        });
      });

      it("should reject invalid email addresses", () => {
        const invalidEmails = ["invalid", "test@", "@example.com", "test..test@example.com"];

        invalidEmails.forEach((email) => {
          expect(() => EmailSchema.parse(email)).toThrow();
        });
      });
    });

    describe("UUIDSchema", () => {
      it("should validate correct UUIDs", () => {
        const validUUID = "123e4567-e89b-12d3-a456-426614174000";
        expect(() => UUIDSchema.parse(validUUID)).not.toThrow();
      });

      it("should reject invalid UUIDs", () => {
        const invalidUUID = "not-a-uuid";
        expect(() => UUIDSchema.parse(invalidUUID)).toThrow();
      });
    });

    describe("URLSchema", () => {
      it("should validate correct URLs", () => {
        const validURLs = ["https://example.com", "http://localhost:3000", "https://sub.domain.com/path?query=value"];

        validURLs.forEach((url) => {
          expect(() => URLSchema.parse(url)).not.toThrow();
        });
      });

      it("should reject invalid URLs", () => {
        const invalidURLs = [
          "not-a-url",
          "invalid",
          "example.com", // Missing protocol
          "://example.com", // Missing protocol name
          "http://", // Missing hostname
        ];

        invalidURLs.forEach((url) => {
          expect(() => URLSchema.parse(url)).toThrow();
        });
      });
    });

    describe("ISODateSchema", () => {
      it("should validate correct ISO date strings", () => {
        const validDates = ["2025-01-01T00:00:00.000Z", "2025-12-31T23:59:59.999Z", "2025-06-15T12:30:45Z"];

        validDates.forEach((date) => {
          expect(() => ISODateSchema.parse(date)).not.toThrow();
        });
      });

      it("should reject invalid ISO date strings", () => {
        const invalidDates = ["2025-13-01", "not-a-date", "2025/01/01"];
        invalidDates.forEach((date) => {
          expect(() => ISODateSchema.parse(date)).toThrow();
        });
      });
    });

    describe("PositiveIntSchema", () => {
      it("should validate positive integers", () => {
        const validNumbers = [1, 100, 999999];
        validNumbers.forEach((num) => {
          expect(() => PositiveIntSchema.parse(num)).not.toThrow();
        });
      });

      it("should reject non-positive integers", () => {
        const invalidNumbers = [0, -1, 1.5, "1"];
        invalidNumbers.forEach((num) => {
          expect(() => PositiveIntSchema.parse(num)).toThrow();
        });
      });
    });

    describe("NonNegativeIntSchema", () => {
      it("should validate non-negative integers", () => {
        const validNumbers = [0, 1, 100, 999999];
        validNumbers.forEach((num) => {
          expect(() => NonNegativeIntSchema.parse(num)).not.toThrow();
        });
      });

      it("should reject negative numbers and non-integers", () => {
        const invalidNumbers = [-1, 1.5, "0"];
        invalidNumbers.forEach((num) => {
          expect(() => NonNegativeIntSchema.parse(num)).toThrow();
        });
      });
    });

    describe("JsonObjectSchema", () => {
      it("should validate objects", () => {
        const validObjects = [{}, { key: "value" }, { nested: { object: true } }];
        validObjects.forEach((obj) => {
          expect(() => JsonObjectSchema.parse(obj)).not.toThrow();
        });
      });

      it("should reject non-objects", () => {
        const invalidValues = ["string", 42, null, undefined, []];
        invalidValues.forEach((value) => {
          expect(() => JsonObjectSchema.parse(value)).toThrow();
        });
      });
    });

    describe("PaginationSchema", () => {
      it("should validate correct pagination parameters", () => {
        const validPagination: Pagination = { page: 1, limit: 20 };
        expect(() => PaginationSchema.parse(validPagination)).not.toThrow();
      });

      it("should provide default values", () => {
        const partialPagination = {};
        const result = PaginationSchema.parse(partialPagination);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
      });

      it("should reject invalid page numbers", () => {
        const invalidPagination = { page: 0, limit: 20 };
        expect(() => PaginationSchema.parse(invalidPagination)).toThrow();
      });

      it("should reject invalid limit numbers", () => {
        const invalidPagination = { page: 1, limit: 0 };
        expect(() => PaginationSchema.parse(invalidPagination)).toThrow();
      });

      it("should reject limits over 100", () => {
        const invalidPagination = { page: 1, limit: 150 };
        expect(() => PaginationSchema.parse(invalidPagination)).toThrow();
      });
    });
  });
});
