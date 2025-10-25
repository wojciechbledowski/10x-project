import { describe, it, expect, beforeEach, vi, afterEach, type Mocked } from "vitest";
import { OpenRouterService } from "../service";
import type {
  ChatMessage,
  ChatCompletion,
  OpenRouterConfig,
  ChatOptions,
  ChatRequestPayload,
} from "../openrouter.types";
import { ValidationError } from "@/lib/utils/errors";
import type { Logger } from "@/lib/utils/logger";
import type { RateLimiter } from "@/lib/utils/rateLimiter";

// Test subclass to expose protected methods for testing
class TestableOpenRouterService extends OpenRouterService {
  public testValidateMessages(messages: ChatMessage[]): void {
    return this.validateMessages(messages);
  }

  public testBuildPayload(messages: ChatMessage[], options?: ChatOptions) {
    return this.buildPayload(messages, options);
  }

  public testValidatePayload(payload: ChatRequestPayload): void {
    return this.validatePayload(payload);
  }

  public testHandleResponse(response: ChatCompletion) {
    return this.handleResponse(response);
  }

  public testRedactSensitiveData(meta: Record<string, unknown>) {
    return this.redactSensitiveData(meta);
  }

  public get testDefaultModel() {
    return this.defaultModel;
  }

  public get testDefaultParams() {
    return this.defaultParams;
  }
}

describe("OpenRouterService", () => {
  let mockHttpClient: {
    post: ReturnType<typeof vi.fn>;
  };
  let mockLogger: Mocked<Logger>;
  let mockRateLimiter: Mocked<RateLimiter>;
  let service: TestableOpenRouterService;
  let config: OpenRouterConfig;

  beforeEach(() => {
    // Mock dependencies
    mockHttpClient = {
      post: vi.fn(),
    };

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    mockRateLimiter = {
      checkLimit: vi.fn(),
      recordUsage: vi.fn(),
    };

    config = {
      apiKey: "test-api-key",
      baseURL: "https://api.openrouter.ai/v1",
      defaultModel: "openai/gpt-4o-mini",
      defaultParams: {
        temperature: 0.7,
      },
      logger: mockLogger,
      rateLimiter: mockRateLimiter,
      timeoutMs: 30000,
    };

    // Create service with mocked HttpClient
    service = new TestableOpenRouterService(config);
    // Replace the httpClient with our mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).httpClient = mockHttpClient; // Still need 'as any' for private httpClient property
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with valid config", () => {
      expect(service).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith("OpenRouterService initialized", {
        baseURL: "https://api.openrouter.ai/v1",
        model: "openai/gpt-4o-mini",
      });
    });

    it("should throw ValidationError when apiKey is missing", () => {
      const invalidConfig: Partial<OpenRouterConfig> = { ...config };
      delete invalidConfig.apiKey;

      expect(() => new TestableOpenRouterService(invalidConfig as unknown as OpenRouterConfig)).toThrow(
        ValidationError
      );
      expect(() => new TestableOpenRouterService(invalidConfig as unknown as OpenRouterConfig)).toThrow(
        "API key is required"
      );
    });

    it("should use default values when optional config is missing", () => {
      const minimalConfig = {
        apiKey: "test-key",
      };

      const testService = new TestableOpenRouterService(minimalConfig);

      expect(testService.testDefaultModel).toBe("openai/gpt-4o-mini");
      expect(testService.testDefaultParams.temperature).toBe(0.7);
    });
  });

  describe("setModel", () => {
    it("should update default model successfully", () => {
      service.setModel("openai/gpt-4");

      expect(service.testDefaultModel).toBe("openai/gpt-4");
      expect(mockLogger.info).toHaveBeenCalledWith("Default model updated", {
        model: "openai/gpt-4",
      });
    });

    it("should throw ValidationError for empty model", () => {
      expect(() => service.setModel("")).toThrow(ValidationError);
      expect(() => service.setModel("")).toThrow("Model must be a non-empty string");
    });

    it("should throw ValidationError for invalid model type", () => {
      expect(() => service.setModel(null as unknown as string)).toThrow(ValidationError);
      expect(() => service.setModel(undefined as unknown as string)).toThrow(ValidationError);
    });
  });

  describe("setDefaultParams", () => {
    it("should update default parameters", () => {
      const newParams = { temperature: 0.5, top_p: 0.9 };

      service.setDefaultParams(newParams);

      expect(service.testDefaultParams).toEqual({
        temperature: 0.5,
        top_p: 0.9,
      });
      expect(mockLogger.info).toHaveBeenCalledWith("Default params updated", {
        params: { temperature: 0.5, top_p: 0.9 },
      });
    });

    it("should merge with existing default parameters", () => {
      service.setDefaultParams({ temperature: 0.8 });

      expect(service.testDefaultParams.temperature).toBe(0.8);
      expect(service.testDefaultParams).toHaveProperty("temperature");
    });
  });

  describe("chat", () => {
    const validMessages: ChatMessage[] = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello!" },
    ];

    const mockCompletion: ChatCompletion = {
      id: "chatcmpl-123",
      object: "chat.completion",
      created: 1677652288,
      model: "openai/gpt-4o-mini",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Hello! How can I help you?",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 8,
        total_tokens: 18,
      },
    };

    beforeEach(() => {
      mockRateLimiter.checkLimit.mockResolvedValue(true);
      mockHttpClient.post.mockResolvedValue(mockCompletion);
    });

    it("should execute chat completion successfully", async () => {
      const result = await service.chat(validMessages);

      expect(result).toEqual(mockCompletion);
      expect(mockRateLimiter.checkLimit).toHaveBeenCalled();
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/chat/completions",
        expect.objectContaining({
          model: "openai/gpt-4o-mini",
          messages: validMessages,
          temperature: 0.7,
        }),
        undefined
      );
      expect(mockRateLimiter.recordUsage).toHaveBeenCalledWith(18);
      expect(mockLogger.debug).toHaveBeenCalledWith("Chat request successful", {
        completionId: "chatcmpl-123",
        tokens: 18,
      });
    });

    it("should use custom model when provided in options", async () => {
      const options: ChatOptions = { model: "openai/gpt-4" };

      await service.chat(validMessages, options);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/chat/completions",
        expect.objectContaining({ model: "openai/gpt-4" }),
        undefined
      );
    });

    it("should merge custom params with defaults", async () => {
      const options: ChatOptions = {
        params: { temperature: 0.9, max_tokens: 100 },
      };

      await service.chat(validMessages, options);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/chat/completions",
        expect.objectContaining({
          temperature: 0.9,
          max_tokens: 100,
        }),
        undefined
      );
    });

    it("should include response format when provided", async () => {
      const responseFormat = {
        type: "json_schema" as const,
        json_schema: {
          name: "test_schema",
          strict: true,
          schema: { type: "object" },
        },
      };

      const options: ChatOptions = { responseFormat };

      await service.chat(validMessages, options);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/chat/completions",
        expect.objectContaining({ response_format: responseFormat }),
        undefined
      );
    });

    it("should pass abort signal to http client", async () => {
      const abortController = new AbortController();
      const options: ChatOptions = { signal: abortController.signal };

      await service.chat(validMessages, options);

      expect(mockHttpClient.post).toHaveBeenCalledWith("/chat/completions", expect.any(Object), abortController.signal);
    });

    it("should store last request and response for debugging", async () => {
      await service.chat(validMessages);

      expect(service.lastRequest).toBeDefined();
      expect(service.lastRequest?.model).toBe("openai/gpt-4o-mini");
      expect(service.lastRequest?.messages).toEqual(validMessages);

      expect(service.lastResponse).toEqual(mockCompletion);
    });

    it("should throw ValidationError when rate limit exceeded", async () => {
      mockRateLimiter.checkLimit.mockResolvedValue(false);

      await expect(service.chat(validMessages)).rejects.toThrow(ValidationError);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      const apiError = new Error("API Error");
      mockHttpClient.post.mockRejectedValue(apiError);

      await expect(service.chat(validMessages)).rejects.toThrow(apiError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Chat request failed",
        expect.objectContaining({
          error: "API Error",
          errorType: "UNKNOWN",
        })
      );
    });

    it("should record usage when completion has usage info", async () => {
      await service.chat(validMessages);

      expect(mockRateLimiter.recordUsage).toHaveBeenCalledWith(18);
    });

    it("should not record usage when completion has no usage info", async () => {
      const completionWithoutUsage = { ...mockCompletion };
      delete completionWithoutUsage.usage;
      mockHttpClient.post.mockResolvedValue(completionWithoutUsage);

      await service.chat(validMessages);

      expect(mockRateLimiter.recordUsage).not.toHaveBeenCalled();
    });

    it("should log request details for debugging", async () => {
      await service.chat(validMessages);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Sending chat request",
        expect.objectContaining({
          model: "openai/gpt-4o-mini",
          messageCount: 2,
        })
      );
    });
  });

  describe("validateMessages", () => {
    it("should validate valid messages without error", () => {
      const validMessages: ChatMessage[] = [
        { role: "system", content: "System prompt" },
        { role: "user", content: "User message" },
        { role: "assistant", content: "Assistant response" },
        { role: "tool", content: { result: "tool output" } },
      ];

      expect(() => service.testValidateMessages(validMessages)).not.toThrow();
    });

    it("should throw ValidationError for non-array messages", () => {
      expect(() => service.testValidateMessages("not an array" as unknown as ChatMessage[])).toThrow(ValidationError);
      expect(() => service.testValidateMessages("not an array" as unknown as ChatMessage[])).toThrow(
        "Messages must be an array"
      );
    });

    it("should throw ValidationError for empty messages array", () => {
      expect(() => service.testValidateMessages([])).toThrow(ValidationError);
      expect(() => service.testValidateMessages([])).toThrow("Messages array cannot be empty");
    });

    it("should throw ValidationError for invalid message object", () => {
      const invalidMessages = ["invalid message"] as unknown as ChatMessage[];

      expect(() => service.testValidateMessages(invalidMessages)).toThrow(ValidationError);
      expect(() => service.testValidateMessages(invalidMessages)).toThrow("Message at index 0 is invalid");
    });

    it("should throw ValidationError for missing role", () => {
      const messagesWithoutRole = [{ content: "No role" }] as unknown as ChatMessage[];

      expect(() => service.testValidateMessages(messagesWithoutRole)).toThrow(ValidationError);
      expect(() => service.testValidateMessages(messagesWithoutRole)).toThrow("Message at index 0 missing role");
    });

    it("should throw ValidationError for invalid role", () => {
      const messagesWithInvalidRole = [{ role: "invalid", content: "Invalid role" }] as unknown as ChatMessage[];

      expect(() => service.testValidateMessages(messagesWithInvalidRole)).toThrow(ValidationError);
      expect(() => service.testValidateMessages(messagesWithInvalidRole)).toThrow(
        "Message at index 0 has invalid role: invalid"
      );
    });

    it("should throw ValidationError for missing content", () => {
      const messagesWithoutContent = [{ role: "user" }] as unknown as ChatMessage[];

      expect(() => service.testValidateMessages(messagesWithoutContent)).toThrow(ValidationError);
      expect(() => service.testValidateMessages(messagesWithoutContent)).toThrow("Message at index 0 missing content");
    });
  });

  describe("buildPayload", () => {
    it("should build payload with defaults", () => {
      const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];

      const payload = service.testBuildPayload(messages);

      expect(payload).toEqual({
        model: "openai/gpt-4o-mini",
        messages,
        temperature: 0.7,
      });
    });

    it("should override model and params when provided", () => {
      const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];
      const options: ChatOptions = {
        model: "custom-model",
        params: { temperature: 0.9, max_tokens: 100 },
      };

      const payload = service.testBuildPayload(messages, options);

      expect(payload).toEqual({
        model: "custom-model",
        messages,
        temperature: 0.9,
        max_tokens: 100,
      });
    });

    it("should include response format when provided", () => {
      const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];
      const responseFormat = {
        type: "json_schema" as const,
        json_schema: {
          name: "test",
          strict: true,
          schema: {},
        },
      };
      const options: ChatOptions = { responseFormat };

      const payload = service.testBuildPayload(messages, options);

      expect(payload.response_format).toEqual(responseFormat);
    });
  });

  describe("validatePayload", () => {
    it("should validate valid payload without error", () => {
      const validPayload = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user" as const, content: "Hello" }],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 100,
      };

      expect(() => service.testValidatePayload(validPayload)).not.toThrow();
    });

    it("should throw ValidationError for missing model", () => {
      const invalidPayload = {
        messages: [{ role: "user", content: "Hello" }],
      };

      expect(() => service.testValidatePayload(invalidPayload as ChatRequestPayload)).toThrow(ValidationError);
      expect(() => service.testValidatePayload(invalidPayload as ChatRequestPayload)).toThrow("Model is required");
    });

    it("should throw ValidationError for missing messages", () => {
      const invalidPayload = {
        model: "openai/gpt-4o-mini",
      };

      expect(() => service.testValidatePayload(invalidPayload as ChatRequestPayload)).toThrow(ValidationError);
      expect(() => service.testValidatePayload(invalidPayload as ChatRequestPayload)).toThrow("Messages are required");
    });

    it("should throw ValidationError for invalid max_tokens", () => {
      const invalidPayload = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: -1,
      };

      expect(() => service.testValidatePayload(invalidPayload as ChatRequestPayload)).toThrow(ValidationError);
      expect(() => service.testValidatePayload(invalidPayload as ChatRequestPayload)).toThrow(
        "max_tokens must be a positive number"
      );
    });

    it("should throw ValidationError for invalid temperature", () => {
      const invalidPayload = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
        temperature: 2.5,
      };

      expect(() => service.testValidatePayload(invalidPayload as ChatRequestPayload)).toThrow(ValidationError);
      expect(() => service.testValidatePayload(invalidPayload as ChatRequestPayload)).toThrow(
        "temperature must be between 0 and 2"
      );
    });

    it("should throw ValidationError for invalid top_p", () => {
      const invalidPayload = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
        top_p: 1.5,
      };

      expect(() => service.testValidatePayload(invalidPayload as ChatRequestPayload)).toThrow(ValidationError);
      expect(() => service.testValidatePayload(invalidPayload as ChatRequestPayload)).toThrow(
        "top_p must be between 0 and 1"
      );
    });
  });

  describe("handleResponse", () => {
    const validResponse: ChatCompletion = {
      id: "test-id",
      object: "chat.completion",
      created: 1234567890,
      model: "test-model",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "Test response" },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 5,
        completion_tokens: 10,
        total_tokens: 15,
      },
    };

    it("should return valid response", () => {
      const result = service.testHandleResponse(validResponse);

      expect(result).toEqual(validResponse);
    });

    it("should throw ValidationError for null response", () => {
      expect(() => service.testHandleResponse(null as unknown as ChatCompletion)).toThrow(ValidationError);
      expect(() => service.testHandleResponse(null as unknown as ChatCompletion)).toThrow("Empty response from API");
    });

    it("should throw ValidationError for response without choices", () => {
      const invalidResponse = { ...validResponse };
      delete (invalidResponse as unknown as Record<string, unknown>).choices;

      expect(() => service.testHandleResponse(invalidResponse as ChatCompletion)).toThrow(ValidationError);
      expect(() => service.testHandleResponse(invalidResponse as ChatCompletion)).toThrow(
        "Invalid response: missing choices array"
      );
    });

    it("should throw ValidationError for empty choices array", () => {
      const invalidResponse = { ...validResponse, choices: [] };

      expect(() => service.testHandleResponse(invalidResponse as ChatCompletion)).toThrow(ValidationError);
      expect(() => service.testHandleResponse(invalidResponse as ChatCompletion)).toThrow(
        "Invalid response: empty choices array"
      );
    });

    it("should throw ValidationError for choice without message", () => {
      const invalidResponse = {
        ...validResponse,
        choices: [{ index: 0, finish_reason: "stop" }],
      };

      expect(() => service.testHandleResponse(invalidResponse as ChatCompletion)).toThrow(ValidationError);
      expect(() => service.testHandleResponse(invalidResponse as ChatCompletion)).toThrow(
        "Invalid response: missing message in choice"
      );
    });
  });

  describe("redactSensitiveData", () => {
    it("should redact API keys", () => {
      const meta = { apiKey: "secret-key", other: "data" };

      const result = service.testRedactSensitiveData(meta);

      expect(result.apiKey).toBe("[REDACTED]");
      expect(result.other).toBe("data");
    });

    it("should redact authorization headers", () => {
      const meta = { authorization: "Bearer token", other: "data" };

      const result = service.testRedactSensitiveData(meta);

      expect(result.authorization).toBe("[REDACTED]");
      expect(result.other).toBe("data");
    });

    it("should return copy of original object", () => {
      const meta = { test: "value" };

      const result = service.testRedactSensitiveData(meta);

      expect(result).not.toBe(meta);
      expect(result).toEqual(meta);
    });
  });
});
