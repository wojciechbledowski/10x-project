# API Endpoint Implementation Plan: POST /ai-generations/{generationId}/retry

## 1. Endpoint Overview

This endpoint allows users to retry a failed AI flashcard generation job. When a generation fails (status = 'ERROR'), users can trigger a new attempt using the same parameters and configuration. The endpoint creates a new generation record with 'PENDING' status and initiates the background AI processing pipeline, allowing clients to poll the new generation for results.

**Key Characteristics:**

- Creates a new generation record (does not modify the existing failed one)
- Maintains the same batch grouping for related generations
- Reuses original generation parameters (model, temperature, prompt, etc.)
- Asynchronous processing with immediate response
- Enforces strict ownership validation through Row Level Security
- Prevents retrying successful or pending generations

## 2. Request Details

- **HTTP Method:** POST
- **URL Structure:** `/ai-generations/{generationId}/retry`
- **Authentication:** Required (Supabase JWT token)
- **Content-Type:** N/A (no request body)

### Parameters

#### Path Parameters

- `generationId` (string): UUID of the failed generation to retry
  - Required: Yes
  - Format: Valid UUID v4
  - Must exist, be owned by authenticated user, and have status 'ERROR'

### Request Headers

- `Authorization: Bearer <supabase-jwt-token>` - Required for authentication
- `Content-Type: application/json` - Optional (no body expected)

## 3. Used Types

The endpoint leverages existing DTO types from the shared type definitions:

```typescript
// Request: No specific request DTO (empty body)

// Response: Reuse existing AiGenerationResponse for consistency
interface AiGenerationResponse {
  id: string;
  status: GenerationStatus; // Will be 'PENDING' for new retry
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
  // flashcards omitted for PENDING status
}
```

## 4. Response Details

- **Success Status:** 201 Created
- **Content-Type:** `application/json`

### Response Body Schema

```typescript
{
  "id": "string (UUID)",           // New generation ID
  "status": "PENDING",
  "modelName": "string",
  "modelVersion": "string | null",
  "temperature": "number | null",
  "topP": "number | null",
  "config": "Record<string, unknown>",
  "createdAt": "string (ISO 8601)",
  "deckId": "string (UUID) | null",
  "generationBatchId": "string (UUID) | null",
  "userId": "string (UUID)"
}
```

### Response Headers

- `Location: /ai-generations/{newGenerationId}` - Resource location for status polling

## 5. Data Flow

### 5.1 Authentication & Authorization

1. **JWT Validation:** Extract and validate Supabase JWT token from Authorization header
2. **User Context:** Retrieve authenticated user ID from token
3. **Path Parameter Validation:** Validate generationId format using Zod schema

### 5.2 Generation Validation

1. **Existence Check:** Query ai_generations table for the specified generationId
2. **Ownership Verification:** Ensure generation belongs to authenticated user (via RLS)
3. **Status Validation:** Verify generation status is 'ERROR' (only failed generations can be retried)
4. **Batch Association:** Retrieve batch information for grouping the retry

### 5.3 Retry Creation

1. **Configuration Reuse:** Extract original generation parameters (model, temperature, config, etc.)
2. **New Generation Record:** Create ai_generations record with status 'PENDING'
3. **Batch Continuity:** Link to same generation_batch_id to maintain grouping
4. **Audit Trail:** Preserve original generation reference for tracking

### 5.4 Background Processing Trigger

1. **Job Queue:** Submit background job for AI processing with original parameters
2. **Async Response:** Return immediately without waiting for AI completion
3. **Status Monitoring:** Client polls new generation endpoint for results

### 5.5 Response Assembly

1. **Data Mapping:** Transform new generation record to API response format
2. **Field Mapping:** Convert snake_case database fields to camelCase API fields
3. **Date Formatting:** Ensure timestamp is ISO 8601 formatted

## 6. Security Considerations

### Authentication & Authorization

- **JWT Validation:** Required Supabase authentication via Bearer token
- **User Isolation:** All database queries scoped to authenticated user via RLS
- **Generation Ownership:** Strict validation ensures user can only retry their own failed generations
- **Status Enforcement:** Business logic prevents retrying successful or pending generations

### Input Validation & Sanitization

- **UUID Validation:** Strict validation of generationId parameter format
- **Path Traversal Protection:** UUID format prevents directory traversal attacks
- **SQL Injection Prevention:** All queries use parameterized statements via Supabase client

### Abuse Prevention

- **Rate Limiting:** Implement per-user limits on retry frequency
- **Retry Limits:** Prevent infinite retry loops on persistently failing generations
- **Cost Controls:** Monitor AI API usage to prevent abuse
- **Audit Logging:** All retry attempts logged for security monitoring

### Data Privacy

- **Row Level Security:** Database-level enforcement prevents unauthorized access
- **Scoped Operations:** All data operations limited to authenticated user's records
- **No Data Leakage:** generationId reveals no information about other users' data

## 7. Error Handling

### Client Errors (4xx)

**400 Bad Request - Invalid generationId**

```json
{
  "error": {
    "code": "INVALID_ID",
    "message": "generationId must be a valid UUID",
    "details": [
      {
        "field": "generationId",
        "message": "Must be a valid UUID format"
      }
    ]
  }
}
```

**401 Unauthorized**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**404 Not Found**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "AI generation not found or access denied"
  }
}
```

**409 Conflict - Invalid Generation Status**

```json
{
  "error": {
    "code": "INVALID_STATUS",
    "message": "Can only retry generations with ERROR status",
    "details": [
      {
        "field": "status",
        "message": "Current status: PENDING/SUCCESS"
      }
    ]
  }
}
```

**429 Too Many Requests**

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many retry attempts",
    "details": [
      {
        "message": "Retry limit exceeded for this generation"
      }
    ]
  }
}
```

### Server Errors (5xx)

**500 Internal Server Error**

```json
{
  "error": {
    "code": "SERVER_ERROR",
    "message": "Failed to create retry generation"
  }
}
```

**503 Service Unavailable**

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Background processing temporarily unavailable"
  }
}
```

### Logging Strategy

- **Info Level:** Successful retry creation with user and generation IDs
- **Warn Level:** Authentication failures, invalid parameters, status conflicts
- **Error Level:** Database errors, background job queue failures
- **Security Events:** Multiple failed retry attempts, suspicious patterns

## 8. Performance

### Query Optimization

- **Single Query Pattern:** Efficient lookup of original generation with status validation
- **Index Utilization:** Leverage existing indexes on id and user_id columns
- **Minimal Data Transfer:** Only fetch required fields for validation and configuration reuse

### Response Time Optimization

- **Immediate Response:** Return 201 Created without waiting for AI processing
- **Minimal Database Operations:** Single insert operation for new generation record
- **Async Processing:** Heavy AI operations handled in background job queue

### Scalability Factors

- **Stateless Operations:** No server-side session state required
- **Horizontal Scaling:** Endpoint can be scaled horizontally without shared state
- **Database Load:** Efficient queries minimize database connection time
- **Background Processing:** AI workload isolated from API response time

### Rate Limiting Strategy

- **Per-User Limits:** Track retry attempts per user per hour/day
- **Per-Generation Limits:** Limit retry attempts per specific generation (e.g., max 3 retries)
- **Sliding Window:** Implement time-based rate limiting for abuse prevention
- **Graceful Degradation:** Return 429 with retry-after header when limits exceeded

### Cost Optimization

- **Configuration Reuse:** Avoid re-processing original parameters
- **Batch Efficiency:** Group related retry attempts for processing optimization
- **Caching:** Consider caching frequently retried configurations (future enhancement)

## 9. Implementation Steps

### Phase 1: Core Endpoint Setup

1. Create `src/pages/api/ai-generations/[generationId]/retry.ts` endpoint file
2. Implement basic request handler structure with error handling
3. Set up middleware for authentication and CORS
4. Add `export const prerender = false` for dynamic endpoint

### Phase 2: Input Validation

1. Create validation schema for generationId parameter
2. Implement UUID format validation using Zod
3. Add parameter extraction from dynamic route
4. Create validation helper functions

### Phase 3: Service Layer Implementation

1. Extend `src/lib/services/aiGeneration.service.ts` with retry functionality
2. Implement `retryGeneration(generationId: string, userId: string)` method
3. Add validation logic for generation existence and ERROR status
4. Implement new generation record creation with configuration reuse
5. Add database transaction handling for atomic operations

### Phase 4: Business Logic

1. Implement rate limiting checks for retry attempts
2. Add retry count tracking per generation
3. Validate generation ownership and status
4. Prepare AI generation configuration from original parameters
5. Handle batch association logic

### Phase 5: Background Job Integration

1. Create background job trigger for AI processing
2. Implement job payload structure reusing existing patterns
3. Add error handling for job queue failures
4. Ensure proper cleanup on endpoint errors

### Phase 6: Response & Error Handling

1. Implement structured error responses with proper HTTP status codes
2. Add comprehensive error mapping for different failure scenarios
3. Implement logging using existing ConsoleLogger pattern
4. Add proper response headers (Location)

### Phase 7: Security Implementation

1. Verify RLS policies prevent unauthorized access
2. Add ownership validation in service layer
3. Implement authorization checks for retry operations
4. Test security scenarios with different user contexts

### Phase 8: Testing & Validation

1. Create unit tests for validation logic and business rules
2. Add integration tests for database operations
3. Implement tests for error scenarios and edge cases
4. Test rate limiting and security constraints
5. Validate retry limits and status enforcement

### Phase 9: Documentation & Monitoring

1. Update API documentation with retry endpoint examples
2. Add OpenAPI/Swagger specifications
3. Implement endpoint usage monitoring and metrics
4. Add alerting for critical failures and abuse patterns

### Key Implementation Files

- `src/pages/api/ai-generations/[generationId]/retry.ts` - Main endpoint handler
- `src/lib/services/aiGeneration.service.ts` - Extended with retry logic
- `src/lib/schemas/ai-generation-retry.schema.ts` - Validation schemas
- `src/lib/services/rate-limiting.service.ts` - Rate limiting logic (extend existing)

### Dependencies

- `zod` for input validation (already in use)
- `@supabase/supabase-js` for database operations (already in use)
- Existing error handling utilities from `src/lib/utils/`
- Existing logging utilities from `src/lib/utils/logger.ts`
- Background job queue system (Supabase Edge Functions recommended)
- Existing AI generation service for configuration reuse
