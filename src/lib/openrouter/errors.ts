/**
 * OpenRouter Service Error Classes
 *
 * Service-specific error types that extend generic error classes.
 */

import { AppError } from "@/lib/utils/errors";

/**
 * Base error class for all OpenRouter service errors
 */
export class OpenRouterError extends AppError {
  constructor(message: string, code: string, cause?: Error) {
    super(message, code, cause);
    this.name = "OpenRouterError";
  }
}

/**
 * Model not found or unavailable error
 */
export class ModelError extends OpenRouterError {
  public readonly modelName?: string;

  constructor(message: string, modelName?: string, cause?: Error) {
    super(message, "MODEL_ERROR", cause);
    this.modelName = modelName;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      modelName: this.modelName,
    };
  }
}
