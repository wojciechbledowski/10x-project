# OpenRouter Service

TypeScript service for interacting with the OpenRouter API in Astro applications.

## Environment Setup

Add the following environment variables to your `.env` file:

### Required Variables

```env
OPENROUTER_API_KEY=your_api_key_here
```

Get your API key from [OpenRouter Keys](https://openrouter.ai/keys).

### Optional Variables

```env
# Custom API endpoint (default: https://openrouter.ai/api/v1)
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Request timeout in milliseconds (default: 30000)
OPENROUTER_TIMEOUT_MS=30000

# Default model for completions
OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini
```

## Security Notes

- **Never commit your `.env` file** - API keys should remain secret
- **Never expose API keys in client-side code** - only use the service server-side
- The service automatically redacts API keys in error logs
- All requests use HTTPS for transport security

## Quick Start

```typescript
import { OpenRouterService } from "@/lib/openrouter";

// Initialize the service
const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  defaultModel: "openai/gpt-4o-mini",
});

// Make a chat completion request
const completion = await service.chat([
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "Hello!" },
]);

console.log(completion.choices[0]?.message.content);
```

## Usage Examples

### Basic Chat Completion

```typescript
import { OpenRouterService } from "@/lib/openrouter";

const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  defaultModel: "openai/gpt-4o-mini",
});

const completion = await service.chat([
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "Explain TypeScript in one sentence." },
]);

const response = completion.choices[0]?.message.content;
console.log("Response:", response);
```

### Structured JSON Response

Use JSON Schema to get validated, structured responses:

```typescript
import { OpenRouterService } from "@/lib/openrouter";
import { validateJsonMessage } from "@/lib/utils";
import { z } from "zod";

const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  defaultModel: "openai/gpt-4o-mini",
});

// Define Zod schema
const RecipeSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  prepTime: z.number(),
  cookTime: z.number(),
  servings: z.number(),
});

// Define JSON schema for OpenRouter
const recipeJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    ingredients: { type: "array", items: { type: "string" } },
    instructions: { type: "array", items: { type: "string" } },
    prepTime: { type: "number" },
    cookTime: { type: "number" },
    servings: { type: "number" },
  },
  required: ["title", "ingredients", "instructions", "prepTime", "cookTime", "servings"],
  additionalProperties: false,
};

const completion = await service.chat(
  [
    { role: "system", content: "You are a recipe generator." },
    { role: "user", content: "Create a recipe for chocolate chip cookies." },
  ],
  {
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "Recipe",
        strict: true,
        schema: recipeJsonSchema,
      },
    },
  }
);

// Validate response with Zod
const firstMessage = completion.choices[0]?.message;
if (firstMessage) {
  const recipe = validateJsonMessage(firstMessage, RecipeSchema, "Recipe");
  console.log(recipe); // Fully typed Recipe object
}
```

### Custom Parameters

Control model behavior with custom parameters:

```typescript
const completion = await service.chat(
  [
    { role: "system", content: "You are a creative story writer." },
    { role: "user", content: "Write a short sci-fi story opening." },
  ],
  {
    params: {
      temperature: 1.2, // Higher temperature for creativity
      max_tokens: 200,
      top_p: 0.9,
    },
  }
);
```

### Multi-Turn Conversations

Maintain conversation context:

```typescript
const messages = [
  { role: "system", content: "You are a helpful coding assistant." },
  { role: "user", content: "What is async/await in JavaScript?" },
];

// First turn
const completion1 = await service.chat(messages);
const response1 = completion1.choices[0]?.message.content;

// Continue conversation
messages.push({ role: "assistant", content: response1 });
messages.push({ role: "user", content: "Can you show me an example?" });

// Second turn
const completion2 = await service.chat(messages);
```

### Using in Astro API Routes

```typescript
// src/pages/api/chat.ts
import type { APIContext } from "astro";
import { OpenRouterService } from "@/lib/openrouter";

export async function POST({ request }: APIContext) {
  try {
    const { message } = await request.json();

    const service = new OpenRouterService({
      apiKey: import.meta.env.OPENROUTER_API_KEY,
      defaultModel: "openai/gpt-4o-mini",
    });

    const completion = await service.chat([
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: message },
    ]);

    return new Response(JSON.stringify(completion), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
```

### Rate Limiting

Implement custom rate limiting:

```typescript
import { OpenRouterService } from "@/lib/openrouter";
import { TokenBucketRateLimiter } from "@/lib/utils";

const rateLimiter = new TokenBucketRateLimiter(
  10, // max 10 tokens
  1 // refill 1 token per second
);

const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  defaultModel: "openai/gpt-4o-mini",
  rateLimiter,
});

const completion = await service.chat([{ role: "user", content: "Hello!" }]);
```

### Error Handling

Handle different error types:

```typescript
import { OpenRouterService, AuthError, RateLimitError, ValidationError, TimeoutError } from "@/lib/openrouter";

try {
  const completion = await service.chat(messages);
} catch (error) {
  if (error instanceof AuthError) {
    console.error("Invalid API key");
  } else if (error instanceof RateLimitError) {
    console.error("Rate limit exceeded, retry after:", error.retryAfter);
  } else if (error instanceof ValidationError) {
    console.error("Invalid request:", error.details);
  } else if (error instanceof TimeoutError) {
    console.error("Request timeout");
  } else {
    console.error("Unknown error:", error);
  }
}
```

## API Reference

### OpenRouterService

#### Constructor

```typescript
new OpenRouterService(config: OpenRouterConfig)
```

**Config Options:**

- `apiKey` (required): Your OpenRouter API key
- `baseURL` (optional): Custom API endpoint (default: `https://openrouter.ai/api/v1`)
- `defaultModel` (optional): Default model for requests (default: `openai/gpt-4o-mini`)
- `defaultParams` (optional): Default model parameters
- `logger` (optional): Custom logger implementation
- `rateLimiter` (optional): Custom rate limiter implementation
- `timeoutMs` (optional): Request timeout in milliseconds (default: 30000)

#### Methods

**`chat(messages, options?)`**

Execute a chat completion request.

**Parameters:**

- `messages`: Array of chat messages
- `options` (optional):
  - `model`: Override default model
  - `params`: Model parameters (temperature, max_tokens, top_p)
  - `responseFormat`: JSON schema for structured responses
  - `signal`: AbortSignal for cancellation

**Returns:** `Promise<ChatCompletion>`

**`setModel(model)`**

Update the default model.

**`setDefaultParams(params)`**

Update default model parameters.

#### Properties

- `lastRequest`: Last request payload (for debugging)
- `lastResponse`: Last response (for debugging)

## Error Types

All errors extend `OpenRouterError` with the following properties:

- `message`: Error description
- `code`: Error code
- `cause`: Original error (if any)

**Available Error Types:**

- `HttpError`: Non-2xx HTTP response (includes `status` and `body`)
- `RateLimitError`: Rate limit exceeded (includes `retryAfter`)
- `AuthError`: Authentication failed
- `ValidationError`: Invalid request (includes `details`)
- `ModelError`: Model not found/unavailable (includes `modelName`)
- `ParseError`: JSON parse failure (includes `rawResponse`)
- `SchemaValidationError`: Schema validation failed (includes `validationErrors`)
- `TimeoutError`: Request timeout (includes `timeoutMs`)
- `NetworkError`: Network/DNS failure

## Advanced Features

### Custom Logger

Implement custom logging:

```typescript
import type { Logger } from "@/lib/utils";

class CustomLogger implements Logger {
  debug(message: string, meta?: Record<string, unknown>): void {
    // Your logging implementation
  }
  info(message: string, meta?: Record<string, unknown>): void {
    // Your logging implementation
  }
  warn(message: string, meta?: Record<string, unknown>): void {
    // Your logging implementation
  }
  error(message: string, meta?: Record<string, unknown>): void {
    // Your logging implementation
  }
}

const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  logger: new CustomLogger(),
});
```

### Custom Rate Limiter

Implement custom rate limiting logic:

```typescript
import type { RateLimiter } from "@/lib/utils";

class CustomRateLimiter implements RateLimiter {
  async checkLimit(): Promise<boolean> {
    // Return true if request is allowed
    return true;
  }

  async recordUsage(tokens?: number): Promise<void> {
    // Record usage for rate limiting
  }
}

const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  rateLimiter: new CustomRateLimiter(),
});
```

## Available Models

OpenRouter supports various models from different providers:

- **OpenAI**: `openai/gpt-4o`, `openai/gpt-4o-mini`, `openai/gpt-3.5-turbo`
- **Anthropic**: `anthropic/claude-3-5-sonnet`, `anthropic/claude-3-opus`
- **Google**: `google/gemini-pro`, `google/gemini-pro-vision`
- **Meta**: `meta-llama/llama-3-70b-instruct`

For a complete list of available models, visit [OpenRouter Models](https://openrouter.ai/models).
