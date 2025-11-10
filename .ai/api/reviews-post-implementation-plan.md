# API Endpoint Implementation Plan: POST /reviews

## 1. Endpoint Overview

This endpoint allows users to submit review quality scores and optional latency measurements for flashcards during spaced repetition learning sessions. The endpoint implements the SM-2 algorithm to update flashcard scheduling parameters (ease factor, interval, repetition count, and next review date) based on the quality score provided.

**Purpose**: Process user review feedback to optimize future flashcard scheduling and track review performance metrics.

**Key Requirements**:

- Authentication required (user can only review their own flashcards)
- Validates flashcard exists and belongs to authenticated user
- Implements SM-2 algorithm for scheduling updates
- Records review in database with quality and latency data
- Returns updated flashcard scheduling information
- Atomic transaction ensures review and scheduling update consistency

## 2. Request Details

- **HTTP Method**: POST
- **URL Structure**: `/reviews`
- **Parameters**:
  - **Required**: None (authentication via JWT token in Authorization header)
  - **Optional**: None
- **Request Body**: JSON payload with review data
- **Authentication**: Bearer token required in `Authorization` header
- **Content-Type**: `application/json`

**Request Body Schema**:

```json
{
  "flashcardId": "uuid",
  "quality": 4,
  "latencyMs": 3500
}
```

## 3. Used Types

The endpoint uses the following DTO types from `src/types.ts`:

```typescript
// Command Model for review submission
export interface CreateReviewRequest {
  flashcardId: string; // Required: UUID of flashcard being reviewed
  quality: number; // Required: 0-5 (SM-2 quality score)
  latencyMs?: number; // Optional: Client response time in milliseconds
}

// Response DTO with updated scheduling
export interface ReviewResponse {
  id: string; // Review record ID
  flashcardId: string;
  quality: number;
  createdAt: string;
  // Updated flashcard scheduling info
  flashcard: {
    id: string;
    easeFactor: number;
    intervalDays: number;
    repetition: number;
    nextReviewAt: string | null;
  };
}
```

## 4. Response Details

**Success Response (201 Created)**:

```json
{
  "id": "review-uuid",
  "flashcardId": "flashcard-uuid",
  "quality": 4,
  "createdAt": "2025-11-10T12:00:00Z",
  "flashcard": {
    "id": "flashcard-uuid",
    "easeFactor": 2.6,
    "intervalDays": 6,
    "repetition": 3,
    "nextReviewAt": "2025-11-16T12:00:00Z"
  }
}
```

**Status Codes**:

- **201**: Created - review submitted successfully with updated scheduling
- **400**: Bad Request - invalid input (quality out of range, invalid flashcardId)
- **401**: Unauthorized - missing or invalid JWT token
- **404**: Not Found - flashcard not found or doesn't belong to user
- **500**: Internal Server Error - database or server issues

## 5. Data Flow

1. **Authentication Check**: Extract user ID from JWT token in `Authorization` header
2. **Input Validation**: Validate request body against CreateReviewRequest schema
3. **Flashcard Verification**: Ensure flashcard exists, belongs to user, and is not soft-deleted
4. **SM-2 Algorithm**: Calculate new scheduling parameters based on quality score
5. **Transaction Begin**: Start database transaction for atomicity
6. **Insert Review**: Create review record in `reviews` table
7. **Update Flashcard**: Update flashcard scheduling fields (easeFactor, intervalDays, repetition, nextReviewAt)
8. **Transaction Commit**: Commit both operations atomically
9. **Response Formatting**: Return ReviewResponse with review and updated flashcard data

## 6. Security Considerations

**Authentication & Authorization**:

- JWT token validation required (handled by Supabase auth)
- Row-level security ensures users can only review their own flashcards
- Additional business logic validation prevents reviewing others' cards

**Input Validation**:

- Request body validated against Zod schema
- Quality score constrained to 0-5 range (SM-2 algorithm requirement)
- Flashcard ID validated as UUID format and existence check
- Latency measurement optional but must be positive integer if provided

**Potential Threats**:

- **Unauthorized Access**: Mitigated by JWT validation and RLS policies
- **Data Tampering**: Server-side SM-2 calculation prevents client manipulation
- **Race Conditions**: Database transaction ensures atomic review + scheduling updates
- **DoS via Invalid Requests**: Input validation prevents malformed data processing

**Security Headers**: Standard Astro security headers applied automatically.

## 7. Error Handling

**Client Errors**:

- **400 Bad Request**: Invalid input parameters

  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid request parameters",
      "details": [
        {
          "field": "quality",
          "message": "Quality must be between 0 and 5"
        }
      ]
    }
  }
  ```

- **401 Unauthorized**: Missing/invalid JWT token

  ```json
  {
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Authentication required"
    }
  }
  ```

- **404 Not Found**: Flashcard not found or doesn't belong to user
  ```json
  {
    "error": {
      "code": "FLASHCARD_NOT_FOUND",
      "message": "Flashcard not found or access denied"
    }
  }
  ```

**Server Errors**:

- **500 Internal Server Error**: Database connection issues, transaction failures
  ```json
  {
    "error": {
      "code": "INTERNAL_ERROR",
      "message": "An unexpected error occurred"
    }
  }
  ```

**Error Logging**:

- All errors logged with structured format including user ID and request details
- Database errors include transaction rollback information
- SM-2 algorithm errors logged for debugging scheduling issues
- No audit logging to events table (standard review operation)

## 8. Performance Considerations

**Database Query Optimization**:

- Uses indexed columns for flashcard lookup (user_id, id, deleted_at)
- Reviews table partitioned monthly for efficient storage/access
- Transaction ensures atomicity without long-running locks

**SM-2 Algorithm Efficiency**:

- Pure mathematical calculation (no external dependencies)
- Algorithm runs in constant time regardless of card history
- Quality score validation prevents invalid algorithm inputs

**Potential Bottlenecks**:

- High-frequency review submissions during study sessions
- Database connection pooling handled by Supabase client
- Transaction rollback on failure (rare but handled gracefully)

**Monitoring**:

- Response time monitoring via standard Astro metrics
- Error rate tracking for validation vs server errors
- Review submission rate monitoring for abuse detection

## 9. Implementation Steps

### Step 1: Create Zod Validation Schema

Create `src/lib/reviews/schemas.ts` (extend existing file):

- Add `createReviewRequestSchema` for POST /reviews validation
- Validate flashcardId as UUID, quality as 0-5 integer, latencyMs as optional positive integer
- Export inferred types for TypeScript usage

### Step 2: Extend ReviewService with SM-2 Algorithm

Extend `src/lib/services/reviewService.ts`:

- Add `submitReview(userId: string, request: CreateReviewRequest)` method
- Implement SM-2 algorithm for scheduling calculations
- Add flashcard verification logic
- Use database transaction for atomic review + scheduling updates
- Return ReviewResponse with updated flashcard data

### Step 3: Create API Endpoint

Create `src/pages/api/reviews/index.ts`:

- Export `prerender = false` for dynamic endpoint
- Use POST handler function with uppercase POST
- Extract user ID from Astro context authentication
- Parse and validate JSON request body against schema
- Instantiate ReviewService with supabase client
- Call submitReview method within try-catch
- Return 201 with ReviewResponse or appropriate error status

### Step 4: Add Comprehensive Unit Tests

Create `src/lib/services/__tests__/reviewService-submitReview.test.ts`:

- Test SM-2 algorithm calculations with various quality scores
- Test input validation (invalid quality, non-existent flashcard)
- Test transaction rollback on database errors
- Test authorization (user can only review own cards)
- Mock Supabase client for isolation

### Step 5: Integration Testing

- Test complete request flow with valid authentication
- Test error scenarios (invalid input, missing flashcard, auth failures)
- Verify database state changes (review inserted, flashcard updated)
- Test SM-2 algorithm produces expected scheduling intervals
- Load testing with multiple concurrent review submissions

### Step 6: Documentation Updates

- Update API documentation with POST /reviews endpoint details
- Document SM-2 algorithm implementation for future maintainers
- Add new error codes to centralized error handling documentation
- Include example requests/responses in API reference

## 10. Dependencies

**New Dependencies**: None required

**Existing Dependencies**:

- `src/types.ts` (for CreateReviewRequest, ReviewResponse)
- `src/db/supabase.client.ts` (for SupabaseServerClient type)
- `src/lib/utils/apiResponse.ts` (for standardized response formatting)
- `src/lib/utils/logger.ts` (for structured error logging)
- Supabase client from `context.locals`

## 11. Rollback Plan

**Database Changes**: None (existing tables used, no schema modifications)

**Code Changes**:

- Remove extended methods from `src/lib/services/reviewService.ts`
- Remove `src/pages/api/reviews/index.ts`
- Remove corresponding test files and schema extensions
- Restore original service and schema files

**Risk Assessment**: Medium risk - involves SM-2 algorithm implementation and database transactions. Thorough testing required before deployment. Rollback straightforward as no schema changes made.

## 12. SM-2 Algorithm Implementation Details

The SM-2 algorithm calculates new scheduling parameters based on quality score:

- **Quality 0-2**: Failed recall - reset to 1-day interval, decrease ease factor
- **Quality 3**: Hard recall - minimal interval increase, slight ease factor decrease
- **Quality 4**: Good recall - standard interval increase based on ease factor
- **Quality 5**: Perfect recall - maximum interval increase, slight ease factor increase

**Mathematical Formulas**:

- `newEaseFactor = max(1.3, oldEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))`
- `newInterval = quality < 3 ? 1 : quality === 3 ? ceil(oldInterval * 1.2) : ceil(oldInterval * newEaseFactor)`
- `newRepetition = quality < 3 ? 0 : oldRepetition + 1`

Algorithm ensures spaced repetition effectiveness while adapting to user performance.
