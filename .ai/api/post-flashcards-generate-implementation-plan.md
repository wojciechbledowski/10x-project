# API Endpoint Implementation Plan: POST /flashcards/generate

## 1. Endpoint Overview

This endpoint initiates asynchronous flashcard generation using AI services. It accepts text content (1000-10000 characters) and optional parameters, creates a generation batch for tracking, and returns a batchId for status polling. The actual AI processing occurs asynchronously to prevent blocking the client.

**Key Characteristics:**

- Asynchronous operation with immediate response
- Creates generation batch and initial AI generation records
- Integrates with OpenRouter.ai for AI model access
- Supports optional deck assignment for generated cards
- Implements rate limiting and cost controls

## 2. Request Details

- **HTTP Method:** POST
- **URL Structure:** `/flashcards/generate`
- **Authentication:** Required (Supabase JWT token)
- **Content-Type:** `application/json`

### Parameters

#### Required Parameters

- `sourceText` (string): The text content to generate flashcards from
  - Length: 1000-10000 characters
  - Content: Study material, articles, notes, etc.

#### Optional Parameters

- `deckId` (string): UUID of deck to assign generated flashcards to
  - Must be owned by the authenticated user
  - If omitted, cards remain unassigned
- `temperature` (number): AI model temperature override
  - Range: 0.0 - 2.0
  - Default: 0.7
  - Controls creativity vs consistency

### Request Body Schema

```typescript
{
  "sourceText": "string (1000-10000 chars)",
  "deckId": "string (UUID, optional)",
  "temperature": "number (0.0-2.0, optional)"
}
```

## 3. Response Details

- **Success Status:** 202 Accepted
- **Content-Type:** `application/json`

### Response Body Schema

```typescript
{
  "batchId": "string (UUID)",
  "estimatedCardCount": "number"
}
```

### Response Headers

- `Location: /generation-batches/{batchId}` - Resource location for status polling

## 4. Data Flow

1. **Authentication & Authorization**
   - Extract user ID from Supabase JWT
   - Validate user session

2. **Input Validation**
   - Validate request body with Zod schema
   - Verify `sourceText` length (1000-10000 chars)
   - If `deckId` provided: verify ownership and existence
   - Check rate limits for AI generation

3. **Batch Creation**
   - Create `generation_batches` record
   - Generate unique `batchId` (UUID)
   - Link to authenticated user

4. **AI Generation Setup**
   - Create initial `ai_generations` record with status 'PENDING'
   - Configure AI parameters (model, temperature, etc.)
   - Prepare prompt for flashcard generation

5. **Asynchronous Processing Trigger**
   - Queue background job for AI processing
   - Return immediate response with batchId

6. **Background Processing** (separate from this endpoint)
   - Call OpenRouter.ai API
   - Parse AI response into flashcard data
   - Create flashcards with source='AI_GENERATED'
   - Update generation status to 'SUCCESS' or 'ERROR'
   - Link flashcards via `card_generations` junction table

## 5. Security Considerations

### Authentication & Authorization

- **JWT Validation:** Required Supabase authentication
- **User Context:** All operations scoped to authenticated user
- **Deck Ownership:** If `deckId` provided, validate user ownership

### Input Validation & Sanitization

- **Text Length Limits:** Prevent extremely large inputs that could cause issues
- **Content Filtering:** Basic validation for malicious content patterns
- **UUID Validation:** Strict validation for `deckId` parameter

### Rate Limiting & Abuse Prevention

- **Per-User Limits:** Maximum generations per hour/day
- **Cost Controls:** Integration with OpenRouter.ai usage limits
- **Input Size Limits:** Prevent resource exhaustion from large texts

### Data Privacy

- **User Isolation:** All data operations scoped to user_id
- **No Data Leakage:** batchId should not reveal information about other users
- **Audit Logging:** All AI generations logged for transparency

## 6. Error Handling

### Client Errors (4xx)

**400 Bad Request**

- Invalid request body structure
- `sourceText` length outside 1000-10000 range
- Invalid `temperature` value (outside 0.0-2.0)
- Malformed UUID for `deckId`

**401 Unauthorized**

- Missing or invalid JWT token
- Expired user session

**403 Forbidden**

- Attempting to assign cards to deck owned by another user

**404 Not Found**

- Referenced `deckId` does not exist

**422 Unprocessable Entity**

- `deckId` exists but user does not have access (ownership check failed)

**429 Too Many Requests**

- User exceeded AI generation rate limit
- Service-level rate limiting from OpenRouter.ai

### Server Errors (5xx)

**500 Internal Server Error**

- Database connection failures
- Unexpected errors during batch creation
- Supabase service unavailability

**503 Service Unavailable**

- OpenRouter.ai service temporarily unavailable
- Background job queue full
- System maintenance mode

### Error Response Format

```typescript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "sourceText",
        "message": "Text must be between 1000 and 10000 characters"
      }
    ]
  }
}
```

## 7. Performance Considerations

### Response Time Optimization

- **Immediate Response:** Return 202 Accepted without waiting for AI processing
- **Minimal Database Operations:** Only create batch and initial generation records
- **Async Processing:** Heavy AI operations handled in background

### Scalability Factors

- **Stateless Operations:** No server-side session state
- **Database Indexing:** Ensure user_id and deck_id foreign keys are indexed
- **Background Job Queue:** Use Supabase Edge Functions or similar for async processing

### Rate Limiting Strategy

- **Per-User Limits:** Track generations per hour/day in database
- **Sliding Window:** Implement time-based rate limiting
- **Graceful Degradation:** Return 429 with retry-after header

### Cost Optimization

- **Token Estimation:** Provide `estimatedCardCount` based on input size
- **Model Selection:** Use cost-effective models by default
- **Caching:** Consider caching similar prompts (future enhancement)

## 8. Implementation Steps

### Phase 1: Core Endpoint Setup

1. Create `src/pages/api/flashcards/generate.ts` endpoint file
2. Implement basic request handler structure with error handling
3. Set up middleware for authentication and CORS
4. Add `export const prerender = false` for dynamic endpoint

### Phase 2: Input Validation

1. Create Zod schema for request validation in `src/lib/schemas/generate-flashcards.schema.ts`
2. Implement comprehensive input validation
3. Add custom validation for deck ownership verification
4. Create helper functions for validation logic

### Phase 3: Database Operations

1. Create `src/lib/services/flashcard-generation.service.ts`
2. Implement `createGenerationBatch()` function
3. Implement `createAiGeneration()` function
4. Add database transaction handling for atomic operations

### Phase 4: Business Logic

1. Implement rate limiting check in service layer
2. Add deck ownership validation
3. Calculate `estimatedCardCount` based on input text length
4. Prepare AI generation configuration (model, temperature, prompt)

### Phase 5: Background Job Integration

1. Create background job trigger for AI processing
2. Implement job payload structure for OpenRouter.ai integration
3. Add error handling for job queue failures
4. Ensure proper cleanup on endpoint errors

### Phase 6: Response & Error Handling

1. Implement structured error responses with proper HTTP status codes
2. Add logging for debugging and monitoring
3. Implement rate limit headers and retry-after logic
4. Add comprehensive error mapping for different failure scenarios

### Phase 7: Testing & Validation

1. Create unit tests for validation logic
2. Add integration tests for database operations
3. Implement load testing for rate limiting
4. Test error scenarios and edge cases

### Phase 8: Documentation & Monitoring

1. Update API documentation with examples
2. Add OpenAPI/Swagger specifications
3. Implement monitoring for endpoint usage and errors
4. Add alerting for critical failures

### Key Implementation Files

- `src/pages/api/flashcards/generate.ts` - Main endpoint handler
- `src/lib/schemas/generate-flashcards.schema.ts` - Zod validation schemas
- `src/lib/services/flashcard-generation.service.ts` - Business logic service
- `src/lib/services/rate-limiting.service.ts` - Rate limiting logic
- `src/lib/services/ai-generation.service.ts` - AI integration wrapper

### Dependencies

- `zod` for input validation
- `@supabase/supabase-js` for database operations
- Custom OpenRouter.ai integration service
- Background job queue system (Supabase Edge Functions recommended)
