# API Endpoint Implementation Plan: PATCH /decks/{deckId}

## 1. Endpoint Overview

Updates an existing deck that belongs to the authenticated user. The endpoint supports two operations:

1. Rename the deck (`name` field).
2. Soft-delete or restore the deck by toggling the `deletedAt` timestamp.

## 2. Request Details

- **HTTP Method:** PATCH
- **URL Pattern:** `/decks/{deckId}`
- **Path Parameters:**
  - `deckId` (uuid, required) – Identifier of the deck to update.
- **Request Body (JSON):** (`UpdateDeckRequest`)
  - `name` (string, optional) – New deck name, 1-255 characters.
  - `deletedAt` (string \| null, optional) – ISO-8601 timestamp to soft-delete, or `null` to restore.
  - At least one of the two fields must be present.

## 3. Used Types

- **Input DTO:** `UpdateDeckRequest` (src/types.ts).
- **Output DTO:** `DeckResponse` (src/types.ts).
- **Error DTO:** `ApiErrorResponse`.

## 4. Response Details

| Status | When                                     | Body               |
| ------ | ---------------------------------------- | ------------------ |
| 200 OK | Deck updated successfully                | `DeckResponse`     |
| 400    | Invalid payload / missing required field | `ApiErrorResponse` |
| 401    | User not authenticated                   | _Empty_            |
| 404    | Deck not found or not owned by user      | `ApiErrorResponse` |
| 500    | Unhandled server error                   | `ApiErrorResponse` |

## 5. Data Flow

1. **Astro API Route** `src/pages/api/decks/[deckId].ts` handles the PATCH method.
2. Parse `deckId` from URL and validate request body with Zod schema.
3. Obtain `supabase` via `createSupabaseServerInstance({ cookies, headers })`.
4. Retrieve current user (`Astro.locals.user`). If missing → 401.
5. Delegate to **DeckService.updateDeck**:
   1. Fetch deck by `id` & `user_id`.
   2. If not found → 404.
   3. Build partial update object and execute `update … select('*').single()`.
6. Map DB row → `DeckResponse`.
7. Return 200 with JSON.
8. Catch unexpected errors → log via `logClientError`, return 500.

## 6. Security Considerations

- **Authentication:** enforced by middleware; fallback check in route.
- **Authorization:** owner filter (`user_id`) and Supabase RLS.
- **Validation:** Zod schema ensures field constraints; prevents mass-assignment.
- **Rate Limiting:** optional `rateLimiter` utility to mitigate abuse.
- **Error Messages:** generic for 404 to avoid leaking existence of other users’ decks.

## 7. Error Handling

| Scenario                   | Status | Code           | Message                        |
| -------------------------- | ------ | -------------- | ------------------------------ |
| Invalid JSON body          | 400    | BAD_REQUEST    | "Invalid request body"         |
| Neither field provided     | 400    | VALIDATION_ERR | "No updatable fields provided" |
| Name >255 chars / empty    | 400    | VALIDATION_ERR | Field-specific detail          |
| Deck not found / not owned | 404    | NOT_FOUND      | "Deck not found"               |
| Supabase failure           | 500    | DATABASE_ERROR | "Unexpected server error"      |
| Uncaught exception         | 500    | INTERNAL_ERROR | "Internal server error"        |

All 500 errors are logged with `logClientError` (path, message, stack, userAgent, userId).

## 8. Performance Considerations

- Single indexed update query.
- Tiny payloads → minimal network latency.
- Consider edge cache purge of `/decks` listing on update.

## 9. Implementation Steps

1. **Add Zod Schema** `src/lib/validators/decks.ts`.
2. **Create DeckService** `src/lib/services/decks.service.ts` with `updateDeck`.
3. **API Route** `src/pages/api/decks/[deckId].ts`:
   - Export `PATCH` handler.
   - Validate user & body, call service, return response.
4. **Update Barrel Exports** in `src/lib/services/index.ts`.
