# API Endpoint Implementation Plan: GET /ai-generations/{generationId}

## 1. Endpoint Overview

This endpoint retrieves the result of an AI flashcard generation job. It returns the generation metadata along with the generated flashcards if the generation was successful, or error details if the generation failed. This endpoint serves as the polling mechanism for clients to check the status of asynchronous AI generation jobs initiated via POST /flashcards/generate.

**Key Characteristics:**

- Synchronous retrieval of generation results
- Supports both successful generations (with flashcards) and failed generations (with error details)
- Enforces strict ownership validation through Row Level Security
- Includes associated flashcards via junction table lookup
- Provides comprehensive generation metadata including AI model details and token usage

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/ai-generations/{generationId}`
- **Authentication:** Required (Supabase JWT token)
- **Content-Type:** N/A (no request body)

### Parameters

#### Path Parameters

- `generationId` (string): UUID of the AI generation job
  - Required: Yes
  - Format: Valid UUID v4
  - Must exist and be owned by the authenticated user

### Request Headers

- `Authorization: Bearer <supabase-jwt-token>` - Required for authentication
- `Accept: application/json` - Optional, but recommended

## 3. Response Details

### Success Response (200 OK)

- **Content-Type:** `application/json`

#### Response Body Schema

```typescript
{
  "id": "string (UUID)",
  "status": "SUCCESS" | "ERROR" | "PENDING",
  "modelName": "string (e.g., 'gpt-4o')",
  "modelVersion": "string | null",
  "temperature": "number | null",
  "topP": "number | null",
  "config": "Record<string, unknown>",
  "promptTokens": "number | null",
  "completionTokens": "number | null",
  "errorMessage": "string | null",
  "createdAt": "string (ISO 8601)",
  "deckId": "string (UUID) | null",
  "generationBatchId": "string (UUID) | null",
  "userId": "string (UUID)",
  "flashcards": "FlashcardResponse[] | undefined" // Only present for SUCCESS status
}
```

#### FlashcardResponse Schema (when status is SUCCESS)

```typescript
{
  "id": "string (UUID)",
  "front": "string",
  "back": "string",
  "deckId": "string (UUID) | null",
  "source": "AI",
  "easeFactor": "number",
  "intervalDays": "number",
  "repetition": "number",
  "nextReviewAt": "string | null",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)",
  "userId": "string (UUID)",
  "deletedAt": "string | null"
}
```

### Error Responses

#### 400 Bad Request

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

#### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### 404 Not Found

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "AI generation not found"
  }
}
```

#### 500 Internal Server Error

```json
{
  "error": {
    "code": "SERVER_ERROR",
    "message": "Unexpected error"
  }
}
```

## 4. Data Flow

### 4.1 Authentication & Authorization

1. **JWT Validation:** Extract and validate Supabase JWT token from Authorization header
2. **User Context:** Retrieve authenticated user ID from token
3. **Path Parameter Validation:** Validate generationId format using Zod schema

### 4.2 Data Retrieval

1. **Generation Lookup:** Query ai_generations table with RLS enforcement
2. **Ownership Verification:** Ensure generation belongs to authenticated user
3. **Status Branching:**
   - If status is 'PENDING': Return generation metadata only
   - If status is 'ERROR': Return generation metadata with error_message
   - If status is 'SUCCESS': Return generation metadata + associated flashcards

### 4.3 Flashcard Association (for SUCCESS status)

1. **Junction Table Query:** Use card_generations table to find associated flashcard IDs
2. **Flashcard Retrieval:** Fetch full flashcard details for each associated card
3. **Response Assembly:** Include flashcards array in response

### 4.4 Response Formatting

1. **Data Mapping:** Transform database rows to API response format
2. **Field Mapping:** Convert snake_case database fields to camelCase API fields
3. **Date Formatting:** Ensure all timestamps are ISO 8601 formatted

## 5. Security Considerations

### Authentication & Authorization

- **JWT Validation:** Required Supabase authentication via Bearer token
- **User Isolation:** All database queries scoped to authenticated user via RLS
- **Generation Ownership:** Additional validation ensures generation belongs to requesting user
- **No Data Leakage:** generationId should not reveal information about other users' generations

### Input Validation & Sanitization

- **UUID Validation:** Strict validation of generationId parameter format
- **Path Traversal Protection:** UUID format prevents directory traversal attacks
- **SQL Injection Prevention:** All queries use parameterized statements via Supabase client

### Data Privacy

- **Row Level Security:** Database-level enforcement prevents unauthorized access
- **Scoped Queries:** All data retrieval limited to authenticated user's records
- **Audit Trail:** Generation access implicitly logged via database query patterns

### Rate Limiting

- **Per-User Limits:** Consider implementing rate limits for polling frequency
- **DDoS Protection:** Standard web application firewall protections apply
- **Resource Exhaustion:** Efficient queries prevent database resource exhaustion

## 6. Error Handling

### Client Errors (4xx)

**400 Bad Request - Invalid generationId**

- Invalid UUID format
- Malformed path parameter
- Trigger: Zod validation failure

**401 Unauthorized**

- Missing Authorization header
- Invalid JWT token
- Expired token
- Trigger: Supabase authentication failure

**404 Not Found**

- Generation ID does not exist
- Generation exists but belongs to different user (RLS filtered)
- Trigger: Database query returns no results

### Server Errors (5xx)

**500 Internal Server Error**

- Database connection failures
- Unexpected Supabase client errors
- JSON serialization failures
- Trigger: Any unhandled exception in service layer

### Error Response Format

All errors follow standardized format with error codes, messages, and optional field-level details for validation errors.

### Logging Strategy

- **Info Level:** Successful generation retrievals with user and generation IDs
- **Warn Level:** Authentication failures, invalid parameters
- **Error Level:** Database errors, unexpected exceptions
- **Security Events:** Failed access attempts to other users' generations

## 7. Performance Considerations

### Query Optimization

- **Single Query Pattern:** Use Supabase joins to fetch generation + flashcards in one query
- **Index Utilization:** Leverage existing indexes on user_id and id columns
- **Selective Field Loading:** Only select required fields from database

### Response Size Management

- **Pagination Consideration:** For generations with many flashcards, consider pagination
- **Flashcard Limiting:** Current implementation returns all associated flashcards
- **Future Enhancement:** Add pagination support for large flashcard sets

### Caching Strategy

- **Client-Side Caching:** Clients can cache successful generation results
- **HTTP Caching Headers:** Consider ETag or Last-Modified headers for caching
- **Database Query Caching:** Rely on Supabase's internal caching mechanisms

### Scalability Factors

- **Stateless Operations:** No server-side session state required
- **Horizontal Scaling:** Endpoint can be scaled horizontally without shared state
- **Database Load:** Efficient queries minimize database load

## 8. Implementation Steps

### Phase 1: Core Endpoint Setup

1. Create `src/pages/api/ai-generations/[generationId].ts` endpoint file
2. Implement basic request handler structure with error handling
3. Set up middleware for authentication and CORS
4. Add `export const prerender = false` for dynamic endpoint

### Phase 2: Input Validation

1. Create `src/lib/ai-generations/schemas.ts` for validation schemas
2. Implement generationId parameter validation using Zod
3. Create UUID validation schema matching existing patterns
4. Add parameter extraction and validation logic

### Phase 3: Service Layer Implementation

1. Create `src/lib/services/aiGeneration.service.ts`
2. Implement `getGenerationWithFlashcards(generationId: string)` method
3. Add database query logic for generation retrieval
4. Implement flashcard association logic via junction table
5. Add proper error handling and data mapping

### Phase 4: Response Formatting

1. Create response mapping functions for generation data
2. Implement flashcard data transformation
3. Add proper TypeScript typing for all data transformations
4. Ensure ISO 8601 timestamp formatting

### Phase 5: Integration & Error Handling

1. Integrate with existing authentication middleware
2. Implement comprehensive error responses
3. Add logging using existing ConsoleLogger pattern
4. Test error scenarios and edge cases

### Phase 6: Security Implementation

1. Verify RLS policies are correctly applied
2. Add ownership validation in service layer
3. Implement proper authorization checks
4. Test security scenarios with different user contexts

### Phase 7: Testing & Validation

1. Create unit tests for validation logic
2. Add integration tests for database operations
3. Implement tests for error scenarios
4. Test with various generation statuses (PENDING, SUCCESS, ERROR)

### Phase 8: Documentation & Monitoring

1. Update API documentation with examples
2. Add OpenAPI/Swagger specifications
3. Implement endpoint usage monitoring
4. Add performance metrics collection

### Key Implementation Files

- `src/pages/api/ai-generations/[generationId].ts` - Main endpoint handler
- `src/lib/ai-generations/schemas.ts` - Zod validation schemas
- `src/lib/services/aiGeneration.service.ts` - Business logic service
- `src/lib/ai-generations/types.ts` - Additional type definitions if needed

### Dependencies

- `zod` for input validation (already in use)
- `@supabase/supabase-js` for database operations (already in use)
- Existing error handling utilities from `src/lib/utils/`
- Existing logging utilities from `src/lib/utils/logger.ts`
