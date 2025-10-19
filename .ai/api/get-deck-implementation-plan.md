# API Endpoint Implementation Plan: GET /decks/{deckId}

## 1. Endpoint Overview

Retrieve details of a single deck **owned by the authenticated user**, including the total number of (non-deleted) flashcards it currently contains.

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/decks/{deckId}`
- **Path Parameters:**  
  • `deckId` _(uuid, required)_ – identifier of the deck to fetch.
- **Query Parameters:** _None_
- **Request Body:** _None_
- **Authentication:** Required (Supabase JWT via middleware)

## 3. Used Types

- **Response DTO:** `DeckDetailResponse` (see `src/types.ts` lines 29-31)
  ```ts
  export interface DeckDetailResponse extends DeckResponse {
    cardCount: number;
  }
  ```
- **Error DTO:** `ApiErrorResponse` for error cases.

## 4. Response Details

| Scenario                              | Status | Payload                                   |
| ------------------------------------- | ------ | ----------------------------------------- |
| Deck found & accessible               | 200    | `DeckDetailResponse`                      |
| Invalid `deckId` format               | 400    | `ApiErrorResponse` (code: `INVALID_ID`)   |
| User unauthenticated                  | 401    | `ApiErrorResponse` (code: `UNAUTHORIZED`) |
| Deck not found / soft-deleted / alien | 404    | `ApiErrorResponse` (code: `NOT_FOUND`)    |
| Unexpected server error               | 500    | `ApiErrorResponse` (code: `SERVER_ERROR`) |

Example success body:

```jsonc
{
  "id": "73b7b7a0-0f5d-4ab5-be19-4ee1ad62d8a9",
  "name": "French A1 Vocabulary",
  "createdAt": "2025-10-18T15:42:18Z",
  "cardCount": 142,
}
```

## 5. Data Flow

1. **Middleware** (`src/middleware/index.ts`) authenticates the request and populates `locals.user`.
2. **API Route Handler** (`src/pages/api/decks/[deckId].ts`):
   1. Parse & validate `deckId` with Zod.
   2. Obtain `supabase` via `createSupabaseServerInstance` (context contains cookies & headers).
   3. Execute a _single SQL query_ using the Supabase TypeScript client:
      ```sql
      select d.id, d.name, d.created_at,
             (
               select count(*)
               from flashcards f
               where f.deck_id = d.id
                 and f.deleted_at is null
             ) as card_count
      from decks d
      where d.id = <deckId>
        and d.deleted_at is null
        and d.user_id = auth.uid(); -- enforced by RLS
      ```
   4. Map row → `DeckDetailResponse` and return 200.
   5. Handle empty result → 404.
3. **Service Extraction**: create `src/lib/services/decks.ts` with function `getDeckDetail(supabase, deckId): Promise<DeckDetailResponse | null>` to encapsulate DB logic & aid testing.

## 6. Security Considerations

1. **Authentication**: Middleware already blocks unauthenticated requests (401).
2. **Authorisation / IDOR**: RLS on `decks` table (owner policy) + `user_id` filter in query ensure the caller owns the deck.
3. **Soft-delete Protection**: `deleted_at is null` predicate prevents access to deleted decks.
4. **Input Validation**: Reject non-UUID `deckId` early (400) to mitigate injection & excessive DB work.
5. **Rate Limiting** _(optional, existing util)_: call `rateLimiter` in the route to throttle abusive traffic.
6. **Error Leakage**: Return generic 500 messages; detailed errors logged server-side via `lib/utils/logger.ts`.

## 7. Error Handling

| Error Case              | Detection                 | Response |
| ----------------------- | ------------------------- | -------- |
| Invalid UUID            | Zod refinement (`uuid()`) | 400      |
| No Supabase session     | `locals.user` undefined   | 401      |
| Deck not found (0 rows) | Service returns `null`    | 404      |
| Supabase query error    | `error` from Supabase     | 500      |
| Unknown runtime error   | try/catch                 | 500      |

Errors are logged using `logger.error()` with contextual metadata (`userId`, `path`, `deckId`).

## 8. Performance Considerations

- Single aggregated query avoids N+1 and round-trips.
- Both `decks` and `flashcards` already indexed on `user_id`, and card count sub-query is selective by `deck_id`.
- Response payload is tiny; no pagination needed.
- Cache headers: `Cache-Control: no-store` since data is user-specific and mutable.

## 9. Implementation Steps

1. **Scaffold Service** – `src/lib/services/decks.ts`

   ```ts
   import type { SupabaseClient } from "@supabase/supabase-js";
   import type { DeckDetailResponse } from "../../types";

   export async function getDeckDetail(supabase: SupabaseClient, deckId: string): Promise<DeckDetailResponse | null> {
     const { data, error } = await supabase
       .from("decks")
       .select(
         `id, name, created_at,
          cardCount:flashcards(count)
         `,
         { head: false, count: "exact" }
       )
       .eq("id", deckId)
       .is("deleted_at", null)
       .single();

     if (error) throw error;

     if (!data) return null;

     return {
       id: data.id,
       name: data.name,
       createdAt: data.created_at,
       cardCount: data.cardCount ?? 0,
     };
   }
   ```

2. **Add Zod Schema** – `src/lib/auth/schemas.ts` _(or new `decks.schemas.ts`)_:
   ```ts
   import { z } from "zod";
   export const DeckIdParamSchema = z.object({ deckId: z.string().uuid() });
   ```
3. **Create API Route** – `src/pages/api/decks/[deckId].ts`:

   ```ts
   import type { APIRoute } from "astro";
   import { createSupabaseServerInstance } from "../../../db/supabase.client";
   import { DeckIdParamSchema } from "../../../lib/auth/schemas";
   import { getDeckDetail } from "../../../lib/services/decks";
   import { logger } from "../../../lib/utils/logger";

   export const prerender = false;

   export const GET: APIRoute = async ({ params, cookies, request, locals }) => {
     // 1. Auth check
     if (!locals.user) {
       return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }), {
         status: 401,
       });
     }

     // 2. Validate params
     const parse = DeckIdParamSchema.safeParse(params);
     if (!parse.success) {
       return new Response(JSON.stringify({ error: { code: "INVALID_ID", message: "deckId must be a valid UUID" } }), {
         status: 400,
       });
     }

     const { deckId } = parse.data;

     try {
       const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });
       const deck = await getDeckDetail(supabase, deckId);

       if (!deck) {
         return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Deck not found" } }), {
           status: 404,
         });
       }

       return new Response(JSON.stringify(deck), { status: 200 });
     } catch (err) {
       logger.error("GET /decks/{deckId} failed", { err, deckId, userId: locals.user.id });
       return new Response(JSON.stringify({ error: { code: "SERVER_ERROR", message: "Unexpected error" } }), {
         status: 500,
       });
     }
   };
   ```
