# API Endpoint Implementation Plan: Create Deck (POST /decks)

## 1. Endpoint Overview

Creates a new flashcard deck for the authenticated user.

- **Purpose**: Allow users to organize flashcards into named collections (decks).
- **Scope**: Server-side Astro API route at `/src/pages/api/decks/index.ts`.
- **Result**: A `DeckResponse` object with HTTP 201 and a `Location` header pointing to `/decks/{id}`.

## 2. Request Details

- **HTTP Method**: POST
- **URL**: `/decks`
- **Authentication**: Supabase session (required). Middleware already attaches `locals.user`.
- **Headers**:
  - `Content-Type: application/json`
- **Body (JSON)** – uses `CreateDeckRequest`:
  | Field | Type | Constraints | Required |
  |-------|------|-------------|----------|
  | `name` | string | 1-255 UTF-8 chars, trimmed | ✅ |

### Validation Rules

1. `name` must be non-empty after trimming and ≤ 255 chars.
2. Reject additional properties (strict schema).

If validation fails → **400 Bad Request** with `ApiErrorResponse` body.

## 3. Used Types

- `CreateDeckRequest` – request payload
- `DeckResponse` – success payload
- `ApiErrorResponse` – error payload

## 4. Response Details

| Status                        | When                                                | Body               |
| ----------------------------- | --------------------------------------------------- | ------------------ |
| **201 Created**               | Deck successfully created                           | `DeckResponse`     |
| **400 Bad Request**           | Validation fails                                    | `ApiErrorResponse` |
| **401 Unauthorized**          | No/invalid session                                  | `ApiErrorResponse` |
| **409 Conflict**              | Name already exists for user (optional enhancement) | `ApiErrorResponse` |
| **500 Internal Server Error** | Unhandled server/db error                           | `ApiErrorResponse` |

Response example (201):

```json
{
  "id": "7badea7f-7c19-4a3b-9fd1-97f4c957d939",
  "name": "Spanish A1",
  "createdAt": "2025-10-19T14:27:51.000Z"
}
```

## 5. Data Flow

1. **Middleware** ensures authenticated session (`locals.user`).
2. **API Handler** receives JSON, validates with Zod.
3. Calls **DeckService.createDeck(userId, name)**:
   1. Inserts row into `decks` table via Supabase `from('decks').insert(...)`.
   2. Returns typed record.
4. Handler maps DB row → `DeckResponse`.
5. Sends `201` with JSON and `Location` header.
6. Errors propagate through `try/catch`, logged via `lib/utils/logger.ts`.

## 6. Security Considerations

- **Auth**: Require session; respond 401 if missing.
- **RLS**: `decks` table has owner policy; insert automatically scoped by `auth.uid()`.
- **Input Sanitization**: Zod validation trims & length-checks.
- **Rate Limiting**: Optionally apply `lib/utils/rateLimiter.ts` to POSTs (< 10/min).
- **CSRF**: Not applicable to same-origin XHR/fetch with credentials, but consider `SameSite=Lax` cookies.

## 7. Error Handling

| Scenario                    | Status | Message          |
| --------------------------- | ------ | ---------------- |
| Missing/invalid JSON        | 400    | `invalid_body`   |
| Name empty/too long         | 400    | `invalid_name`   |
| Duplicate name (unique idx) | 409    | `duplicate_name` |
| Unauthenticated user        | 401    | `unauthorized`   |
| Supabase error              | 500    | `internal_error` |

Use `throw`-helpers in `lib/utils/errors.ts` for consistent formatting.

## 8. Performance Considerations

- Single row insert → negligible latency.
- Ensure Supabase insert request selects only needed columns.
- Add **UNIQUE(user_id, LOWER(name))** index if duplicate prevention required.

## 9. Implementation Steps

1. **Schema**
   - Add `CreateDeckSchema` in `src/lib/validation/decks.ts` using Zod.
2. **Service Layer**
   - Create `src/lib/services/decks.ts` with `createDeck(userId: string, name: string)`.
3. **API Route**
   - File: `src/pages/api/decks/index.ts`.
   - Export `POST` handler conforming to guidelines (`prerender = false`).
4. **Integration**
   - Use `createSupabaseServerInstance` with `cookies`, `headers`.
   - `const userId = locals.user.id;` Guard-clause for 401.
   - Validate body via `CreateDeckSchema`.
   - Call service; map to `DeckResponse`.
   - Return `201` + `Location` header.
