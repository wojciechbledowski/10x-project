# API Endpoint Implementation Plan: GET /flashcards/{cardId}

## 1. Endpoint Overview

This endpoint retrieves a single flashcard by its unique identifier. The endpoint supports retrieving flashcards that belong to the authenticated user only, with proper authorization enforced through Supabase Row Level Security (RLS) policies.

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/flashcards/{cardId}`
- **Parameters**:
  - **Required**:
    - `cardId` (path parameter): Valid UUID string identifying the flashcard
- **Request Body**: None (GET request)

## 3. Used Types

- **Request Types**: `flashcardIdParamsSchema` (existing schema for path validation)
- **Response Type**: `FlashcardResponse` (existing DTO)

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "uuid",
  "front": "What is the capital of France?",
  "back": "Paris",
  "deckId": "uuid",
  "source": "manual",
  "easeFactor": 2.5,
  "intervalDays": 1,
  "repetition": 0,
  "nextReviewAt": "2025-11-10T10:00:00Z",
  "createdAt": "2025-11-09T09:00:00Z",
  "updatedAt": "2025-11-09T09:00:00Z",
  "userId": "uuid",
  "deletedAt": null
}
```

### Error Responses

- **400 Bad Request**: Invalid UUID format
- **401 Unauthorized**: Missing or invalid authentication token
- **404 Not Found**: Flashcard not found or doesn't belong to user
- **500 Internal Server Error**: Unexpected server error

## 5. Data Flow

1. **Request Validation**: Validate `cardId` path parameter using Zod schema
2. **Authentication Check**: Verify user is authenticated via `locals.user`
3. **Service Call**: Use `FlashcardService.getFlashcard(cardId)` to retrieve data
4. **Response Mapping**: Transform database row to `FlashcardResponse` DTO
5. **Response**: Return 200 with flashcard data or appropriate error status

## 6. Security Considerations

- **Authentication**: Required via Supabase JWT token in Authorization header
- **Authorization**: RLS policies ensure users can only access their own flashcards
- **Input Validation**: UUID validation prevents path traversal and injection attacks
- **Data Sanitization**: All data retrieved from database is properly typed and validated
- **Audit Trail**: Access attempts are logged for security monitoring

## 7. Error Handling

### Validation Errors (400)

```json
{
  "error": {
    "code": "INVALID_ID",
    "message": "cardId must be a valid UUID"
  }
}
```

### Authentication Errors (401)

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### Not Found Errors (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Flashcard not found"
  }
}
```

### Server Errors (500)

```json
{
  "error": {
    "code": "SERVER_ERROR",
    "message": "Unexpected error"
  }
}
```

## 8. Performance

### Database Query Optimization

- Single row lookup by primary key (id)
- RLS policy ensures efficient user-based filtering
- No complex joins or aggregations required

### Caching Strategy

- Consider client-side caching for flashcard data
- Server-side caching may not be necessary for single-item retrieval

### Monitoring

- Log response times for performance tracking
- Monitor error rates for reliability metrics

## 9. Implementation Steps

### Step 1: Add getFlashcard Method to FlashcardService

```typescript
// src/lib/services/flashcardService.ts
async getFlashcard(cardId: string): Promise<FlashcardResponse | null> {
  const { data, error } = await this.supabase
    .from("flashcards")
    .select(`
      id,
      front,
      back,
      deck_id,
      source,
      ease_factor,
      interval_days,
      repetition,
      next_review_at,
      created_at,
      updated_at,
      user_id,
      deleted_at
    `)
    .eq("id", cardId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapFlashcardRowToResponse(data) : null;
}
```

### Step 2: Create API Endpoint File

```typescript
// src/pages/api/flashcards/[cardId].ts
import type { APIRoute } from "astro";
import { flashcardIdParamsSchema } from "../../../lib/decks/schemas";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { FlashcardService } from "../../../lib/services/flashcardService";
import { createErrorResponse, createJsonResponse } from "../../../lib/utils/apiResponse";
import { ConsoleLogger } from "../../../lib/utils/logger";
import type { FlashcardResponse } from "../../../types";

export const prerender = false;

const logger = new ConsoleLogger("GetFlashcardApi");

export const GET: APIRoute = async ({ params, locals, cookies, request }) => {
  if (!locals.user) {
    logger.warn("Unauthenticated flashcard request", { params });
    return createErrorResponse(401, {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const validation = flashcardIdParamsSchema.safeParse(params);

  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => issue.message);
    logger.warn("Invalid cardId provided", { issues, userId: locals.user.id });
    return createErrorResponse(400, {
      code: "INVALID_ID",
      message: "cardId must be a valid UUID",
      details: issues.map((message) => ({ message })),
    });
  }

  const { cardId } = validation.data;

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

  const flashcardService = new FlashcardService(supabase);

  try {
    const flashcard = await flashcardService.getFlashcard(cardId);

    if (!flashcard) {
      logger.info("Flashcard not found", { cardId, userId: locals.user.id });
      return createErrorResponse(404, {
        code: "NOT_FOUND",
        message: "Flashcard not found",
      });
    }

    logger.info("Flashcard retrieved", { cardId, userId: locals.user.id });
    return createJsonResponse<FlashcardResponse>(200, flashcard);
  } catch (error) {
    logger.error("Failed to retrieve flashcard", {
      cardId,
      userId: locals.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createErrorResponse(500, {
      code: "SERVER_ERROR",
      message: "Unexpected error",
    });
  }
};
```

### Step 3: Update FlashcardService Tests

Add unit tests for the new `getFlashcard` method covering:

- Successful retrieval
- Not found scenarios
- Database error handling

### Step 4: Update API Integration Tests

Add end-to-end tests for the GET endpoint covering:

- Authentication requirements
- Valid vs invalid UUIDs
- Access to own vs other users' flashcards
- Soft-deleted flashcards (should return 404)

### Step 5: Documentation Updates

- Update API documentation in `.ai/api/api-plan.md`
- Add endpoint to OpenAPI specification if applicable
- Update any client SDK documentation

### Step 6: Code Review and Validation

- Run ESLint and TypeScript checks
- Verify RLS policies are correctly applied
- Test with actual database to ensure proper data retrieval
