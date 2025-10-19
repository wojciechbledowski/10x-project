# API Endpoint Implementation Plan: List Deck Flashcards (GET /decks/{deckId}/flashcards)

## 1. Endpoint Overview

Retrieve paginated flashcards that belong to a specific deck owned by the authenticated user. The endpoint supports an optional `reviewDue` filter that restricts results to cards that are currently due for review (i.e. `next_review_at <= now()`), enabling the client to build a study queue.

## 2. Request Details

- **HTTP Method:** `GET`
- **URL Structure:** `/decks/{deckId}/flashcards`
- **Path Parameters:**
  - `deckId` (uuid, required) – Identifier of the deck.
- **Query Parameters:**
  - Pagination & sorting (already standardised in `ListQueryParams`):
    - `page` (number, default 1, min 1)
    - `pageSize` (number, default 20, min 1, max 100)
    - `cursor` (string, optional) – cursor-based pagination token (future-proof, ignored in v1 implementation)
    - `sort` (string, optional) – e.g. `created_at`, `-created_at`.
  - Endpoint-specific filters:
    - `reviewDue` (boolean, optional) – When `true`, return only flashcards whose `next_review_at` is **not null** _and_ `<= now()`.

There is **no request body**.

## 3. Used Types

- `FlashcardResponse` – DTO for each flashcard.
- `FlashcardsListResponse` – DTO for paginated list.
- `ApiErrorResponse` – Standard error format.
- `ListQueryParams` – Helper interface for parsing common pagination/sorting params.

## 4. Response Details

| Status  | Description                                                                                  | DTO                      |
| ------- | -------------------------------------------------------------------------------------------- | ------------------------ |
| **200** | Successful retrieval of flashcards list.                                                     | `FlashcardsListResponse` |
| **400** | Invalid `deckId` UUID, bad query params (e.g. page < 1, pageSize > 100, invalid sort field). | `ApiErrorResponse`       |
| **401** | User not authenticated.                                                                      | `ApiErrorResponse`       |
| **404** | Deck not found _or_ does not belong to the user _or_ is soft-deleted.                        | `ApiErrorResponse`       |
| **500** | Unhandled server error.                                                                      | `ApiErrorResponse`       |

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
    "totalCount": 42,
    "totalPages": 3
  }
}
```

## 5. Data Flow

```mermaid
graph TD;
Client--HTTP GET-->AstroAPI[Astro API Route];
AstroAPI--createSupabaseServerInstance-->Supabase➡️Database;
AstroAPI--FlashcardService.listByDeck-->FlashcardService;
FlashcardService--query-->Database[(flashcards, decks)];
Database--rows-->FlashcardService--DTO mapping-->AstroAPI--JSON-->Client;
```

1. **Auth Middleware** ensures the request is authenticated, attaches `locals.user.id`.
2. API route validates input, constructs filter object, and calls `flashcardService.listByDeck`.
3. Service queries Supabase using RLS (user-scoped) & pagination.
4. Rows are mapped to `FlashcardResponse` DTOs, pagination meta is computed.
5. JSON response is sent to the client.

## 6. Security Considerations

1. **Authentication:** Required – enforced by global middleware. Public paths list does _not_ include this endpoint.
2. **Authorization:**
   - RLS on `flashcards` and `decks` tables already restricts access by `user_id`.
   - Additional defensive check: Verify deck exists, belongs to user, and is not soft-deleted (`deleted_at IS NULL`).
3. **Input Validation:**
   - `deckId` must be a valid UUID (regex or Zod `uuid()`).
   - Pagination params validated against bounds.
   - `reviewDue` parsed as boolean.
   - `sort` allowed fields whitelist (`created_at`, `updated_at`, `next_review_at`).
4. **SQL Injection:** Parameterised queries via Supabase SDK.
5. **Rate Limiting:** Optional – reuse existing `rateLimiter` util.
6. **Data Exposure:** Never expose `user_id` of other users.

## 7. Error Handling

- Use `try/catch` around service call.
- Map known validation errors → **400**.
- Deck not found → **404**.
- Unexpected errors → **500**.
- Log server errors with `lib/logClientError.ts` or `utils/logger.ts` (server-side) and optionally insert record into `events` or dedicated error-logging table.

## 8. Performance Considerations

- **Indexes**: Rely on existing `flashcards_user_next_idx` (user_id, next_review_at) for `reviewDue` filter. Ensure query also filters by `deck_id` and `deleted_at IS NULL`.
- Use `range()` with pageSize+1 to detect existence of next page without COUNT(\*) when cursor-based pagination is introduced.
- Select only columns needed for `FlashcardResponse`.
- Enforce `pageSize` ≤ 100 to avoid large payloads.

## 9. Implementation Steps

1. **Define Validation Schema** (`schemas/flashcards.ts`):
   ```ts
   export const listDeckFlashcardsSchema = z.object({
     deckId: z.string().uuid(),
     page: z.coerce.number().int().min(1).default(1),
     pageSize: z.coerce.number().int().min(1).max(100).default(20),
     sort: z.string().optional().refine(isAllowedSort, { message: "Invalid sort" }),
     reviewDue: z.coerce.boolean().optional(),
   });
   ```
2. **Service Layer** (`src/lib/services/flashcardService.ts`)
   - Add `listByDeck(options)` method that accepts: `userId`, `deckId`, pagination, sort, reviewDue.
   - Build Supabase query:

     ```ts
     const query = supabase
       .from("flashcards")
       .select("*", { count: "exact" })
       .eq("deck_id", deckId)
       .eq("deleted_at", null);

     if (reviewDue) {
       query.is("next_review_at", null, { negate: true }).lte("next_review_at", new Date().toISOString());
     }

     // Sorting, pagination
     ```

3. **API Route** (`src/pages/api/decks/[deckId]/flashcards.ts`)
   - `export const GET: APIRoute = async ({ params, url, locals, cookies, request }) => { … }`.
   - Parse & validate input using schema.
   - Instantiate Supabase via `createSupabaseServerInstance`.
   - Call `flashcardService.listByDeck`.
   - Return **200** with DTO.
4. **Error Mapping Helper** in `src/lib/utils/errors.ts` if not present.
