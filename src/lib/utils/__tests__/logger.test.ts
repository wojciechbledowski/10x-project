import { describe, it, expect, beforeEach, vi } from "vitest";
import { type Logger, ConsoleLogger, NoopLogger } from "../logger";

describe("Logger Utilities", () => {
  describe("Logger interface", () => {
    it("should define the required methods", () => {
      // Arrange & Act & Assert
      // This is more of a TypeScript compile-time check, but we can verify the interface exists
      const noopLogger: Logger = new NoopLogger();
      expect(typeof noopLogger.debug).toBe("function");
      expect(typeof noopLogger.info).toBe("function");
      expect(typeof noopLogger.warn).toBe("function");
      expect(typeof noopLogger.error).toBe("function");
    });
  });

  describe("ConsoleLogger", () => {
    let consoleLogger: ConsoleLogger;
    let mockConsole: {
      debug: ReturnType<typeof vi.fn>;
      info: ReturnType<typeof vi.fn>;
      warn: ReturnType<typeof vi.fn>;
      error: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      // Mock console methods
      mockConsole = {
        debug: vi.spyOn(console, "debug").mockImplementation(vi.fn()),
        info: vi.spyOn(console, "info").mockImplementation(vi.fn()),
        warn: vi.spyOn(console, "warn").mockImplementation(vi.fn()),
        error: vi.spyOn(console, "error").mockImplementation(vi.fn()),
      };

      consoleLogger = new ConsoleLogger();
    });

    afterEach(() => {
      // Restore console methods
      vi.restoreAllMocks();
    });

    it("should create logger without context", () => {
      // Arrange & Act
      const logger = new ConsoleLogger();

      // Assert
      expect(logger).toBeInstanceOf(ConsoleLogger);
    });

    it("should create logger with context", () => {
      // Arrange & Act
      const logger = new ConsoleLogger("TestContext");

      // Assert
      expect(logger).toBeDefined();
    });

    it("should log debug messages without meta", () => {
      // Act
      consoleLogger.debug("Debug message");

      // Assert
      expect(mockConsole.debug).toHaveBeenCalledWith("Debug message");
      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
    });

    it("should log debug messages with meta", () => {
      // Arrange
      const meta = { userId: "123", action: "login" };

      // Act
      consoleLogger.debug("Debug message", meta);

      // Assert
      expect(mockConsole.debug).toHaveBeenCalledWith("Debug message", meta);
    });

    it("should log info messages without meta", () => {
      // Act
      consoleLogger.info("Info message");

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith("Info message");
    });

    it("should log info messages with meta", () => {
      // Arrange
      const meta = { requestId: "req-123" };

      // Act
      consoleLogger.info("Info message", meta);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith("Info message", meta);
    });

    it("should log warn messages without meta", () => {
      // Act
      consoleLogger.warn("Warning message");

      // Assert
      expect(mockConsole.warn).toHaveBeenCalledWith("Warning message");
    });

    it("should log warn messages with meta", () => {
      // Arrange
      const meta = { error: "ValidationError" };

      // Act
      consoleLogger.warn("Warning message", meta);

      // Assert
      expect(mockConsole.warn).toHaveBeenCalledWith("Warning message", meta);
    });

    it("should log error messages without meta", () => {
      // Act
      consoleLogger.error("Error message");

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith("Error message");
    });

    it("should log error messages with meta", () => {
      // Arrange
      const meta = { stack: "Error stack trace" };

      // Act
      consoleLogger.error("Error message", meta);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith("Error message", meta);
    });

    it("should not log when meta is empty object", () => {
      // Act
      consoleLogger.debug("Debug message", {});

      // Assert
      expect(mockConsole.debug).toHaveBeenCalledWith("Debug message");
    });

    it("should not log when meta is undefined", () => {
      // Act
      consoleLogger.info("Info message", undefined);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith("Info message");
    });

    it("should prefix messages with context when provided", () => {
      // Arrange
      const contextLogger = new ConsoleLogger("MyService");

      // Act
      contextLogger.info("Test message");

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith("[MyService] Test message");
    });

    it("should handle all log levels with context", () => {
      // Arrange
      const contextLogger = new ConsoleLogger("AuthService");
      const meta = { userId: "user-123" };

      // Act
      contextLogger.debug("Debug with context", meta);
      contextLogger.info("Info with context", meta);
      contextLogger.warn("Warn with context", meta);
      contextLogger.error("Error with context", meta);

      // Assert
      expect(mockConsole.debug).toHaveBeenCalledWith("[AuthService] Debug with context", meta);
      expect(mockConsole.info).toHaveBeenCalledWith("[AuthService] Info with context", meta);
      expect(mockConsole.warn).toHaveBeenCalledWith("[AuthService] Warn with context", meta);
      expect(mockConsole.error).toHaveBeenCalledWith("[AuthService] Error with context", meta);
    });

    it("should handle complex meta objects", () => {
      // Arrange
      const complexMeta = {
        user: { id: "123", email: "test@example.com" },
        request: { method: "POST", url: "/api/users" },
        timestamp: new Date().toISOString(),
        nested: { deep: { value: 42 } },
      };

      // Act
      consoleLogger.error("Complex error", complexMeta);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith("Complex error", complexMeta);
    });

    it("should handle null and undefined values in meta", () => {
      // Arrange
      const metaWithNulls = {
        userId: "123",
        sessionId: null,
        metadata: undefined,
        validData: "test",
      };

      // Act
      consoleLogger.warn("Message with nulls", metaWithNulls);

      // Assert
      expect(mockConsole.warn).toHaveBeenCalledWith("Message with nulls", metaWithNulls);
    });
  });

  describe("NoopLogger", () => {
    let noopLogger: NoopLogger;

    beforeEach(() => {
      noopLogger = new NoopLogger();
    });

    it("should not throw on debug calls", () => {
      // Act & Assert
      expect(() => noopLogger.debug("Debug message")).not.toThrow();
      expect(() => noopLogger.debug("Debug message", { meta: "data" })).not.toThrow();
    });

    it("should not throw on info calls", () => {
      // Act & Assert
      expect(() => noopLogger.info("Info message")).not.toThrow();
      expect(() => noopLogger.info("Info message", { meta: "data" })).not.toThrow();
    });

    it("should not throw on warn calls", () => {
      // Act & Assert
      expect(() => noopLogger.warn("Warning message")).not.toThrow();
      expect(() => noopLogger.warn("Warning message", { meta: "data" })).not.toThrow();
    });

    it("should not throw on error calls", () => {
      // Act & Assert
      expect(() => noopLogger.error("Error message")).not.toThrow();
      expect(() => noopLogger.error("Error message", { meta: "data" })).not.toThrow();
    });

    it("should be silent (no console output)", () => {
      // Arrange
      const consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(vi.fn());
      const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(vi.fn());
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn());
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());

      // Act
      noopLogger.debug("Should not log");
      noopLogger.info("Should not log");
      noopLogger.warn("Should not log");
      noopLogger.error("Should not log");

      // Assert
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      // Cleanup
      vi.restoreAllMocks();
    });
  });

  describe("Logger implementations comparison", () => {
    it("should demonstrate different behaviors between implementations", () => {
      // Arrange
      const consoleLogger = new ConsoleLogger("Test");
      const noopLogger = new NoopLogger();

      const consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(vi.fn());
      const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(vi.fn());

      // Act
      consoleLogger.debug("Console debug message");
      noopLogger.debug("Noop debug message");

      consoleLogger.info("Console info message");
      noopLogger.info("Noop info message");

      // Assert
      expect(consoleDebugSpy).toHaveBeenCalledWith("[Test] Console debug message");
      expect(consoleInfoSpy).toHaveBeenCalledWith("[Test] Console info message");

      // Noop logger should not call console
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);

      // Cleanup
      vi.restoreAllMocks();
    });
  });

  describe("Logger usage patterns", () => {
    it("should support structured logging with consistent meta format", () => {
      // Arrange
      const logger = new ConsoleLogger("APIService");
      const consoleSpy = vi.spyOn(console, "info").mockImplementation(vi.fn());

      const meta = {
        requestId: "req-12345",
        userId: "user-67890",
        method: "GET",
        url: "/api/decks",
        duration: 150,
        statusCode: 200,
      };

      // Act
      logger.info("API request completed", meta);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("[APIService] API request completed", meta);

      // Cleanup
      consoleSpy.mockRestore();
    });

    it("should handle error logging with stack traces", () => {
      // Arrange
      const logger = new ConsoleLogger("ErrorHandler");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());

      const error = new Error("Database connection failed");
      error.stack = "Error: Database connection failed\n    at connect (/app/db.ts:42:13)";

      const meta = {
        error: error.message,
        stack: error.stack,
        userId: "user-123",
        timestamp: new Date().toISOString(),
      };

      // Act
      logger.error("Database operation failed", meta);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("[ErrorHandler] Database operation failed", meta);

      // Cleanup
      consoleSpy.mockRestore();
    });
  });
});
