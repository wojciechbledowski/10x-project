# API Endpoint Implementation Plan: POST /flashcards/generate

## 1. Endpoint Overview

This endpoint accepts user-provided source text and initiates an asynchronous AI-powered flashcard generation process. It creates a `generation_batch` record to group the work, spawns one or more `ai_generation` jobs, and returns a batch identifier that clients can poll to track progress. The endpoint follows an async pattern (HTTP 202 Accepted) because AI generation can take several seconds or minutes depending on text length and model response time.

**Business Context:**

- Users submit study material (1,000–10,000 characters)
- System estimates the number of flashcards that can be generated
- AI model (via OpenRouter.ai) processes the text and creates flashcard pairs (front/back)
- Generated flashcards can be optionally assigned to a deck
- User polls `/generation-batches/{batchId}` for completion status

## 2. Request Details

### HTTP Method

`POST`

### URL Structure

`/flashcards/generate`

### Headers

- `Content-Type: application/json` (Required)

### Parameters

**Body Parameters (JSON):**

| Parameter     | Type   | Required | Constraints               | Description                                         |
| ------------- | ------ | -------- | ------------------------- | --------------------------------------------------- |
| `sourceText`  | string | Yes      | 1,000 - 10,000 characters | Source material for flashcard generation            |
| `deckId`      | string | No       | Valid UUID format         | Optional deck to assign generated cards to          |
| `temperature` | number | No       | 0.0 - 2.0, default varies | AI model temperature parameter (creativity control) |

### Request Body Example

```json
{
  "sourceText": "Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy... [1000+ chars]",
  "deckId": "550e8400-e29b-41d4-a716-446655440000",
  "temperature": 0.7
}
```

## 3. Used Types

### Request Type

```typescript
// Defined in src/types.ts
interface GenerateFlashcardsRequest {
  deckId?: string;
  sourceText: string;
  temperature?: number;
}
```

### Response Type

```typescript
// Defined in src/types.ts
interface GenerateFlashcardsResponse {
  batchId: string;
  estimatedCardCount: number;
}
```

### Related Types

```typescript
// Defined in src/types.ts
type GenerationStatus = "PENDING" | "SUCCESS" | "ERROR";

interface AiGenerationResponse {
  id: string;
  status: GenerationStatus;
  modelName: string;
  // ... other fields
}

interface GenerationBatchResponse {
  id: string;
  userId: string;
  createdAt: string;
  generations: AiGenerationResponse[];
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  // ... other fields
}
```

## 4. Response Details

### Success Response (HTTP 202 Accepted)

**Status Code:** `202 Accepted`

**Headers:**

- `Content-Type: application/json`

**Body:**

```json
{
  "batchId": "a1b2c3d4-e5f6-4a1b-8c9d-0e1f2a3b4c5d",
  "estimatedCardCount": 25
}
```

**Description:**

- `batchId`: Unique identifier for the generation batch, used for polling status
- `estimatedCardCount`: Rough estimate of how many flashcards will be generated (based on source text length heuristics)

### Error Responses

#### 400 Bad Request

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "sourceText",
        "message": "Source text must be between 1000 and 10000 characters"
      }
    ]
  }
}
```

**Triggers:**

- sourceText length < 1000 or > 10000 characters
- Invalid deckId format (not a UUID)
- Invalid temperature value (< 0 or > 2)
- Malformed JSON body
- Missing required field (sourceText)

#### 403 Forbidden

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to specified deck"
  }
}
```

**Triggers:**

- User attempts to assign generated cards to a deck owned by another user
- RLS policy violation

#### 404 Not Found

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Deck not found"
  }
}
```

**Triggers:**

- Specified deckId doesn't exist in database
- Deck is soft-deleted (deleted_at is not null)

#### 500 Internal Server Error

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred while processing your request"
  }
}
```

**Triggers:**

- Database connection failures
- Unhandled exceptions in business logic
- Critical system errors

#### 503 Service Unavailable

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "AI generation service is temporarily unavailable"
  }
}
```

**Triggers:**

- OpenRouter.ai service is down or unreachable
- Timeout connecting to AI service
- Network connectivity issues

## 5. Data Flow

### High-Level Flow

```
1. Client sends POST /flashcards/generate with sourceText
2. API validates authentication (JWT token)
3. API validates request body (Zod schema)
4. API checks deck ownership if deckId provided
5. API estimates card count from text length
6. API creates generation_batch record
7. API creates ai_generation record(s) with status='PENDING'
8. API enqueues background job for AI processing
9. API returns 202 with batchId
10. Background worker picks up job
11. Worker calls OpenRouter.ai API
12. Worker creates flashcard records
13. Worker updates ai_generation status to 'SUCCESS' or 'ERROR'
14. Client polls /generation-batches/{batchId} for status
```

### Detailed Data Flow

#### Phase 1: Request Validation (Synchronous)

1. Parse and validate request body with Zod schema
2. If deckId provided:
   - Query `decks` table to verify existence
   - Verify deck.user_id matches authenticated user_id
   - Return 404 if not found, 403 if not owned

#### Phase 2: Estimation and Batch Creation (Synchronous)

1. Calculate estimated card count using heuristic:
   - Approximately 1 flashcard per 150-200 words
   - Consider text structure (paragraphs, lists)
2. Begin database transaction
3. Insert into `generation_batches`:
   ```sql
   INSERT INTO generation_batches (user_id)
   VALUES (auth.uid())
   RETURNING id, created_at;
   ```
4. Insert into `ai_generations`:
   ```sql
   INSERT INTO ai_generations (
     user_id,
     deck_id,
     generation_batch_id,
     status,
     model_name,
     temperature,
     config
   )
   VALUES (
     auth.uid(),
     <deckId or NULL>,
     <batchId>,
     'PENDING',
     'gpt-4o-mini', -- or configured model
     <temperature or default>,
     jsonb_build_object(
       'sourceText', <sourceText>,
       'estimatedCount', <estimatedCardCount>
     )
   )
   RETURNING id;
   ```
5. Commit transaction
6. Return response immediately (async processing will happen in background)

#### Phase 3: Background AI Processing (Asynchronous)

This happens after the HTTP response is sent:

1. Background worker (Edge Function or server process) queries for PENDING generations
2. For each generation:
   - Extract sourceText from config field
   - Prepare prompt for OpenRouter.ai:
     ```
     System: You are a flashcard generator. Create study flashcards from the provided text.
     User: <sourceText>
     ```
   - Call OpenRouter.ai API with:
     - Model: gpt-4o-mini (or configured model)
     - Temperature: from generation record or default
     - Expected response format: JSON array of {front, back} objects
3. Parse AI response
4. Validate generated flashcards (check front/back length constraints)
5. Begin database transaction
6. For each valid flashcard:
   ```sql
   INSERT INTO flashcards (
     user_id,
     deck_id,
     front,
     back,
     source,
     ease_factor,
     interval_days,
     repetition,
     next_review_at
   )
   VALUES (
     <user_id>,
     <deck_id or NULL>,
     <front>,
     <back>,
     'AI',
     2.50,  -- default SM-2 ease factor
     0,     -- not reviewed yet
     0,     -- no repetitions
     NULL   -- no review scheduled yet
   )
   RETURNING id;
   ```
7. Link flashcards to generation:
   ```sql
   INSERT INTO card_generations (flashcard_id, generation_id)
   VALUES (<flashcard_id>, <generation_id>);
   ```
8. Update generation record:
   ```sql
   UPDATE ai_generations
   SET
     status = 'SUCCESS',
     prompt_tokens = <tokens_from_ai>,
     completion_tokens = <tokens_from_ai>
   WHERE id = <generation_id>;
   ```
9. Commit transaction
10. If any errors occur, update generation with status='ERROR' and error_message

### Service Architecture

**File: src/lib/ai-generation.service.ts**

- `generateFlashcards(sourceText: string, modelConfig: ModelConfig): Promise<FlashcardPair[]>`
- `estimateCardCount(sourceText: string): number`
- Handles OpenRouter.ai API communication

**File: src/lib/flashcard-generation.service.ts**

- `createGenerationBatch(userId: string, deckId?: string): Promise<string>`
- `createGenerationJob(batchId: string, sourceText: string, config: GenerationConfig): Promise<string>`
- Orchestrates batch and job creation

**File: src/lib/background-worker.service.ts** (or Edge Function)

- `processGenerationQueue(): Promise<void>`
- Polls for PENDING generations and processes them
- Should run continuously or on a schedule (e.g., every 30 seconds)

## 6. Security Considerations

### Authorization

- **User Ownership**: Verify authenticated user_id matches resource owner
- **Deck Access**: When deckId provided, verify deck belongs to user via RLS or explicit check
- **RLS Policies**: PostgreSQL RLS policies enforce user_id = auth.uid() on all tables
- **Service Role**: Only use service_role for background workers, never expose to client

### Input Validation

- **Zod Schema**: Validate all request body fields with strict Zod schema
- **Length Constraints**: Enforce sourceText min/max to prevent abuse
- **Type Safety**: Ensure deckId is valid UUID format before database query
- **Sanitization**: While we don't render user input as HTML here, be cautious about storing potentially malicious content

### API Key Protection

- **Environment Variables**: Store OpenRouter.ai API key in environment variables
- **Server-Side Only**: Never expose API key to client-side code
- **Key Rotation**: Support API key rotation without downtime
- **Least Privilege**: Use API keys with minimum required permissions

### Prompt Injection Protection

- **System Prompt**: Use clear system prompts that can't be easily overridden by user input
- **Output Validation**: Validate AI responses to ensure they match expected format
- **Sanitization**: Consider filtering or warning about suspicious patterns in sourceText
- **Monitoring**: Log unusual AI responses for security review

### Data Privacy

- **User Data Isolation**: RLS ensures users can only access their own data
- **Soft Deletes**: Respect deleted_at flag to hide soft-deleted records
- **GDPR Compliance**: Support hard deletion via background jobs
- **Audit Trail**: events table logs all significant actions

## 7. Error Handling

### Validation Errors (400)

**Scenario 1: sourceText too short**

```typescript
if (sourceText.length < 1000) {
  return new Response(
    JSON.stringify({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: [
          {
            field: "sourceText",
            message: "Source text must be at least 1000 characters",
          },
        ],
      },
    }),
    { status: 400 }
  );
}
```

**Scenario 2: sourceText too long**

```typescript
if (sourceText.length > 10000) {
  return new Response(
    JSON.stringify({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: [
          {
            field: "sourceText",
            message: "Source text must not exceed 10000 characters",
          },
        ],
      },
    }),
    { status: 400 }
  );
}
```

**Scenario 3: Invalid deckId format**

```typescript
if (deckId && !UUID_REGEX.test(deckId)) {
  return new Response(
    JSON.stringify({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: [
          {
            field: "deckId",
            message: "deckId must be a valid UUID",
          },
        ],
      },
    }),
    { status: 400 }
  );
}
```

**Scenario 4: Invalid temperature**

```typescript
if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
  return new Response(
    JSON.stringify({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: [
          {
            field: "temperature",
            message: "Temperature must be between 0 and 2",
          },
        ],
      },
    }),
    { status: 400 }
  );
}
```

### Authorization Errors (403)

**Scenario: Deck owned by another user**

```typescript
const { data: deck, error: deckError } = await supabase.from("decks").select("user_id").eq("id", deckId).single();

if (deck && deck.user_id !== user.id) {
  return new Response(
    JSON.stringify({
      error: {
        code: "FORBIDDEN",
        message: "Access denied to specified deck",
      },
    }),
    { status: 403 }
  );
}
```

### Not Found Errors (404)

**Scenario: Deck doesn't exist**

```typescript
if (!deck) {
  return new Response(
    JSON.stringify({
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Deck not found",
      },
    }),
    { status: 404 }
  );
}
```

### Server Errors (500)

**Scenario: Database error during batch creation**

```typescript
try {
  // Database operations
} catch (error) {
  console.error("Failed to create generation batch:", error);
  return new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while processing your request",
      },
    }),
    { status: 500 }
  );
}
```

### Service Unavailable (503)

**Scenario: OpenRouter.ai is down**

```typescript
try {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    // ... config
  });
} catch (error) {
  // Update generation record with error
  await supabase
    .from("ai_generations")
    .update({
      status: "ERROR",
      error_message: "AI service unavailable",
    })
    .eq("id", generationId);

  // Don't fail the HTTP request, as batch was already created
  // Client will see ERROR status when polling
}
```

### Error Logging Strategy

1. **Client-facing errors (4xx)**: Log at INFO level, return descriptive message
2. **Server errors (5xx)**: Log at ERROR level with full stack trace, return generic message
3. **AI generation failures**: Store in ai_generations.error_message for user visibility
4. **Structured logging**: Include user_id, generation_id, timestamp in all logs

## 8. Performance Considerations

### Potential Bottlenecks

1. **AI API Latency**: OpenRouter.ai calls can take 5-30 seconds per generation
   - **Solution**: Async pattern with 202 response; client polls for results
2. **Database Write Volume**: Multiple inserts per generation (batch, generation, flashcards, junctions)
   - **Solution**: Use database transactions to batch writes
   - **Solution**: Consider bulk insert for flashcards if many are generated at once

3. **Concurrent Generations**: Many users generating simultaneously
   - **Solution**: Background worker queue with configurable concurrency limit
   - **Solution**: Monitor OpenRouter.ai rate limits and queue accordingly

4. **Text Processing**: Estimating card count from large texts
   - **Solution**: Use simple character/word count heuristics (O(n) complexity is acceptable)
   - **Solution**: Consider caching estimation logic if complex

5. **Polling Load**: Many clients polling /generation-batches/{batchId}
   - **Solution**: Implement exponential backoff on client side
   - **Solution**: Consider WebSocket or Server-Sent Events for real-time updates in future

### Optimization Strategies

1. **Database Indexes**:
   - Ensure index exists on `ai_generations(status, created_at)` for queue queries
   - Ensure index exists on `generation_batches(id)` for fast batch lookups

2. **Connection Pooling**: Use Supabase's connection pooling for database queries

3. **Caching**:
   - Cache deck existence checks for short duration (e.g., 5 minutes)
   - Cache user rate limit checks in Redis/Memory

4. **Batch Processing**: Process multiple PENDING generations in parallel (with concurrency limit)

5. **Monitoring**:
   - Track ai_generations processing time (created_at to status update)
   - Monitor OpenRouter.ai API response times
   - Alert on high ERROR rate or long queue times

6. **Timeouts**:
   - Set reasonable timeout for OpenRouter.ai API (e.g., 60 seconds)
   - Retry failed generations with exponential backoff

## 9. Implementation Steps

### Step 1: Set Up Project Structure

1. Create service files:

   ```
   src/lib/ai-generation.service.ts
   src/lib/flashcard-generation.service.ts
   src/lib/validation.service.ts
   ```

2. Create Zod validation schema in `src/lib/validation.service.ts`:

   ```typescript
   import { z } from "zod";

   export const generateFlashcardsSchema = z.object({
     sourceText: z
       .string()
       .min(1000, "Source text must be at least 1000 characters")
       .max(10000, "Source text must not exceed 10000 characters"),
     deckId: z.string().uuid().optional(),
     temperature: z.number().min(0).max(2).optional(),
   });
   ```

### Step 2: Create Astro API Route

1. Create file `src/pages/api/flashcards/generate.ts`

2. Define POST handler:

   ```typescript
   import type { APIRoute } from "astro";
   import { generateFlashcardsSchema } from "../../../lib/validation.service";

   export const POST: APIRoute = async (context) => {
     // Implementation follows in next steps
   };
   ```

### Step 4: Implement Request Validation

```typescript
// Parse request body
let requestBody;
try {
  requestBody = await context.request.json();
} catch (error) {
  return new Response(
    JSON.stringify({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid JSON in request body",
      },
    }),
    { status: 400 }
  );
}

// Validate with Zod
const validation = generateFlashcardsSchema.safeParse(requestBody);

if (!validation.success) {
  return new Response(
    JSON.stringify({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: validation.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      },
    }),
    { status: 400 }
  );
}

const { sourceText, deckId, temperature } = validation.data;
```

### Step 6: Validate Deck Ownership (if deckId provided)

```typescript
if (deckId) {
  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .select("id, user_id, deleted_at")
    .eq("id", deckId)
    .single();

  if (deckError || !deck) {
    return new Response(
      JSON.stringify({
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "Deck not found",
        },
      }),
      { status: 404 }
    );
  }

  if (deck.deleted_at) {
    return new Response(
      JSON.stringify({
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "Deck not found",
        },
      }),
      { status: 404 }
    );
  }

  // RLS should prevent this, but explicit check for clarity
  if (deck.user_id !== user.id) {
    return new Response(
      JSON.stringify({
        error: {
          code: "FORBIDDEN",
          message: "Access denied to specified deck",
        },
      }),
      { status: 403 }
    );
  }
}
```

### Step 7: Estimate Card Count

```typescript
// Simple heuristic: ~1 card per 200 words
// Adjust based on your AI model's typical output
function estimateCardCount(text: string): number {
  const wordCount = text.split(/\s+/).length;
  const estimate = Math.floor(wordCount / 200);
  return Math.max(1, Math.min(estimate, 50)); // Clamp between 1-50
}

const estimatedCardCount = estimateCardCount(sourceText);
```

### Step 8: Create Generation Batch

```typescript
const { data: batch, error: batchError } = await supabase
  .from("generation_batches")
  .insert({
    user_id: user.id,
  })
  .select("id, created_at")
  .single();

if (batchError || !batch) {
  console.error("Failed to create generation batch:", batchError);
  return new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while processing your request",
      },
    }),
    { status: 500 }
  );
}
```

### Step 9: Create AI Generation Job

```typescript
const modelName = "openai/gpt-4o-mini"; // Or from config
const defaultTemperature = 0.7;

const { data: generation, error: generationError } = await supabase
  .from("ai_generations")
  .insert({
    user_id: user.id,
    deck_id: deckId || null,
    generation_batch_id: batch.id,
    status: "PENDING",
    model_name: modelName,
    temperature: temperature || defaultTemperature,
    config: {
      sourceText: sourceText,
      estimatedCount: estimatedCardCount,
    },
  })
  .select("id")
  .single();

if (generationError || !generation) {
  console.error("Failed to create generation job:", generationError);
  return new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while processing your request",
      },
    }),
    { status: 500 }
  );
}
```

### Step 10: Return 202 Response

```typescript
return new Response(
  JSON.stringify({
    batchId: batch.id,
    estimatedCardCount: estimatedCardCount,
  }),
  {
    status: 202,
    headers: { "Content-Type": "application/json" },
  }
);
```

### Step 11: Implement AI Generation Service

Create `src/lib/ai-generation.service.ts`:

```typescript
interface FlashcardPair {
  front: string;
  back: string;
}

interface ModelConfig {
  modelName: string;
  temperature: number;
  apiKey: string;
}

export async function generateFlashcards(sourceText: string, config: ModelConfig): Promise<FlashcardPair[]> {
  const systemPrompt = `You are a flashcard generator. Given study material, create high-quality flashcards.
Rules:
- Each flashcard should test one specific concept
- Front should be a clear question or prompt
- Back should be a concise, accurate answer
- Front and back must each be 1-1000 characters
- Return JSON array: [{"front": "...", "back": "..."}, ...]`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://yourapp.com", // Required by OpenRouter
      "X-Title": "AI Flashcard Generator", // Required by OpenRouter
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: sourceText },
      ],
      temperature: config.temperature,
      response_format: { type: "json_object" }, // Request JSON response
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const flashcards = JSON.parse(content);

  // Validate flashcards
  if (!Array.isArray(flashcards)) {
    throw new Error("AI response is not an array");
  }

  const validFlashcards = flashcards.filter((card) => {
    return (
      card.front &&
      card.back &&
      card.front.length >= 1 &&
      card.front.length <= 1000 &&
      card.back.length >= 1 &&
      card.back.length <= 1000
    );
  });

  return validFlashcards;
}
```

### Step 12: Implement Background Worker

Create `src/pages/api/background/process-generations.ts` (or as Edge Function):

```typescript
import type { APIRoute } from "astro";
import { generateFlashcards } from "../../../lib/ai-generation.service";

export const POST: APIRoute = async (context) => {
  // This should be called by a cron job or triggered periodically
  // Could also be a long-running process or Edge Function

  const supabase = context.locals.supabase;

  // Get pending generations (limit to prevent overload)
  const { data: pendingGenerations, error } = await supabase
    .from("ai_generations")
    .select("id, user_id, deck_id, config, model_name, temperature")
    .eq("status", "PENDING")
    .order("created_at", { ascending: true })
    .limit(10);

  if (error || !pendingGenerations) {
    console.error("Failed to fetch pending generations:", error);
    return new Response(JSON.stringify({ processed: 0 }), { status: 500 });
  }

  let processed = 0;

  for (const generation of pendingGenerations) {
    try {
      // Extract source text from config
      const sourceText = generation.config.sourceText;

      // Call AI service
      const flashcards = await generateFlashcards(sourceText, {
        modelName: generation.model_name,
        temperature: generation.temperature || 0.7,
        apiKey: import.meta.env.OPENROUTER_API_KEY,
      });

      // Insert flashcards
      const flashcardInserts = flashcards.map((card) => ({
        user_id: generation.user_id,
        deck_id: generation.deck_id,
        front: card.front,
        back: card.back,
        source: "AI",
        ease_factor: 2.5,
        interval_days: 0,
        repetition: 0,
        next_review_at: null,
      }));

      const { data: insertedCards, error: insertError } = await supabase
        .from("flashcards")
        .insert(flashcardInserts)
        .select("id");

      if (insertError) {
        throw new Error(`Failed to insert flashcards: ${insertError.message}`);
      }

      // Link flashcards to generation
      const junctionInserts = insertedCards.map((card) => ({
        flashcard_id: card.id,
        generation_id: generation.id,
      }));

      await supabase.from("card_generations").insert(junctionInserts);

      // Update generation status
      await supabase.from("ai_generations").update({ status: "SUCCESS" }).eq("id", generation.id);

      processed++;
    } catch (error) {
      console.error(`Failed to process generation ${generation.id}:`, error);

      // Update generation with error
      await supabase
        .from("ai_generations")
        .update({
          status: "ERROR",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", generation.id);
    }
  }

  return new Response(JSON.stringify({ processed }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
```
