# API Endpoint Implementation Plan: DELETE /decks/{deckId}

## 1. Endpoint Overview

Soft-delete the specified deck by populating its `deleted_at` column with the current timestamp. Only the deck owner may perform this action. The operation is idempotent: attempting to delete an already-deleted deck results in HTTP 409 (Conflict).

## 2. Request Details

- **HTTP Method:** DELETE
- **URL Pattern:** `/decks/{deckId}`
- **Path Parameters:**
  - `deckId` (string, UUID) – identifier of the deck to soft-delete.
- **Request Body:** _None_
- **Authentication:** Supabase session (middleware attaches `locals.user`).

## 3. Used Types

- `DeckResponse` – success payload (src/types.ts).
- `ApiErrorResponse` – error payload (src/types.ts).

## 4. Response Details

| Status | Description                      | Payload            |
| ------ | -------------------------------- | ------------------ |
| 200    | Deck soft-deleted successfully   | `DeckResponse`     |
| 400    | Invalid `deckId` format          | `ApiErrorResponse` |
| 401    | No valid session                 | `ApiErrorResponse` |
| 404    | Deck not found or not accessible | `ApiErrorResponse` |
| 409    | Deck already soft-deleted        | `ApiErrorResponse` |
| 500    | Unhandled server error           | `ApiErrorResponse` |

## 5. Data Flow

1. **Middleware** verifies Supabase session and sets `locals.user`.
2. **Zod validation** ensures `deckId` is a valid UUID.
3. **DeckService.softDeleteDeck(userId, deckId)**
   1. Calls Supabase RPC:
      ```ts
      supabase
        .from("decks")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", deckId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .select("id, name, created_at, deleted_at")
        .single();
      ```
   2. Returns updated row if affected, else `null`.
4. Handler maps row → `DeckResponse` and returns 200.
5. If no row updated ⇒ 404 (not found) or 409 (already deleted) as applicable.
6. Unexpected errors logged via `logger.error` and produce 500.

## 6. Security Considerations

- **AuthN:** Supabase JWT via middleware.
- **AuthZ:**
  - Row-level: RLS on `decks` (owner policy) blocks cross-user access.
  - Query additionally filters `user_id` to fail fast.
- **CSRF:** Cookies are `SameSite=Lax`; DELETE is XHR only.
- **Input Sanitisation:** UUID validated, Supabase query builder prevents SQL injection.
- **Rate Limiting:** Optional – use `rateLimiter` helper to throttle destructive actions.

## 7. Error Handling

| Scenario                    | Status | Code              | Message                       |
| --------------------------- | ------ | ----------------- | ----------------------------- |
| Invalid UUID                | 400    | `INVALID_ID`      | "deckId must be a valid UUID" |
| Unauthenticated request     | 401    | `UNAUTHORIZED`    | "Authentication required"     |
| Deck not found              | 404    | `NOT_FOUND`       | "Deck not found"              |
| Deck already deleted        | 409    | `ALREADY_DELETED` | "Deck already soft-deleted"   |
| Supabase error / DB failure | 500    | `SERVER_ERROR`    | "Internal server error"       |

Errors adopt the `ApiErrorResponse` shape.

## 8. Performance Considerations

- Update query uses primary key index → O(1).
- Selecting limited columns avoids over-fetching.
- No N+1 or large payloads.

## 9. Implementation Steps

1. **Create route file** `src/pages/api/decks/[deckId].ts` with `export const DELETE: APIRoute`.
2. **Import helpers**: `z`, `createSupabaseServerInstance`, `logger`, DTO mappers.
3. **Validate path param** using `z.string().uuid()`.
4. **Retrieve authenticated user** from `Astro.locals.user`; if absent return 401.
5. **Invoke** `DeckService.softDeleteDeck(userId, deckId)`.
6. **Handle service result**:
   - `null` → 404.
   - Row with `deleted_at` previously set → 409.
   - Row updated → map to `DeckResponse`, return 200.
7. **Wrap route logic** in `try/catch`; on error log via `logger.error` and return 500.
