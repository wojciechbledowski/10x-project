# API Endpoint Implementation Plan: DELETE /flashcards/{cardId}

## 1. Endpoint Overview

Soft-delete the specified flashcard by populating its `deleted_at` column with the current timestamp. Only the flashcard owner may perform this action. The operation is idempotent: attempting to delete an already-deleted flashcard results in HTTP 409 (Conflict). The soft delete preserves all flashcard data for potential future recovery while removing it from active use.

This operation should also create an audit event in the `events` table to track the deletion action for compliance and debugging purposes.

## 2. Request Details

- **HTTP Method:** DELETE
- **URL Pattern:** `/flashcards/{cardId}`
- **Path Parameters:**
  - `cardId` (string, UUID) – identifier of the flashcard to soft-delete.
- **Request Body:** _None_
- **Authentication:** Supabase session (middleware attaches `locals.user`).

## 3. Used Types

- `FlashcardResponse` – success payload (src/types.ts).
- `ApiErrorResponse` – error payload (src/types.ts).
- `EventResponse` – for audit trail (src/types.ts).

## 4. Response Details

| Status | Description                           | Payload             |
| ------ | ------------------------------------- | ------------------- |
| 200    | Flashcard soft-deleted successfully   | `FlashcardResponse` |
| 400    | Invalid `cardId` format               | `ApiErrorResponse`  |
| 401    | No valid session                      | `ApiErrorResponse`  |
| 404    | Flashcard not found or not accessible | `ApiErrorResponse`  |
| 409    | Flashcard already soft-deleted        | `ApiErrorResponse`  |
| 500    | Unhandled server error                | `ApiErrorResponse`  |

## 5. Data Flow

1. **Middleware** verifies Supabase session and sets `locals.user`.
2. **Zod validation** ensures `cardId` is a valid UUID.
3. **FlashcardService.softDeleteFlashcard(userId, cardId)**
   1. Calls Supabase UPDATE query:
      ```sql
      UPDATE flashcards
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING id, front, back, deck_id, source, ease_factor,
                interval_days, repetition, next_review_at,
                created_at, updated_at, user_id, deleted_at
      ```
   2. If no row updated, check if flashcard exists but is already deleted
   3. Create audit event in `events` table: `{ action: 'delete', flashcardId, source }`
   4. Returns updated row if affected, else `null` or throws for already deleted.
4. Handler maps row → `FlashcardResponse` and returns 200.
5. If no row updated → 404 (not found) or 409 (already deleted) as applicable.
6. Unexpected errors logged via `logger.error` and produce 500.

## 6. Security Considerations

- **AuthN:** Supabase JWT via middleware.
- **AuthZ:**
  - Row-level: RLS on `flashcards` (owner policy) blocks cross-user access.
  - Query additionally filters `user_id` to fail fast.
- **CSRF:** Cookies are `SameSite=Lax`; DELETE is XHR only.
- **Input Sanitisation:** UUID validated, Supabase query builder prevents SQL injection.
- **Rate Limiting:** Optional – use `rateLimiter` helper to throttle destructive actions.
- **Audit Trail:** All deletions logged in `events` table for compliance.

## 7. Error Handling

| Scenario                    | Status | Code              | Message                          |
| --------------------------- | ------ | ----------------- | -------------------------------- |
| Invalid UUID                | 400    | `INVALID_ID`      | "cardId must be a valid UUID"    |
| Unauthenticated request     | 401    | `UNAUTHORIZED`    | "Authentication required"        |
| Flashcard not found         | 404    | `NOT_FOUND`       | "Flashcard not found"            |
| Flashcard already deleted   | 409    | `ALREADY_DELETED` | "Flashcard already soft-deleted" |
| Supabase error / DB failure | 500    | `SERVER_ERROR`    | "Internal server error"          |

Errors adopt the `ApiErrorResponse` shape with structured details for validation errors.

## 8. Performance Considerations

- Update query uses primary key index → O(1).
- Selecting limited columns avoids over-fetching.
- Single transaction for flashcard update + audit event.
- No N+1 or large payloads.
- Audit event creation is lightweight (INSERT with few columns).

## 9. Implementation Steps

1. **Create route file** `src/pages/api/flashcards/[cardId].ts` with `export const DELETE: APIRoute`.
2. **Import helpers**: `z`, `createSupabaseServerInstance`, `logger`, DTO mappers.
3. **Validate path param** using `z.string().uuid()`.
4. **Retrieve authenticated user** from `Astro.locals.user`; if absent return 401.
5. **Invoke** `FlashcardService.softDeleteFlashcard(userId, cardId)`.
6. **Handle service result**:
   - `null` → 404.
   - Row with `deleted_at` previously set → 409.
   - Row updated → map to `FlashcardResponse`, return 200.
7. **Wrap route logic** in `try/catch`; on error log via `logger.error` and return 500.
8. **Extend FlashcardService** with `softDeleteFlashcard` method.
9. **Create or extend EventService** for audit trail logging.
10. **Add unit tests** covering validation, service logic, and API responses.
11. **Add integration tests** for end-to-end flow with database.
12. **Update API documentation** with the new endpoint.
