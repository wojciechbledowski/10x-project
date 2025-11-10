# API Endpoint Implementation Plan: List User Flashcards (GET /flashcards)

## 1. Endpoint Overview

Retrieve paginated flashcards owned by the authenticated user with optional filtering capabilities. This global flashcard listing endpoint supports filtering by deck, review due status, and full-text search across front/back content. Unlike the deck-specific endpoint, this provides a comprehensive view of all user flashcards regardless of deck assignment.

## 2. Request Details

- **HTTP Method:** `GET`
- **URL Structure:** `/flashcards`
- **Path Parameters:** None
- **Query Parameters:**
  - `page` (number, default 1, min 1) - pagination page number
  - `pageSize` (number, default 20, min 1, max 100) - items per page
  - `cursor` (string, optional) - cursor token for cursor-based pagination (future-proofing)
  - `sort` (string, optional) - sort field with optional `-` prefix for DESC order (allowed: `created_at`, `updated_at`, `next_review_at`)
  - `deckId` (UUID string, optional) - filter flashcards by specific deck
  - `reviewDue` (boolean, optional) - when `true`, return only flashcards whose `next_review_at` is not null and ≤ current timestamp
  - `search` (string, optional) - full-text search query across front and back content

There is **no request body** for this GET endpoint.

## 3. Used Types

- `FlashcardResponse` - DTO for individual flashcard data
- `FlashcardsListResponse` - DTO for paginated flashcard collection
- `ApiErrorResponse` - Standard error response format
- `ListQueryParams` - Base interface for pagination and sorting parameters

## 4. Response Details

| Status  | Description                                                                             | DTO                      |
| ------- | --------------------------------------------------------------------------------------- | ------------------------ |
| **200** | Successful retrieval of user's flashcards with applied filters.                         | `FlashcardsListResponse` |
| **400** | Invalid query parameters (invalid UUID, bad sort field, pagination out of bounds).      | `ApiErrorResponse`       |
| **401** | User not authenticated.                                                                 | `ApiErrorResponse`       |
| **404** | Specified `deckId` filter references a non-existent deck or deck not owned by the user. | `ApiErrorResponse`       |
| **500** | Unhandled server error (database issues, unexpected exceptions).                        | `ApiErrorResponse`       |

### Successful Example (200)

```json
{
  "data": [
    {
      "id": "3d2f…",
      "front": "What is a closure?",
      "back": "A function with preserved lexical scope…",
      "deckId": "4b9d…",
      "source": "MANUAL",
      "easeFactor": 2.5,
      "intervalDays": 7,
      "repetition": 3,
      "nextReviewAt": "2025-10-19T12:00:00Z",
      "createdAt": "2025-09-01T14:22:00Z",
      "updatedAt": "2025-09-15T11:03:00Z",
      "userId": "…",
      "deletedAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 150,
    "totalPages": 8
  }
}
```

## 5. Data Flow

```mermaid
graph TD;
Client--HTTP GET-->AstroAPI[Astro API Route];
AstroAPI--createSupabaseServerInstance-->Supabase➡️Database;
AstroAPI--FlashcardService.listUserFlashcards-->FlashcardService;
FlashcardService--query with RLS-->Database[(flashcards, decks)];
Database--filtered rows-->FlashcardService--DTO mapping-->AstroAPI--JSON-->Client;
```

1. **Auth Middleware** ensures the request is authenticated, attaches `locals.user.id`.
2. API route parses and validates query parameters using Zod schema.
3. If `deckId` filter is provided, validates deck ownership and existence.
4. Calls `flashcardService.listUserFlashcards` with validated parameters and user context.
5. Service builds Supabase query with RLS, applies filters, pagination, and sorting.
6. Rows are mapped to `FlashcardResponse` DTOs, pagination metadata is computed.
7. JSON response is returned to the client.

## 6. Security Considerations

1. **Authentication:** Required - enforced by global authentication middleware. Public paths list does not include this endpoint.
2. **Authorization:**
   - RLS on `flashcards` table automatically restricts access to user's own cards via `user_id = auth.uid()`.
   - Additional validation for `deckId` filter: ensures deck exists, belongs to authenticated user, and is not soft-deleted.
   - No access to other users' flashcards under any circumstances.
3. **Input Validation:**
   - All query parameters validated with Zod schemas including type coercion and bounds checking.
   - `deckId` validated as proper UUID format.
   - `sort` field whitelisted to prevent unauthorized column access.
   - `search` query sanitized and length-limited.
4. **SQL Injection Prevention:** Parameterized queries via Supabase SDK with proper escaping.
5. **Rate Limiting:** Optional - reuse existing `rateLimiter` utility for API protection.
6. **Data Privacy:** User-scoped data isolation through RLS policies.

## 7. Error Handling

- Use `try/catch` blocks around service calls and database operations.
- Map validation errors to **400 Bad Request** with detailed field-level error messages.
- Deck ownership validation failures return **404 Not Found**.
- Database connection errors and unexpected exceptions return **500 Internal Server Error**.
- Log server errors with `lib/logClientError.ts` for server-side issues, optionally inserting structured error records into the `events` table or dedicated error logging table.
- Client-side validation errors (malformed requests) are logged with user context for debugging.

## 8. Performance Considerations

- **Database Indexes:**
  - Primary index on `flashcards(user_id)` for user-scoped queries.
  - `flashcards_user_next_idx` on `(user_id, next_review_at)` for efficient `reviewDue` filtering.
  - `flashcards_search_idx` GIN index for full-text search on `(front || ' ' || back)`.
  - Composite index on `(user_id, deck_id, deleted_at)` for deck filtering.
- **Query Optimization:**
  - Select only required columns for `FlashcardResponse` to minimize data transfer.
  - Use `range()` pagination with `pageSize + 1` to detect next page existence without separate COUNT queries (when cursor pagination is implemented).
  - Apply filters in optimal order: user_id (RLS), deleted_at, deck_id, reviewDue, search.
- **Pagination Limits:** Enforce `pageSize ≤ 100` to prevent excessive memory usage and response times.
- **Full-Text Search:** Leverage PostgreSQL's GIN indexes for efficient text search with ranking.

## 9. Implementation Steps

1. **Create Flashcard Validation Schemas** (`src/lib/flashcards/schemas.ts`):

   ```ts
   export const listFlashcardsQuerySchema = z.object({
     page: z.coerce.number().int().min(1).default(1),
     pageSize: z.coerce.number().int().min(1).max(100).default(20),
     sort: z.string().optional().refine(isAllowedSortField, "Invalid sort field"),
     deckId: z.string().uuid().optional(),
     reviewDue: z.coerce.boolean().optional(),
     search: z.string().min(1).max(500).optional(),
     cursor: z.string().optional(),
   });
   ```

2. **Extend FlashcardService** (`src/lib/services/flashcardService.ts`):
   - Add `listUserFlashcards(options)` method accepting userId, pagination, sorting, and filters.
   - Implement deck ownership validation for `deckId` filter.
   - Build Supabase query with conditional filters:

     ```ts
     let query = supabase
       .from("flashcards")
       .select("*", { count: "exact" })
       .eq("user_id", userId)
       .is("deleted_at", null);

     if (deckId) query = query.eq("deck_id", deckId);
     if (reviewDue) query = query.not("next_review_at", "is", null).lte("next_review_at", now);
     if (search) query = query.textSearch("search_vector", search);
     ```

3. **Create API Route** (`src/pages/api/flashcards.ts`):
   - `export const GET: APIRoute = async ({ url, locals, request }) => { … }`
   - Parse and validate query parameters using the schema.
   - Verify deck ownership if `deckId` filter provided.
   - Instantiate Supabase client and FlashcardService.
   - Call service method and handle response/error mapping.
   - Return **200** with paginated flashcard data.

4. **Add Unit Tests**:
   - Test schema validation for all query parameters.
   - Test service method with various filter combinations.
   - Test API route error handling and response formatting.
   - Mock Supabase client for isolated testing.

5. **Integration Testing**:
   - Test end-to-end request flow with real database.
   - Verify RLS policies prevent unauthorized access.
   - Performance test with large datasets and various filter combinations.
