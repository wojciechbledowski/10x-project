# API Endpoint Implementation Plan: GET /generation-batches/{batchId}

## 1. Endpoint Overview

This endpoint allows authenticated users to poll the status of an AI flashcard generation batch and retrieve all associated generation jobs. It's used by the frontend to track the progress of asynchronous AI generation requests submitted via `POST /flashcards/generate`. The endpoint returns comprehensive batch information including computed status, completion counts, and all individual generation jobs with their current states.

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/generation-batches/{batchId}`
- **Parameters**:
  - **Required**:
    - `batchId` (path parameter): UUID string identifying the generation batch
- **Request Body**: None (GET endpoint)
- **Authentication**: Required - Bearer token in Authorization header
- **Content-Type**: Not applicable

## 3. Used Types

### Request Validation Schema

```typescript
// src/lib/generation/schemas.ts
export const batchIdParamsSchema = z.object({
  batchId: z
    .string({
      required_error: "batchId is required",
      invalid_type_error: "batchId must be a string",
    })
    .uuid({ message: "batchId must be a valid UUID format" }),
});
```

### Response DTO

```typescript
// From src/types.ts - GenerationBatchResponse
export interface GenerationBatchResponse {
  id: string;
  userId: string;
  createdAt: string;
  generations: AiGenerationResponse[];
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  completedCount: number;
  totalCount: number;
}

export interface AiGenerationResponse {
  id: string;
  status: GenerationStatus; // "PENDING" | "SUCCESS" | "ERROR"
  modelName: string;
  modelVersion: string | null;
  temperature: number | null;
  topP: number | null;
  config: Record<string, unknown>;
  promptTokens: number | null;
  completionTokens: number | null;
  errorMessage: string | null;
  createdAt: string;
  deckId: string | null;
  generationBatchId: string | null;
  userId: string;
  flashcards?: FlashcardResponse[];
}
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "createdAt": "2025-10-09T12:00:00Z",
  "status": "IN_PROGRESS",
  "completedCount": 2,
  "totalCount": 5,
  "generations": [
    {
      "id": "gen-456",
      "status": "SUCCESS",
      "modelName": "gpt-4o",
      "modelVersion": "2024-08-06",
      "temperature": 0.7,
      "topP": null,
      "config": { "model": "gpt-4o", "temperature": 0.7 },
      "promptTokens": 150,
      "completionTokens": 300,
      "errorMessage": null,
      "createdAt": "2025-10-09T12:00:05Z",
      "deckId": "deck-789",
      "generationBatchId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-123",
      "flashcards": [
        {
          "id": "card-001",
          "front": "What is photosynthesis?",
          "back": "The process by which plants convert sunlight into energy",
          "deckId": "deck-789",
          "source": "ai",
          "easeFactor": 2.5,
          "intervalDays": 0,
          "repetition": 0,
          "nextReviewAt": null,
          "createdAt": "2025-10-09T12:00:10Z",
          "updatedAt": "2025-10-09T12:00:10Z",
          "userId": "user-123",
          "deletedAt": null
        }
      ]
    }
  ]
}
```

### Batch Status Computation Logic

- **PENDING**: All generations have status "PENDING"
- **IN_PROGRESS**: At least one generation is "PENDING" or "SUCCESS", but not all are complete
- **COMPLETED**: All generations have status "SUCCESS"
- **FAILED**: At least one generation has status "ERROR" and none are "PENDING"

## 5. Data Flow

1. **Authentication Check**: Middleware validates Bearer token and populates `locals.user`
2. **Path Parameter Validation**: Zod schema validates `batchId` is a valid UUID
3. **Authorization**: Supabase RLS policies ensure user can only access their own batches
4. **Database Query**:
   - Fetch generation batch metadata from `generation_batches` table
   - Fetch all associated generations from `ai_generations` table via `generation_batch_id`
   - For completed generations, fetch associated flashcards via `card_generations` junction table
5. **Business Logic**: Compute batch status and counts from individual generation statuses
6. **Response Construction**: Transform database entities to DTOs and return JSON response

## 6. Security Considerations

- **Authentication**: Required Bearer token authentication via Supabase Auth
- **Authorization**: Row-Level Security (RLS) policies on `generation_batches` and `ai_generations` tables ensure users can only access their own data
- **Input Validation**: UUID validation prevents injection attacks and malformed requests
- **Rate Limiting**: Consider implementing rate limiting to prevent polling abuse (suggested: 30 requests per minute per user)
- **Data Exposure**: RLS prevents unauthorized access to other users' generation data
- **Error Information**: Error messages should not leak sensitive information about batch contents or internal system details

## 7. Error Handling

### Error Response Format

All errors follow the standard API error response format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "fieldName",
        "message": "Specific field validation error"
      }
    ]
  }
}
```

### Potential Error Scenarios

| Status Code | Error Code          | Scenario                                       | Handling                                                                   |
| ----------- | ------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| 400         | INVALID_BATCH_ID    | batchId is not a valid UUID                    | Return validation error with field details                                 |
| 401         | UNAUTHORIZED        | Missing or invalid auth token                  | Return auth error, log warning                                             |
| 404         | BATCH_NOT_FOUND     | Batch doesn't exist or belongs to another user | Return not found error (don't distinguish between not exists vs not owned) |
| 429         | RATE_LIMIT_EXCEEDED | Too many polling requests                      | Return rate limit error with Retry-After header                            |
| 500         | SERVER_ERROR        | Database connection issues, unexpected errors  | Log error details, return generic server error                             |

### Logging Strategy

- **Validation Errors (400)**: Log at WARN level with userId and validation details
- **Auth Errors (401)**: Log at WARN level with IP/request details
- **Not Found (404)**: Log at INFO level with userId and batchId for debugging
- **Rate Limits (429)**: Log at WARN level with userId for monitoring abuse
- **Server Errors (500)**: Log at ERROR level with full error context, userId, and batchId

## 8. Performance Considerations

### Database Query Optimization

- Use single query with JOINs to fetch batch + generations + flashcards in one operation
- Leverage existing indexes on `generation_batches(id, user_id)` and `ai_generations(generation_batch_id)`
- Consider query result caching for frequently polled batches (Redis/memory cache)

### Response Size Management

- Large batches may return significant data (multiple generations with flashcards)
- Monitor response sizes and consider pagination if batches grow large
- Use efficient JSON serialization

### Rate Limiting Strategy

- Implement sliding window rate limiter (30 requests/minute per user)
- Use Redis for distributed rate limiting if deploying to multiple instances
- Return appropriate Retry-After headers

### Monitoring and Metrics

- Track endpoint latency and error rates
- Monitor batch completion times and success rates
- Alert on high error rates or performance degradation

## 9. Implementation Steps

### Phase 1: Schema and Types

1. Create `src/lib/generation/schemas.ts` with batchId validation schema
2. Update existing schemas if needed for generation-related validation

### Phase 2: Service Layer

3. Create `src/lib/services/generationBatchService.ts`:
   - Implement `getGenerationBatch(userId: string, batchId: string)` method
   - Handle database queries for batch and associated generations
   - Implement batch status computation logic
   - Add proper error handling and logging

### Phase 3: API Endpoint

4. Create `src/pages/api/generation-batches/[batchId].ts`:
   - Implement GET handler following existing API patterns
   - Add authentication and validation middleware
   - Integrate with GenerationBatchService
   - Implement proper error responses and logging
   - Add rate limiting if determined necessary

### Phase 4: Testing

5. Create unit tests for GenerationBatchService
6. Create integration tests for the API endpoint
7. Test error scenarios and edge cases
8. Test with various batch states (pending, in-progress, completed, failed)

### Phase 5: Documentation and Validation

9. Update API documentation with the new endpoint
10. Add OpenAPI/Swagger specifications if applicable
11. Test integration with frontend polling logic
12. Performance testing with large batches

### Phase 6: Deployment and Monitoring

13. Deploy endpoint with monitoring in place
14. Monitor error rates and performance metrics
15. Set up alerts for high error rates or performance issues
16. Gather user feedback on polling behavior

## 10. Dependencies and Prerequisites

- Supabase client setup and database tables (`generation_batches`, `ai_generations`, `card_generations`)
- Existing authentication middleware
- Zod for validation
- Existing error handling and logging utilities
- Rate limiting infrastructure (if implementing)
- Testing framework setup

## 11. Risk Assessment

### High Risk

- **Database Performance**: Large batches with many generations could cause slow queries
- **Rate Limiting**: Aggressive polling could overwhelm the service

### Medium Risk

- **RLS Policy Gaps**: Ensure proper authorization controls are in place
- **Error Handling**: Comprehensive error scenarios must be covered

### Low Risk

- **Input Validation**: UUID validation is straightforward
- **Response Format**: Uses existing DTO patterns

## 12. Success Criteria

- Endpoint returns 200 with correct batch data for valid requests
- Proper error responses for all error scenarios
- Authentication and authorization work correctly
- Performance meets requirements (sub-500ms response times)
- Comprehensive test coverage (unit + integration tests)
- Proper logging and monitoring in place
- Frontend can successfully poll and track batch progress
