import type { Database, Enums } from "./db/database.types";

// ============================================================================
// DECK DTOs
// ============================================================================

/**
 * Command Model for creating a new deck
 * POST /decks
 */
export interface CreateDeckRequest {
  name: string; // Required, ≤255 chars
}

/**
 * Response DTO for deck resource
 * Used in GET /decks, GET /decks/{deckId}, POST /decks
 */
export interface DeckResponse {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * Response DTO for deck detail with card count
 * GET /decks/{deckId}
 */
export interface DeckDetailResponse extends DeckResponse {
  cardCount: number; // Computed field
}

/**
 * View-model used by DeckCard & DeckGrid
 */
export interface DeckCardVM {
  id: string;
  name: string;
  totalCards: number; // cardCount from API
  dueCards: number; // to be added to API later – initially 0
}

/**
 * Sort key enum (kept in view layer)
 */
export type SortKey = "created_at" | "-created_at" | "name";

/**
 * Command Model for updating a deck
 * PATCH /decks/{deckId}
 */
export interface UpdateDeckRequest {
  name?: string;
  deletedAt?: string | null; // For soft-delete operations
}

/**
 * Response DTO for paginated deck list
 * GET /decks
 */
export interface DecksListResponse {
  data: DeckResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// ============================================================================
// FLASHCARD DTOs
// ============================================================================

/**
 * Source type for flashcards - where the card originated from
 */
export type FlashcardSource = Enums<"source_enum">;

/**
 * Command Model for creating a flashcard (manual, AI-generated, or AI-edited)
 * POST /flashcards
 */
export interface CreateFlashcardRequest {
  front: string; // Required, 1-1000 chars
  back: string; // Required, 1-1000 chars
  deckId?: string; // Optional deck assignment
  source?: FlashcardSource; // Defaults to 'manual'
}

/**
 * Response DTO for flashcard resource
 * Used in GET /flashcards, GET /flashcards/{cardId}, POST /flashcards
 */
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

/**
 * Command Model for updating a flashcard
 * PATCH /flashcards/{cardId}
 */
export interface UpdateFlashcardRequest {
  front?: string; // 1-1000 chars
  back?: string; // 1-1000 chars
  deckId?: string | null;
  source?: FlashcardSource;
}

/**
 * Response DTO for paginated flashcard list
 * GET /flashcards
 */
export interface FlashcardsListResponse {
  data: FlashcardResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// ============================================================================
// AI GENERATION DTOs
// ============================================================================

/**
 * Command Model for generating flashcards via AI
 * POST /flashcards/generate
 */
export interface GenerateFlashcardsRequest {
  deckId?: string; // Optional deck to assign generated cards to
  sourceText: string; // Required, 1000-10000 chars
  temperature?: number; // Optional override for AI model temperature
}

/**
 * Response DTO for AI generation request
 * POST /flashcards/generate - Returns 202 Accepted
 */
export interface GenerateFlashcardsResponse {
  batchId: string;
  estimatedCardCount: number;
}

/**
 * Status of an AI generation job
 */
export type GenerationStatus = "PENDING" | "SUCCESS" | "ERROR";

/**
 * Response DTO for a single AI generation job
 * GET /ai-generations/{generationId}
 */
export interface AiGenerationResponse {
  id: string;
  status: GenerationStatus;
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
  flashcards?: FlashcardResponse[]; // Associated generated flashcards
}

/**
 * Response DTO for generation batch with all jobs
 * GET /generation-batches/{batchId}
 */
export interface GenerationBatchResponse {
  id: string;
  userId: string;
  createdAt: string;
  generations: AiGenerationResponse[];
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED"; // Computed from generations
  completedCount: number; // Computed
  totalCount: number; // Computed
}

// ============================================================================
// REVIEW DTOs
// ============================================================================

/**
 * Command Model for submitting a flashcard review
 * POST /reviews
 */
export interface CreateReviewRequest {
  flashcardId: string;
  quality: number; // 0-5 (SM-2 quality score)
  latencyMs?: number; // Optional response time tracking
}

/**
 * Response DTO for review submission with updated scheduling
 * POST /reviews
 */
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

/**
 * Response DTO for review queue (due flashcards)
 * GET /reviews/queue
 */
export interface ReviewQueueResponse {
  data: FlashcardResponse[];
  totalDue: number;
}

// ============================================================================
// EVENT DTOs (Audit Log)
// ============================================================================

/**
 * Response DTO for audit event
 * GET /events
 */
export interface EventResponse {
  id: number;
  action: string; // 'accept', 'edit', 'delete'
  flashcardId: string;
  source: FlashcardSource;
  userId: string;
  createdAt: string;
}

/**
 * Response DTO for paginated events list
 * GET /events
 */
export interface EventsListResponse {
  data: EventResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// ============================================================================
// METRICS DTOs
// ============================================================================

/**
 * Response DTO for daily metrics
 * GET /metrics/daily
 */
export interface MetricsDailyResponse {
  metricDate: string;
  userId: string;
  cardsGenerated: number | null;
  cardsAccepted: number | null;
  acceptanceRate: number | null; // Percentage
  aiUsageRate: number | null; // Percentage
}

/**
 * Response DTO for metrics list with date range
 * GET /metrics/daily
 */
export interface MetricsDailyListResponse {
  data: MetricsDailyResponse[];
  summary: {
    totalCardsGenerated: number;
    totalCardsAccepted: number;
    averageAcceptanceRate: number;
    averageAiUsageRate: number;
  };
}

// ============================================================================
// BACKGROUND JOB DTOs
// ============================================================================

/**
 * Status of a background job
 */
export type BackgroundJobStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

/**
 * Command Model for creating a background job
 * POST /background-jobs
 */
export interface CreateBackgroundJobRequest {
  jobType: string; // e.g., 'HARD_DELETE_USER'
  payload: Record<string, unknown>;
}

/**
 * Response DTO for background job
 * GET /background-jobs/{jobId}
 */
export interface BackgroundJobResponse {
  id: string;
  jobType: string;
  status: BackgroundJobStatus;
  payload: Record<string, unknown>;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response DTO for paginated background jobs list
 * GET /background-jobs
 */
export interface BackgroundJobsListResponse {
  data: BackgroundJobResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// ============================================================================
// DATABASE ENTITY MAPPERS
// ============================================================================

/**
 * Helper type to map database tables to their Response DTOs
 * Useful for ensuring type safety in data layer transformations
 */
export type EntityToResponse<T extends keyof Database["public"]["Tables"]> = T extends "decks"
  ? DeckResponse
  : T extends "flashcards"
    ? FlashcardResponse
    : T extends "ai_generations"
      ? AiGenerationResponse
      : T extends "reviews"
        ? ReviewResponse
        : T extends "events"
          ? EventResponse
          : T extends "background_jobs"
            ? BackgroundJobResponse
            : never;

/**
 * Helper type to map database tables to their Insert DTOs
 * Useful for ensuring type safety in data layer transformations
 */
export type EntityToCreate<T extends keyof Database["public"]["Tables"]> = T extends "decks"
  ? CreateDeckRequest
  : T extends "flashcards"
    ? CreateFlashcardRequest
    : T extends "reviews"
      ? CreateReviewRequest
      : T extends "background_jobs"
        ? CreateBackgroundJobRequest
        : never;

// ============================================================================
// API ERROR RESPONSE
// ============================================================================

/**
 * Standard error response format
 * Used for 400, 401, 403, 404, 409, 429, 500 errors
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: {
      field?: string;
      message: string;
    }[];
  };
}

// ============================================================================
// ERROR LOGGING TYPES
// ============================================================================

/**
 * Payload for logging client-side errors to Supabase events table
 */
export interface ErrorLogPayload {
  path: string;
  message: string;
  stack?: string;
  userAgent: string;
  userId?: string;
  componentStack?: string | null;
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

/**
 * Query parameters for pagination
 */
export interface PaginationParams {
  page?: number; // Default: 1
  pageSize?: number; // Default: 20, max: 100
  cursor?: string; // Optional cursor for cursor-based pagination
}

/**
 * Query parameters for sorting
 */
export interface SortParams {
  sort?: string; // e.g., 'created_at', '-created_at' (prefix with '-' for DESC)
}

/**
 * Combined query parameters for list endpoints
 */
export interface ListQueryParams extends PaginationParams, SortParams {}
