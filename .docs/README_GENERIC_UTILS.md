# Generic Utilities

Reusable utility functions and classes for application-wide use across different services and modules.

## Overview

The generic utilities (`src/lib/utils/`) provide common functionality that can be shared across different services:

- **Logger** - Structured logging with context support
- **Errors** - Comprehensive error hierarchy for consistent error handling
- **Rate Limiter** - Token bucket and sliding window rate limiting algorithms
- **Validation** - Zod-based validation utilities

## Installation

These utilities are already part of the project. Import them as needed:

```typescript
import { ConsoleLogger, ValidationError, TokenBucketRateLimiter, validateWithZod } from "@/lib/utils";
```

---

## Logger

### Interface

```typescript
interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}
```

### Implementations

#### ConsoleLogger

Logs to console with optional context prefix:

```typescript
import { ConsoleLogger } from "@/lib/utils";

// Without context
const logger = new ConsoleLogger();
logger.info("User logged in", { userId: "123" });
// Output: User logged in { userId: '123' }

// With context
const logger = new ConsoleLogger("AuthService");
logger.info("User logged in", { userId: "123" });
// Output: [AuthService] User logged in { userId: '123' }
```

#### NoopLogger

Silent logger for testing or production when logging is disabled:

```typescript
import { NoopLogger } from "@/lib/utils";

const logger = new NoopLogger();
logger.info("This won't be logged");
```

---

## Error Classes

All error classes extend `AppError` which provides:

- `message` - Error description
- `code` - Error code string
- `cause` - Original error if available
- `statusCode` - HTTP status code (if applicable)
- `toJSON()` - Serialization method

### Available Error Types

#### AppError

Base error class for all application errors:

```typescript
import { AppError } from "@/lib/utils";

throw new AppError("Something went wrong", "CUSTOM_ERROR", originalError, 500);
```

#### HttpError

For HTTP-related errors:

```typescript
import { HttpError } from "@/lib/utils";

throw new HttpError("Request failed", 500, responseBody);
```

#### ValidationError

For data validation failures:

```typescript
import { ValidationError } from "@/lib/utils";

throw new ValidationError("Invalid email", { field: "email", value: "invalid" });
```

#### AuthError

For authentication failures:

```typescript
import { AuthError } from "@/lib/utils";

throw new AuthError("Invalid credentials");
```

#### NotFoundError

For missing resources:

```typescript
import { NotFoundError } from "@/lib/utils";

throw new NotFoundError("User not found", "User", "123");
```

#### RateLimitError

For rate limit exceeded:

```typescript
import { RateLimitError } from "@/lib/utils";

throw new RateLimitError("Too many requests", 60000); // retry after 60s
```

#### SchemaValidationError

For schema/type validation failures:

```typescript
import { SchemaValidationError } from "@/lib/utils";

throw new SchemaValidationError("Invalid schema", ["field: expected string, got number"]);
```

#### TimeoutError

For operation timeouts:

```typescript
import { TimeoutError } from "@/lib/utils";

throw new TimeoutError("Operation timed out", 5000);
```

#### NetworkError

For network connectivity issues:

```typescript
import { NetworkError } from "@/lib/utils";

throw new NetworkError("Failed to connect to server");
```

#### ForbiddenError

For access forbidden:

```typescript
import { ForbiddenError } from "@/lib/utils";

throw new ForbiddenError("You don't have permission");
```

#### InternalError

For internal server errors:

```typescript
import { InternalError } from "@/lib/utils";

throw new InternalError("Unexpected server error");
```

---

## Rate Limiter

### Interface

```typescript
interface RateLimiter {
  checkLimit(): Promise<boolean>;
  recordUsage(tokens?: number): Promise<void>;
}
```

### Implementations

#### NoopRateLimiter

No rate limiting (useful for development):

```typescript
import { NoopRateLimiter } from "@/lib/utils";

const limiter = new NoopRateLimiter();
await limiter.checkLimit(); // Always returns true
```

#### TokenBucketRateLimiter

Token bucket algorithm (allows bursts):

```typescript
import { TokenBucketRateLimiter } from "@/lib/utils";

const limiter = new TokenBucketRateLimiter(
  100, // max 100 tokens (burst capacity)
  10 // refill 10 tokens per second
);

if (await limiter.checkLimit()) {
  // Process request
  await limiter.recordUsage(1);
} else {
  throw new RateLimitError("Rate limit exceeded");
}

// Get current token count
console.log(limiter.getCurrentTokens());

// Reset limiter
limiter.reset();
```

#### SlidingWindowRateLimiter

Sliding window algorithm (more accurate):

```typescript
import { SlidingWindowRateLimiter } from "@/lib/utils";

const limiter = new SlidingWindowRateLimiter(
  100, // max 100 requests
  60000 // per 60 seconds
);

if (await limiter.checkLimit()) {
  await limiter.recordUsage(1);
} else {
  throw new RateLimitError("Rate limit exceeded");
}

// Get current count
console.log(limiter.getCurrentCount());
```

---

## Validation

Zod-based validation utilities for type-safe data validation.

### validateWithZod

Validate data against a Zod schema:

```typescript
import { validateWithZod } from "@/lib/utils";
import { z } from "zod";

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().positive(),
});

try {
  const user = validateWithZod(data, UserSchema, "User");
  // user is fully typed
} catch (error) {
  // SchemaValidationError with detailed validation errors
}
```

### safeValidateWithZod

Validate without throwing errors:

```typescript
import { safeValidateWithZod } from "@/lib/utils";

const result = safeValidateWithZod(data, UserSchema);

if (result.success) {
  console.log(result.data); // Typed data
} else {
  console.error(result.error); // ZodError
}
```

### extractJsonContent

Parse JSON from string or return object:

```typescript
import { extractJsonContent } from "@/lib/utils";

const json = extractJsonContent('{"name": "John"}');
// Returns: { name: "John" }

const json2 = extractJsonContent({ name: "John" });
// Returns: { name: "John" }
```

### validateJsonMessage

Validate message-like structures:

```typescript
import { validateJsonMessage } from "@/lib/utils";
import { z } from "zod";

const message = {
  content: '{"title": "Hello", "body": "World"}',
};

const MessageSchema = z.object({
  title: z.string(),
  body: z.string(),
});

const validated = validateJsonMessage(message, MessageSchema, "Message");
```

### Common Schemas

Pre-defined schemas for common validations:

```typescript
import {
  EmailSchema,
  UUIDSchema,
  URLSchema,
  ISODateSchema,
  PositiveIntSchema,
  NonNegativeIntSchema,
  JsonObjectSchema,
  PaginationSchema,
} from "@/lib/utils";

// Email validation
const email = EmailSchema.parse("user@example.com");

// UUID validation
const id = UUIDSchema.parse("123e4567-e89b-12d3-a456-426614174000");

// URL validation
const url = URLSchema.parse("https://example.com");

// Pagination
const pagination = PaginationSchema.parse({ page: 1, limit: 20 });
// Type: { page: number, limit: number }
```

---

## Usage Examples

### Creating a Service with Generic Utilities

```typescript
import { ConsoleLogger, ValidationError, TokenBucketRateLimiter } from "@/lib/utils";
import type { Logger, RateLimiter } from "@/lib/utils";

class MyService {
  private readonly logger: Logger;
  private readonly rateLimiter: RateLimiter;

  constructor(serviceName: string) {
    this.logger = new ConsoleLogger(serviceName);
    this.rateLimiter = new TokenBucketRateLimiter(50, 5);
  }

  async processRequest(data: unknown): Promise<void> {
    // Check rate limit
    if (!(await this.rateLimiter.checkLimit())) {
      throw new RateLimitError("Too many requests");
    }

    // Validate data
    if (!data) {
      throw new ValidationError("Data is required");
    }

    // Log
    this.logger.info("Processing request", { dataType: typeof data });

    // Process...
    await this.rateLimiter.recordUsage(1);

    this.logger.info("Request processed successfully");
  }
}
```

### Error Handling Pattern

```typescript
import {
  AuthError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  InternalError,
} from "@/lib/utils";

try {
  await someOperation();
} catch (error) {
  if (error instanceof AuthError) {
    return new Response("Unauthorized", { status: 401 });
  } else if (error instanceof ValidationError) {
    return new Response(JSON.stringify({ errors: error.details }), { status: 400 });
  } else if (error instanceof NotFoundError) {
    return new Response("Resource not found", { status: 404 });
  } else if (error instanceof RateLimitError) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: { "Retry-After": String(error.retryAfter || 60) },
    });
  } else if (error instanceof TimeoutError) {
    return new Response("Request timeout", { status: 408 });
  } else if (error instanceof NetworkError) {
    return new Response("Network error", { status: 503 });
  } else {
    console.error("Unexpected error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
```

---

## Best Practices

1. **Use specific error types** - Don't use generic `Error`, use appropriate error classes
2. **Add context to logs** - Use the `meta` parameter to add structured data
3. **Validate early** - Validate data at service boundaries using Zod schemas
4. **Rate limit appropriately** - Choose between token bucket (bursty) or sliding window (smooth)
5. **Handle errors consistently** - Use the same error handling pattern across services
6. **Log sensitive data carefully** - Never log passwords, tokens, or PII
7. **Provide helpful error messages** - Include context in error messages for debugging
8. **Use typed schemas** - Define Zod schemas for all data structures and reuse them

---

## Integration with Services

The generic utilities are designed to be service-agnostic. Services like OpenRouter use these utilities and can add service-specific extensions:

```typescript
// Service-specific error extending generic AppError
export class ServiceSpecificError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, "SERVICE_SPECIFIC_ERROR", cause);
  }
}

// Service using generic utilities
import { ConsoleLogger, ValidationError } from "@/lib/utils";
import type { Logger } from "@/lib/utils";

export class MyService {
  private readonly logger: Logger;

  constructor(config: { logger?: Logger }) {
    this.logger = config.logger || new ConsoleLogger("MyService");
  }
}
```
