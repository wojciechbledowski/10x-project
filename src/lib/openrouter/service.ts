/**
 * OpenRouter Service
 *
 * Main service class for interacting with OpenRouter API.
 * Provides strongly-typed wrapper for chat completions with error handling,
 * retry logic, and structured response support.
 */

import { HttpClient } from "./httpClient";
import { ConsoleLogger } from "@/lib/utils/logger";
import { NoopRateLimiter } from "@/lib/utils/rateLimiter";
import { ValidationError } from "@/lib/utils/errors";
import { OpenRouterError } from "./errors";
import type {
  ChatMessage,
  ChatOptions,
  ChatCompletion,
  ChatRequestPayload,
  OpenRouterConfig,
  ModelParams,
} from "./openrouter.types";
import type { Logger } from "@/lib/utils/logger";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.7;

/**
 * OpenRouterService - Main service for OpenRouter API integration
 */
export class OpenRouterService {
  private readonly httpClient: HttpClient;
  private readonly logger: Logger;
  private defaultModel: string;
  private defaultParams: Partial<ModelParams>;

  // Exposed for debugging and testing
  public lastRequest: ChatRequestPayload | null = null;
  public lastResponse: ChatCompletion | null = null;

  constructor(config: OpenRouterConfig) {
    // Validate required configuration
    if (!config.apiKey) {
      throw new ValidationError("API key is required", {
        field: "apiKey",
      });
    }

    // Initialize logger with OpenRouter context
    this.logger = config.logger || new ConsoleLogger("OpenRouter");

    // Set defaults
    const baseURL = config.baseURL || DEFAULT_BASE_URL;
    const timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.defaultModel = config.defaultModel || DEFAULT_MODEL;
    this.defaultParams = config.defaultParams || {
      temperature: DEFAULT_TEMPERATURE,
    };

    // Initialize HTTP client
    this.httpClient = new HttpClient({
      baseURL,
      apiKey: config.apiKey,
      timeoutMs,
      logger: this.logger,
    });

    // Initialize rate limiter if provided
    const rateLimiter = config.rateLimiter || new NoopRateLimiter();

    // Store rate limiter for potential future use
    this.checkRateLimit = async () => {
      const allowed = await rateLimiter.checkLimit();
      if (!allowed) {
        throw new ValidationError("Rate limit exceeded - request not allowed");
      }
    };

    this.recordUsage = async (tokens?: number) => {
      await rateLimiter.recordUsage(tokens);
    };

    this.logger.info("OpenRouterService initialized", {
      baseURL,
      model: this.defaultModel,
    });
  }

  private checkRateLimit: () => Promise<void>;
  private recordUsage: (tokens?: number) => Promise<void>;

  /**
   * Set the default model for future requests
   */
  setModel(model: string): void {
    if (!model || typeof model !== "string") {
      throw new ValidationError("Model must be a non-empty string");
    }
    this.defaultModel = model;
    this.logger.info("Default model updated", { model });
  }

  /**
   * Update default model parameters
   */
  setDefaultParams(params: Partial<ModelParams>): void {
    this.defaultParams = { ...this.defaultParams, ...params };
    this.logger.info("Default params updated", { params: this.defaultParams });
  }

  /**
   * Execute a chat completion request
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatCompletion> {
    // Check rate limit
    await this.checkRateLimit();

    // Validate messages
    this.validateMessages(messages);

    // Build request payload
    const payload = this.buildPayload(messages, options);

    // Validate payload
    this.validatePayload(payload);

    // Log request (without sensitive data)
    this.log("debug", "Sending chat request", {
      model: payload.model,
      messageCount: messages.length,
    });

    // Store request for debugging
    this.lastRequest = payload;

    try {
      // Execute request
      const response = await this.httpClient.post<ChatCompletion>(
        "/chat/completions",
        payload as Record<string, unknown>,
        options?.signal
      );

      // Handle response
      const completion = this.handleResponse(response);

      // Store response for debugging
      this.lastResponse = completion;

      // Record usage
      if (completion.usage) {
        await this.recordUsage(completion.usage.total_tokens);
      }

      this.log("debug", "Chat request successful", {
        completionId: completion.id,
        tokens: completion.usage?.total_tokens,
      });

      return completion;
    } catch (error) {
      this.log("error", "Chat request failed", {
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof OpenRouterError ? error.code : "UNKNOWN",
      });
      throw error;
    }
  }

  /**
   * Validate chat messages
   */
  private validateMessages(messages: ChatMessage[]): void {
    if (!Array.isArray(messages)) {
      throw new ValidationError("Messages must be an array");
    }

    if (messages.length === 0) {
      throw new ValidationError("Messages array cannot be empty");
    }

    for (const [index, message] of messages.entries()) {
      if (!message || typeof message !== "object") {
        throw new ValidationError(`Message at index ${index} is invalid`, {
          index,
          message,
        });
      }

      if (!message.role) {
        throw new ValidationError(`Message at index ${index} missing role`, {
          index,
        });
      }

      const validRoles = ["system", "user", "assistant", "tool"];
      if (!validRoles.includes(message.role)) {
        throw new ValidationError(`Message at index ${index} has invalid role: ${message.role}`, {
          index,
          role: message.role,
        });
      }

      if (!message.content) {
        throw new ValidationError(`Message at index ${index} missing content`, { index });
      }
    }
  }

  /**
   * Build request payload from messages and options
   */
  private buildPayload(messages: ChatMessage[], options?: ChatOptions): ChatRequestPayload {
    const model = options?.model || this.defaultModel;
    const params = { ...this.defaultParams, ...options?.params };

    const payload: ChatRequestPayload = {
      model,
      messages,
      ...params,
    };

    // Add response format if provided
    if (options?.responseFormat) {
      payload.response_format = options.responseFormat;
    }

    return payload;
  }

  /**
   * Validate request payload
   */
  private validatePayload(payload: ChatRequestPayload): void {
    // Validate model
    if (!payload.model) {
      throw new ValidationError("Model is required");
    }

    // Validate messages
    if (!payload.messages || payload.messages.length === 0) {
      throw new ValidationError("Messages are required");
    }

    // Validate token limits (basic check)
    if (payload.max_tokens !== undefined) {
      if (typeof payload.max_tokens !== "number" || payload.max_tokens <= 0) {
        throw new ValidationError("max_tokens must be a positive number", {
          max_tokens: payload.max_tokens,
        });
      }
    }

    // Validate temperature
    if (payload.temperature !== undefined) {
      if (typeof payload.temperature !== "number" || payload.temperature < 0 || payload.temperature > 2) {
        throw new ValidationError("temperature must be between 0 and 2", {
          temperature: payload.temperature,
        });
      }
    }

    // Validate top_p
    if (payload.top_p !== undefined) {
      if (typeof payload.top_p !== "number" || payload.top_p < 0 || payload.top_p > 1) {
        throw new ValidationError("top_p must be between 0 and 1", {
          top_p: payload.top_p,
        });
      }
    }
  }

  /**
   * Handle and validate response
   */
  private handleResponse(response: ChatCompletion): ChatCompletion {
    // Basic validation
    if (!response) {
      throw new ValidationError("Empty response from API");
    }

    if (!response.choices || !Array.isArray(response.choices)) {
      throw new ValidationError("Invalid response: missing choices array");
    }

    if (response.choices.length === 0) {
      throw new ValidationError("Invalid response: empty choices array");
    }

    // Validate first choice
    const firstChoice = response.choices[0];
    if (!firstChoice || !firstChoice.message) {
      throw new ValidationError("Invalid response: missing message in choice");
    }

    return response;
  }

  /**
   * Structured logging with redacted sensitive data
   */
  private log(level: "debug" | "info" | "warn" | "error", message: string, meta?: Record<string, unknown>): void {
    // Redact sensitive data from meta
    const safeMeta = meta ? this.redactSensitiveData(meta) : undefined;

    switch (level) {
      case "debug":
        this.logger.debug(message, safeMeta);
        break;
      case "info":
        this.logger.info(message, safeMeta);
        break;
      case "warn":
        this.logger.warn(message, safeMeta);
        break;
      case "error":
        this.logger.error(message, safeMeta);
        break;
    }
  }

  /**
   * Redact sensitive information from log metadata
   */
  private redactSensitiveData(meta: Record<string, unknown>): Record<string, unknown> {
    const redacted = { ...meta };

    // Redact API keys
    if ("apiKey" in redacted) {
      redacted.apiKey = "[REDACTED]";
    }

    // Redact authorization headers
    if ("authorization" in redacted) {
      redacted.authorization = "[REDACTED]";
    }

    return redacted;
  }
}
