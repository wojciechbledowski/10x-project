# API Endpoint Implementation Plan: GET /reviews/queue

## 1. Endpoint Overview

This endpoint retrieves all flashcards that are due for review today for the authenticated user. Due flashcards are those where `next_review_at` is not null and is less than or equal to the current timestamp. The results are ordered by `next_review_at` (earliest due first) to present cards in the optimal review sequence.

**Purpose**: Provide a review queue for spaced repetition learning, allowing users to efficiently study cards that are scheduled for review.

**Key Requirements**:

- Authentication required (user can only access their own flashcards)
- Returns all due cards (not paginated, as it's a "queue")
- Ordered by review due time (earliest first)
- Excludes soft-deleted flashcards

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/reviews/queue`
- **Parameters**:
  - **Required**: None (authentication via JWT token in Authorization header)
  - **Optional**: None
- **Request Body**: None
- **Authentication**: Bearer token required in `Authorization` header
- **Content-Type**: N/A

## 3. Used Types

The endpoint uses the following DTO types from `src/types.ts`:

```typescript
// Response DTO
export interface ReviewQueueResponse {
  data: FlashcardResponse[];
  totalDue: number;
}

// Flashcard data structure
export interface FlashcardResponse {
  id: string;
  front: string;
  back: string;
  deckId: string | null;
  source: FlashcardSource;
  easeFactor: number;
  intervalDays: number;
  repetition: number;
  nextReviewAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  deletedAt: string | null;
}

// Flashcard source enum
export type FlashcardSource = "manual" | "ai" | "ai_edited";
```

## 4. Response Details

**Success Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "uuid",
      "front": "What is the capital of France?",
      "back": "Paris",
      "deckId": "uuid",
      "source": "manual",
      "easeFactor": 2.5,
      "intervalDays": 1,
      "repetition": 2,
      "nextReviewAt": "2025-11-10T08:00:00Z",
      "createdAt": "2025-11-09T10:00:00Z",
      "updatedAt": "2025-11-09T10:00:00Z",
      "userId": "uuid",
      "deletedAt": null
    }
  ],
  "totalDue": 1
}
```

**Status Codes**:

- **200**: Success - returns due flashcards
- **401**: Unauthorized - missing or invalid JWT token
- **500**: Internal Server Error - database or server issues

## 5. Data Flow

1. **Authentication Check**: Extract user ID from JWT token in `Authorization` header
2. **Database Query**: Query `flashcards` table for user's cards where:
   - `user_id` matches authenticated user
   - `deleted_at` is null
   - `next_review_at` is not null
   - `next_review_at` <= current timestamp
3. **Ordering**: Sort results by `next_review_at` ascending (earliest due first)
4. **Response Formatting**: Map database rows to `FlashcardResponse` format
5. **Return**: Send `ReviewQueueResponse` with data array and total count

## 6. Security Considerations

**Authentication & Authorization**:

- JWT token validation required (handled by Supabase auth)
- Row-level security ensures users can only access their own flashcards
- No additional authorization checks needed (read-only operation)

**Input Validation**:

- No user input to validate (GET request with no parameters)
- Authentication context provides user ID

**Potential Threats**:

- **Unauthorized Access**: Mitigated by JWT validation and RLS policies
- **Data Leakage**: RLS policies prevent users from seeing others' flashcards
- **DoS via Large Result Sets**: Limited by reasonable card counts per user (acceptable risk)

**Security Headers**: Standard Astro security headers applied automatically.

## 7. Error Handling

**Client Errors**:

- **401 Unauthorized**: Missing/invalid JWT token
  ```json
  {
    "error": {
      "code": "AUTH_REQUIRED",
      "message": "Authentication required"
    }
  }
  ```

**Server Errors**:

- **500 Internal Server Error**: Database connection issues, query failures
  ```json
  {
    "error": {
      "code": "INTERNAL_ERROR",
      "message": "An unexpected error occurred"
    }
  }
  ```

**Error Logging**:

- Server-side errors logged to console with structured format
- Client-side errors (if any) would be logged via separate error logging endpoint
- No audit logging required for this read-only endpoint

## 8. Performance Considerations

**Database Query Optimization**:

- Uses indexed columns: `user_id`, `deleted_at`, `next_review_at`
- Query should be efficient with proper indexing
- Result set size limited by user's total flashcards (typically < 1000)

**Caching Strategy**:

- No caching implemented (real-time accuracy required for review scheduling)
- Client-side caching acceptable but not server-enforced

**Potential Bottlenecks**:

- Large numbers of due cards (mitigated by spaced repetition scheduling)
- Database connection pooling handled by Supabase client

**Monitoring**:

- Response time monitoring via standard Astro metrics
- Error rate tracking for database issues

## 9. Implementation Steps

### Step 1: Create ReviewService

Create `src/lib/services/reviewService.ts`:

- Import SupabaseServerClient and required types
- Create ReviewService class with constructor accepting Supabase client
- Implement `getReviewQueue(userId: string)` method
- Use existing FlashcardService logic or implement query directly
- Handle database errors with proper error propagation

### Step 2: Create API Endpoint

Create `src/pages/api/reviews/queue.ts`:

- Export `prerender = false` for dynamic endpoint
- Use GET handler function
- Extract user ID from Astro context (Supabase auth)
- Instantiate ReviewService with supabase client from context.locals
- Call getReviewQueue method
- Return ReviewQueueResponse or handle errors
- Follow Astro API patterns (uppercase GET, proper error responses)

### Step 3: Add Unit Tests

Create `src/lib/services/__tests__/reviewService.test.ts`:

- Test getReviewQueue with mock data
- Test error scenarios (database errors)
- Follow existing test patterns from FlashcardService tests
- Mock Supabase client for isolation

### Step 4: Integration Testing

- Test endpoint with valid authentication
- Test endpoint with invalid/missing authentication
- Verify database queries work correctly
- Test with various review scheduling scenarios
- Load testing with reasonable card counts

### Step 5: Documentation Updates

- Update API documentation if needed
- Ensure endpoint follows established patterns
- Add any new error codes to error handling documentation

## 10. Dependencies

**New Dependencies**: None required

**Existing Dependencies**:

- `src/lib/services/flashcardService.ts` (optional, for shared logic)
- `src/types.ts` (for ReviewQueueResponse, FlashcardResponse)
- `src/db/supabase.client.ts` (for SupabaseServerClient type)
- Supabase client from `context.locals`

## 11. Rollback Plan

**Database Changes**: None (read-only endpoint)

**Code Changes**:

- Remove `src/lib/services/reviewService.ts`
- Remove `src/pages/api/reviews/queue.ts`
- Remove corresponding test files

**Risk Assessment**: Low risk - read-only endpoint, no database schema changes, can be safely removed if issues arise.
