# OpenRouterService Implementation Guide

## 1. Service Description

The **OpenRouterService** is a TypeScript class that provides a strongly-typed wrapper around the OpenRouter API. It encapsulates request construction, response validation, error handling, and security controls, exposing a simple interface for executing LLM-based chat completions from any part of the Astro application (server-side pages, API routes, or background jobs).

Key goals:

- **Ease of use** – one `chat()` method to obtain completions.
- **Type safety** – compile-time types for messages, parameters, and JSON-schema responses.
- **Extensibility** – pluggable logger, rate limiter, caching layer, and middleware hooks.
- **Security** – secrets stored in environment variables, zero exposure on the client.

## 2. Constructor Description

```ts
constructor(config: OpenRouterConfig)
```

`OpenRouterConfig` (interface) fields:
| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| `apiKey` | `string` | yes | – | Bearer token (read from `process.env.OPENROUTER_API_KEY`) |
| `baseURL` | `string` | no | `"https://openrouter.ai/api/v1"` | Override endpoint (mocking / self-host) |
| `defaultModel` | `string` | no | e.g. `"openai/gpt-4o-mini"` | Fallback model name |
| `defaultParams` | `Partial<ModelParams>` | no | `{ temperature: 0.7 }` | Global model parameters |
| `logger` | `Logger` | no | Console logger | Structured logging implementation |
| `rateLimiter` | `RateLimiter` | no | No-op | Enforces usage quotas |

The constructor stores the config, validates mandatory fields, and initialises an internal `fetch` wrapper with sane defaults (JSON headers, timeout, retries).

## 3. Public Methods & Fields

| Method / Field                                                                  | Signature                                                                | Description                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------- |
| `chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatCompletion>` | Core method that sends the chat payload and returns a parsed completion. |
| `setModel(model: string): void`                                                 | Mutate the default model at runtime.                                     |
| `setDefaultParams(params: Partial<ModelParams>): void`                          | Update default temperature, top-p, etc.                                  |
| `lastRequest`                                                                   | `ChatRequestPayload \| null`                                             | Exposed for debugging/tests. |
| `lastResponse`                                                                  | `ChatCompletion \| null`                                                 | Exposed for debugging/tests. |

### Type Aliases

```ts
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Record<string, unknown>;
}

export interface ModelParams {
  temperature: number;
  top_p: number;
  max_tokens: number;
  [key: string]: unknown;
}

export interface ChatOptions {
  model?: string;
  params?: Partial<ModelParams>;
  responseFormat?: JsonSchemaResponseFormat;
  signal?: AbortSignal; // for streaming / cancellation
}
```

## 4. Private Methods & Fields

| Name                | Purpose                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `buildPayload()`    | Merge system & user messages, model, params, and response_format into the request body.    |
| `validatePayload()` | Runtime assert on payload size, token limits, missing fields.                              |
| `signRequest()`     | Attach `Authorization: Bearer` header.                                                     |
| `handleResponse()`  | Decode JSON, detect structured JSON schema, map OpenRouter errors to service-level errors. |
| `retryableFetch()`  | Wrapper around `fetch` with exponential back-off and rate-limit respect.                   |
| `log()`             | Delegate to injected logger with contextual metadata.                                      |

## 5. Error Handling

Potential error scenarios and mitigation:

1. **Network / DNS failures** – Retry with exponential back-off (`retryableFetch`).
2. **Non-2xx HTTP status** – Map to typed `HttpError` containing `status` & body.
3. **Rate limit (HTTP 429 / OpenRouter code `rate_limit`)** – Retry after `Retry-After` header or propagate `RateLimitError`.
4. **Invalid API key (401)** – Throw `AuthError`; redact key in logs.
5. **Malformed request (400)** – Throw `ValidationError` with details.
6. **Model not found / unavailable** – Throw `ModelError`; allow caller fallback.
7. **JSON parse failure** – Throw `ParseError`; log raw response (capped length).
8. **Schema-mismatch in structured response** – Throw `SchemaValidationError` with AJV validation messages.
9. **Timeout / aborted** – Throw `TimeoutError` if `fetch` exceeds configured ms or `AbortSignal` fires.

Each custom error extends a base `OpenRouterError` adding `code`, `message`, and optional `cause`.

## 6. Security Considerations

- **API Key secrecy** – Load from environment (`process.env` or Astro `import.meta.env`) on the server **only**. Never expose in browser bundles.
- **Input sanitisation** – Strip control characters, enforce length limits on user messages to prevent prompt injection escalation.
- **Logging hygiene** – Do **not** log full prompts or completions in production unless explicitly enabled. Redact secrets.
- **Transport security** – Always use HTTPS (`fetch` enforces).
- **Least privilege** – Store key with restricted scopes (if OpenRouter supports).
- **Rate limiting & monitoring** – Use injected `RateLimiter` to protect against abuse.

## 7. Step-by-Step Implementation Plan

1. **Bootstrap files**
   1. `src/lib/openrouter/` – create directory for service.
   2. Add `openrouter.types.ts` for aliases shown above.
2. **Environment setup**
   1. Add `OPENROUTER_API_KEY` to `.env` and reference in Astro config (`server.envPrefix`).
   2. Add `OPENROUTER_TIMEOUT_MS` optional var.
3. **Implement error classes** in `src/lib/openrouter/errors.ts` extending `OpenRouterError`.
4. **Create HttpClient** in `src/lib/openrouter/httpClient.ts` implementing `retryableFetch`, timeout, and auth header.
5. **Implement OpenRouterService** (`src/lib/openrouter/service.ts`):
   1. Accept `OpenRouterConfig` in constructor; set defaults.
   2. Implement private helpers (`buildPayload`, `validatePayload`, etc.).
   3. Implement `chat()` which:
      - Validates & merges options.
      - Calls `httpClient.post('/chat/completions', payload)`.
      - Parses and validates response (schema if provided).
      - Stores `lastRequest` and `lastResponse` for observability.
6. **Add JSON Schema validation with zod**
7. **Usage examples**

   ```ts
   // pages/api/chat.ts
   import { OpenRouterService } from "@/lib/openrouter/service";
   import schema from "@/schemas/recipe.json";

   const service = new OpenRouterService({ defaultModel: "openai/gpt-4o-mini" });

   export async function POST({ request }: APIContext) {
     const body = await request.json();
     const completion = await service.chat(
       [
         { role: "system", content: "You are a recipe generator." },
         { role: "user", content: body.prompt },
       ],
       {
         responseFormat: {
           type: "json_schema",
           json_schema: { name: "Recipe", strict: true, schema },
         },
         params: { temperature: 0.8 },
       }
     );
     return new Response(JSON.stringify(completion), { status: 200 });
   }
   ```

8. **Documentation**
   - Add README section in docs folder explaining how to call the service.

---

### Appendix A – Message & Parameter Examples

1. **System message**
   ```jsonc
   { "role": "system", "content": "You are a senior TypeScript assistant." }
   ```
2. **User message**
   ```jsonc
   { "role": "user", "content": "Explain the event loop in Node.js." }
   ```
3. **Structured response_format**
   ```ts
   const responseFormat = {
     type: "json_schema",
     json_schema: {
       name: "TechArticle",
       strict: true,
       schema: {
         type: "object",
         properties: {
           title: { type: "string" },
           summary: { type: "string" },
           bullets: {
             type: "array",
             items: { type: "string" },
           },
         },
         required: ["title", "summary", "bullets"],
         additionalProperties: false,
       },
     },
   } as const;
   ```
4. **Model name & parameters example**
   ```ts
   await service.chat(messages, {
     model: "openai/gpt-4o-mini",
     params: { temperature: 0.3, top_p: 0.9, max_tokens: 512 },
   });
   ```

> This guide provides everything a developer on the current Astro + TypeScript stack needs to implement, test, and safely operate the OpenRouterService.
