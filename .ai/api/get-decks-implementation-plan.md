# API Endpoint Implementation Plan: List Decks (GET /decks)

## 1. Endpoint Overview

Returns a paginated list of the authenticated user’s decks. Soft-deleted decks (deleted_at IS NOT NULL) are excluded. Supports basic pagination and optional sorting.

## 2. Request Details

- HTTP Method: GET
- URL: /decks
- Query Parameters (all optional, default values shown)
  - `page` (number, default **1**, min 1) – page index (1-based)
  - `pageSize` (number, default **20**, min 1, max 100) – items per page
  - `cursor` (string) – opaque cursor for future cursor-based pagination (ignored for now)
  - `sort` (string, default **created_at**) – field to sort by; prefix with `-` for DESC (allowed: `name`, `created_at`)
- Authentication: Required (middleware populates `Astro.locals.user`)
- Request Body: none

## 3. Used Types

- `PaginationParams`, `SortParams`, `ListQueryParams` – query DTOs
- `DeckResponse` – single deck DTO
- `DecksListResponse` – response wrapper
- `ApiErrorResponse` – error wrapper

## 4. Response Details

| Status | Description                         | Body                                 |
| ------ | ----------------------------------- | ------------------------------------ |
| 200    | Success; list returned              | `DecksListResponse`                  |
| 400    | Invalid query parameters            | `ApiErrorResponse`                   |
| 401    | Missing / invalid auth              | `ApiErrorResponse`                   |
| 429    | Rate-limited (shared util)          | `ApiErrorResponse`                   |
| 500    | Unhandled server error / DB failure | `ApiErrorResponse` + error log entry |

`DecksListResponse` shape:

```
{
  data: DeckResponse[],
  pagination: {
    page: number,
    pageSize: number,
    totalCount: number,
    totalPages: number
  }
}
```

## 5. Data Flow

1. Middleware authenticates request, attaches `locals.user`.
2. `GET /decks` handler:
   a. Validate and parse query params with Zod.
   b. Build Supabase query:
   ```sql
   SELECT id, name, created_at
   FROM decks
   WHERE user_id = <userId>
     AND deleted_at IS NULL
   ORDER BY <sort> [ASC|DESC]
   LIMIT pageSize OFFSET (page-1)*pageSize;
   ```
   c. Execute query via `supabase` instantiated from `createSupabaseServerInstance` (context cookies+headers).
   d. Execute `SELECT COUNT(*)` with same filters for `totalCount`.
   e. Map DB rows to `DeckResponse`.
   f. Assemble `DecksListResponse` and return 200.
3. Errors funnel to shared `handleApiError` util which logs to `events` table via `logClientError` when status ≥ 500.

## 6. Security Considerations

- **Authentication**: Only authenticated users; enforced by middleware.
- **Authorization**: Query filtered by `user_id` so users see only their decks.
- **RLS**: Supabase RLS additionally enforces same rule.
- **DoS / Abuse**: Enforce `pageSize` ≤ 100; global rate-limiter middleware.
- **SQL Injection**: Using Supabase query builder prevents injection; validate `sort` against whitelist.

## 7. Error Handling

| Scenario                            | Status | Message code      |
| ----------------------------------- | ------ | ----------------- |
| Missing auth                        | 401    | "AUTH_REQUIRED"   |
| Invalid query (e.g., negative page) | 400    | "INVALID_QUERY"   |
| Sort param not allowed              | 400    | "INVALID_SORT"    |
| Supabase error                      | 500    | "DB_ERROR"        |
| Unexpected exception                | 500    | "INTERNAL_SERVER" |

### Logging

- Use `logClientError` util for server errors, including stack & user id.
- Log message stored in `events` table with action `ERROR` (extend enum if needed).

## 8. Performance Considerations

- Index on `(user_id, created_at)` already exists; covers default sort.
- For `name` sorting, consider additional index `(user_id, lower(name))` if query planner shows scans.
- Pagination with `LIMIT/OFFSET` is adequate for ≤10k rows; switch to cursor when needed.
- Batch requests capped by rate-limiter.

## 9. Implementation Steps

1. **Types**: Ensure `DecksListResponse` is exported (already present).
2. **Validation Schema** (`src/lib/validation/decks.ts`):
   ```ts
   export const listDecksQuerySchema = z.object({
     page: z.coerce.number().int().min(1).default(1),
     pageSize: z.coerce.number().int().min(1).max(100).default(20),
     sort: z
       .string()
       .optional()
       .transform((v) => v ?? "created_at")
       .refine((v) => /^(?:-)?(?:name|created_at)$/.test(v), {
         message: "Invalid sort field",
       }),
   });
   ```
3. **Service Layer** (`src/lib/services/decks.service.ts`):
   - Function `listDecks(userId, { page, pageSize, sort })` returning `DecksListResponse`.
   - Encapsulate DB queries and mapping logic.
4. **API Route** (`src/pages/api/decks/index.ts`):

   ```ts
   import { listDecksQuerySchema } from "../../../lib/validation/decks";
   import { listDecks } from "../../../lib/services/decks.service";

   export const GET: APIRoute = async ({ url, locals, headers, cookies }) => {
     const user = locals.user;
     if (!user) return unauthorized();

     const parse = listDecksQuerySchema.safeParse(Object.fromEntries(url.searchParams));
     if (!parse.success) return badRequest(parse.error);

     const response = await listDecks(user.id, parse.data);
     return json(response, 200);
   };
   ```

5. **Utilities**: Re-use existing `json()`, `badRequest()` helpers or create them.
