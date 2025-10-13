/**
 * OpenRouter Service Type Definitions
 *
 * This file contains all type definitions for the OpenRouterService.
 */

import type { Logger } from "@/lib/utils/logger";
import type { RateLimiter } from "@/lib/utils/rateLimiter";

/**
 * Chat message with role and content
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Record<string, unknown>;
}

/**
 * Model parameters for controlling LLM behavior
 */
export interface ModelParams {
  temperature: number;
  top_p: number;
  max_tokens: number;
  [key: string]: unknown;
}

/**
 * JSON Schema response format configuration
 */
export interface JsonSchemaResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
}

/**
 * Options for chat completion requests
 */
export interface ChatOptions {
  model?: string;
  params?: Partial<ModelParams>;
  responseFormat?: JsonSchemaResponseFormat;
  signal?: AbortSignal;
}

/**
 * Configuration for OpenRouterService
 */
export interface OpenRouterConfig {
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
  defaultParams?: Partial<ModelParams>;
  logger?: Logger;
  rateLimiter?: RateLimiter;
  timeoutMs?: number;
}

/**
 * Chat request payload sent to OpenRouter API
 */
export interface ChatRequestPayload {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  response_format?: JsonSchemaResponseFormat;
  [key: string]: unknown;
}

/**
 * Usage information from API response
 */
export interface UsageInfo {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Choice from API response
 */
export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

/**
 * Complete chat completion response
 */
export interface ChatCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatChoice[];
  usage?: UsageInfo;
}

/**
 * OpenRouter API error response
 */
export interface OpenRouterErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string;
    param?: string;
  };
}
