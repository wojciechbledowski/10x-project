import { describe, it, expect, beforeEach, vi } from "vitest";
import { AiGenerationService } from "../aiGeneration.service";
import type { AiGenerationResponse } from "../../../types";
import { createMockSupabaseClient, createMockQueryResult, resetAllMocks, type MockSupabaseClient } from "./test-utils";

// Mock data helpers
const createMockGeneration = (overrides = {}): AiGenerationResponse => ({
  id: "gen-123",
  status: "SUCCESS" as const,
  modelName: "gpt-4o",
  modelVersion: "2024-08-06",
  temperature: 0.7,
  topP: null,
  config: { model: "gpt-4o", temperature: 0.7 },
  promptTokens: 150,
  completionTokens: 300,
  errorMessage: null,
  createdAt: "2025-10-09T12:00:05Z",
  deckId: "deck-789",
  generationBatchId: "batch-123",
  userId: "user-123",
  flashcards: [
    {
      id: "card-001",
      front: "What is photosynthesis?",
      back: "The process by which plants convert sunlight into energy",
      deckId: "deck-789",
      source: "ai" as const,
      easeFactor: 2.5,
      intervalDays: 0,
      repetition: 0,
      nextReviewAt: null,
      createdAt: "2025-10-09T12:00:10Z",
      updatedAt: "2025-10-09T12:00:10Z",
      userId: "user-123",
      deletedAt: null,
    },
  ],
  ...overrides,
});

const createMockBatchData = (generations: AiGenerationResponse[] = []) => ({
  id: "batch-123",
  user_id: "user-123",
  created_at: "2025-10-09T12:00:00Z",
  ai_generations: generations.map((gen) => ({
    id: gen.id,
    status: gen.status,
    model_name: gen.modelName,
    model_version: gen.modelVersion,
    temperature: gen.temperature,
    top_p: gen.topP,
    config: gen.config,
    prompt_tokens: gen.promptTokens,
    completion_tokens: gen.completionTokens,
    error_message: gen.errorMessage,
    created_at: gen.createdAt,
    deck_id: gen.deckId,
    generation_batch_id: gen.generationBatchId,
    user_id: gen.userId,
    card_generations: gen.flashcards
      ? gen.flashcards.map((card) => ({
          flashcards: {
            id: card.id,
            front: card.front,
            back: card.back,
            deck_id: card.deckId,
            source: card.source,
            ease_factor: card.easeFactor,
            interval_days: card.intervalDays,
            repetition: card.repetition,
            next_review_at: card.nextReviewAt,
            created_at: card.createdAt,
            updated_at: card.updatedAt,
            user_id: card.userId,
            deleted_at: card.deletedAt,
          },
        }))
      : [],
  })),
});

describe("AiGenerationService", () => {
  let mockSupabase: MockSupabaseClient;
  let service: AiGenerationService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new AiGenerationService(
      mockSupabase as unknown as import("../../../db/supabase.client").SupabaseServerClient
    );
    resetAllMocks(mockSupabase);
  });

  describe("getGenerationBatch", () => {
    it("should return batch with generations when batch exists", async () => {
      // Arrange
      const userId = "user-123";
      const batchId = "batch-123";
      const mockGeneration = createMockGeneration();
      const mockBatchData = createMockBatchData([mockGeneration]);

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(mockBatchData)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await service.getGenerationBatch(userId, batchId);

      // Assert
      expect(result).toEqual({
        id: "batch-123",
        userId: "user-123",
        createdAt: "2025-10-09T12:00:00Z",
        generations: [mockGeneration],
        status: "COMPLETED",
        completedCount: 1,
        totalCount: 1,
      });
      expect(mockSupabase.from).toHaveBeenCalledWith("generation_batches");
    });

    it("should return null when batch does not exist", async () => {
      // Arrange
      const userId = "user-123";
      const batchId = "non-existent-batch";

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(null, { code: "PGRST116" })),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await service.getGenerationBatch(userId, batchId);

      // Assert
      expect(result).toBeNull();
    });

    it("should throw error when database query fails", async () => {
      // Arrange
      const userId = "user-123";
      const batchId = "batch-123";
      const mockError = new Error("Database connection failed");

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(service.getGenerationBatch(userId, batchId)).rejects.toThrow(mockError);
    });

    it("should compute PENDING status when all generations are pending", async () => {
      // Arrange
      const userId = "user-123";
      const batchId = "batch-123";
      const pendingGeneration = createMockGeneration({ status: "PENDING" as const, flashcards: undefined });
      const mockBatchData = createMockBatchData([pendingGeneration]);

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(mockBatchData)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await service.getGenerationBatch(userId, batchId);

      // Assert
      expect(result?.status).toBe("PENDING");
      expect(result?.completedCount).toBe(0);
      expect(result?.totalCount).toBe(1);
    });

    it("should compute IN_PROGRESS status when some generations are complete", async () => {
      // Arrange
      const userId = "user-123";
      const batchId = "batch-123";
      const successGen = createMockGeneration({ status: "SUCCESS" as const });
      const pendingGen = createMockGeneration({
        id: "gen-456",
        status: "PENDING" as const,
        flashcards: undefined,
      });
      const mockBatchData = createMockBatchData([successGen, pendingGen]);

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(mockBatchData)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await service.getGenerationBatch(userId, batchId);

      // Assert
      expect(result?.status).toBe("IN_PROGRESS");
      expect(result?.completedCount).toBe(1);
      expect(result?.totalCount).toBe(2);
    });

    it("should compute FAILED status when errors exist and no pending generations", async () => {
      // Arrange
      const userId = "user-123";
      const batchId = "batch-123";
      const successGen = createMockGeneration({ status: "SUCCESS" as const });
      const errorGen = createMockGeneration({
        id: "gen-456",
        status: "ERROR" as const,
        flashcards: undefined,
        errorMessage: "Generation failed",
      });
      const mockBatchData = createMockBatchData([successGen, errorGen]);

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(mockBatchData)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await service.getGenerationBatch(userId, batchId);

      // Assert
      expect(result?.status).toBe("FAILED");
      expect(result?.completedCount).toBe(1);
      expect(result?.totalCount).toBe(2);
    });

    it("should handle generations without flashcards", async () => {
      // Arrange
      const userId = "user-123";
      const batchId = "batch-123";
      const generationWithoutCards = createMockGeneration({ flashcards: undefined });
      const mockBatchData = createMockBatchData([generationWithoutCards]);

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(mockBatchData)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await service.getGenerationBatch(userId, batchId);

      // Assert
      expect(result?.generations[0].flashcards).toBeUndefined();
    });

    it("should handle empty generation list", async () => {
      // Arrange
      const userId = "user-123";
      const batchId = "batch-123";
      const mockBatchData = createMockBatchData([]);

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(mockBatchData)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await service.getGenerationBatch(userId, batchId);

      // Assert
      expect(result?.status).toBe("PENDING");
      expect(result?.completedCount).toBe(0);
      expect(result?.totalCount).toBe(0);
    });
  });

  describe("computeBatchStatus", () => {
    it("should return PENDING when all generations are pending", () => {
      const generations = [
        createMockGeneration({ status: "PENDING" }),
        createMockGeneration({ status: "PENDING", id: "gen-2" }),
      ];

      const status = service.computeBatchStatus(generations);
      expect(status).toBe("PENDING");
    });

    it("should return COMPLETED when all generations are successful", () => {
      const generations = [
        createMockGeneration({ status: "SUCCESS" }),
        createMockGeneration({ status: "SUCCESS", id: "gen-2" }),
      ];

      const status = service.computeBatchStatus(generations);
      expect(status).toBe("COMPLETED");
    });

    it("should return IN_PROGRESS when mix of pending and success", () => {
      const generations = [
        createMockGeneration({ status: "SUCCESS" }),
        createMockGeneration({ status: "PENDING", id: "gen-2" }),
      ];

      const status = service.computeBatchStatus(generations);
      expect(status).toBe("IN_PROGRESS");
    });

    it("should return FAILED when errors exist and no pending", () => {
      const generations = [
        createMockGeneration({ status: "SUCCESS" }),
        createMockGeneration({ status: "ERROR", id: "gen-2" }),
      ];

      const status = service.computeBatchStatus(generations);
      expect(status).toBe("FAILED");
    });

    it("should return IN_PROGRESS when errors exist but pending also exist", () => {
      const generations = [
        createMockGeneration({ status: "ERROR" }),
        createMockGeneration({ status: "PENDING", id: "gen-2" }),
      ];

      const status = service.computeBatchStatus(generations);
      expect(status).toBe("IN_PROGRESS");
    });

    it("should return PENDING for empty generation list", () => {
      const generations: AiGenerationResponse[] = [];
      const status = service.computeBatchStatus(generations);
      expect(status).toBe("PENDING");
    });
  });

  describe("getGenerationWithFlashcards", () => {
    it("should return generation with flashcards when generation exists", async () => {
      const mockGenerationData = {
        id: "gen-123",
        status: "SUCCESS",
        model_name: "gpt-4o",
        model_version: "2024-08-06",
        temperature: 0.7,
        top_p: null,
        config: { model: "gpt-4o", temperature: 0.7 },
        prompt_tokens: 150,
        completion_tokens: 300,
        error_message: null,
        created_at: "2025-10-09T12:00:05Z",
        deck_id: "deck-789",
        generation_batch_id: "batch-123",
        user_id: "user-123",
        card_generations: [
          {
            flashcards: {
              id: "card-001",
              front: "What is photosynthesis?",
              back: "The process by which plants convert sunlight into energy",
              deck_id: "deck-789",
              source: "ai",
              ease_factor: 2.5,
              interval_days: 0,
              repetition: 0,
              next_review_at: null,
              created_at: "2025-10-09T12:00:10Z",
              updated_at: "2025-10-09T12:00:10Z",
              user_id: "user-123",
              deleted_at: null,
            },
          },
        ],
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(mockGenerationData)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await service.getGenerationWithFlashcards("user-123", "gen-123");

      expect(result).toEqual({
        id: "gen-123",
        status: "SUCCESS",
        modelName: "gpt-4o",
        modelVersion: "2024-08-06",
        temperature: 0.7,
        topP: null,
        config: { model: "gpt-4o", temperature: 0.7 },
        promptTokens: 150,
        completionTokens: 300,
        errorMessage: null,
        createdAt: "2025-10-09T12:00:05Z",
        deckId: "deck-789",
        generationBatchId: "batch-123",
        userId: "user-123",
        flashcards: [
          {
            id: "card-001",
            front: "What is photosynthesis?",
            back: "The process by which plants convert sunlight into energy",
            deckId: "deck-789",
            source: "ai",
            easeFactor: 2.5,
            intervalDays: 0,
            repetition: 0,
            nextReviewAt: null,
            createdAt: "2025-10-09T12:00:10Z",
            updatedAt: "2025-10-09T12:00:10Z",
            userId: "user-123",
            deletedAt: null,
          },
        ],
      });
    });

    it("should return generation without flashcards when none exist", async () => {
      const mockGenerationData = {
        id: "gen-123",
        status: "SUCCESS",
        model_name: "gpt-4o",
        model_version: "2024-08-06",
        temperature: 0.7,
        top_p: null,
        config: { model: "gpt-4o", temperature: 0.7 },
        prompt_tokens: 150,
        completion_tokens: 300,
        error_message: null,
        created_at: "2025-10-09T12:00:05Z",
        deck_id: "deck-789",
        generation_batch_id: "batch-123",
        user_id: "user-123",
        card_generations: [],
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(mockGenerationData)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await service.getGenerationWithFlashcards("user-123", "gen-123");

      expect(result?.flashcards).toBeUndefined();
    });

    it("should return null when generation does not exist", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(null, { code: "PGRST116" })),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await service.getGenerationWithFlashcards("user-123", "non-existent-gen");

      expect(result).toBeNull();
    });

    it("should throw error when database query fails", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(null, new Error("Database connection failed"))),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(service.getGenerationWithFlashcards("user-123", "gen-123")).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle null flashcard entries", async () => {
      const mockGenerationData = {
        id: "gen-123",
        status: "SUCCESS",
        model_name: "gpt-4o",
        model_version: "2024-08-06",
        temperature: 0.7,
        top_p: null,
        config: { model: "gpt-4o", temperature: 0.7 },
        prompt_tokens: 150,
        completion_tokens: 300,
        error_message: null,
        created_at: "2025-10-09T12:00:05Z",
        deck_id: "deck-789",
        generation_batch_id: "batch-123",
        user_id: "user-123",
        card_generations: [
          { flashcards: null },
          {
            flashcards: {
              id: "card-001",
              front: "What is photosynthesis?",
              back: "The process by which plants convert sunlight into energy",
              deck_id: "deck-789",
              source: "ai",
              ease_factor: 2.5,
              interval_days: 0,
              repetition: 0,
              next_review_at: null,
              created_at: "2025-10-09T12:00:10Z",
              updated_at: "2025-10-09T12:00:10Z",
              user_id: "user-123",
              deleted_at: null,
            },
          },
        ],
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockQueryResult(mockGenerationData)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await service.getGenerationWithFlashcards("user-123", "gen-123");

      expect(result?.flashcards).toHaveLength(1);
      expect(result?.flashcards?.[0]?.id).toBe("card-001");
    });
  });

  describe("retryGeneration", () => {
    const mockErrorGeneration = {
      id: "gen-error",
      status: "ERROR",
      model_name: "gpt-4o",
      model_version: "2024-08-06",
      temperature: 0.7,
      top_p: null,
      config: { model: "gpt-4o", temperature: 0.7 },
      deck_id: "deck-789",
      generation_batch_id: "batch-123",
      user_id: "user-123",
    };

    const mockNewGeneration = {
      id: "gen-new",
      status: "PENDING",
      model_name: "gpt-4o",
      model_version: "2024-08-06",
      temperature: 0.7,
      top_p: null,
      config: { model: "gpt-4o", temperature: 0.7 },
      prompt_tokens: null,
      completion_tokens: null,
      error_message: null,
      created_at: "2025-10-09T12:05:00Z",
      deck_id: "deck-789",
      generation_batch_id: "batch-123",
      user_id: "user-123",
    };

    it("should successfully retry an ERROR generation", async () => {
      // Mock the original generation fetch
      mockSupabase
        .from("ai_generations")
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce(createMockQueryResult(mockErrorGeneration));

      // Mock the new generation insert
      mockSupabase
        .from("ai_generations")
        .insert()
        .select()
        .single.mockResolvedValueOnce(createMockQueryResult(mockNewGeneration));

      const result = await service.retryGeneration("user-123", "gen-error");

      expect(result).toEqual({
        id: "gen-new",
        status: "PENDING",
        modelName: "gpt-4o",
        modelVersion: "2024-08-06",
        temperature: 0.7,
        topP: null,
        config: { model: "gpt-4o", temperature: 0.7 },
        promptTokens: null,
        completionTokens: null,
        errorMessage: null,
        createdAt: "2025-10-09T12:05:00Z",
        deckId: "deck-789",
        generationBatchId: "batch-123",
        userId: "user-123",
      });

      // Verify the insert was called with correct data
      expect(mockSupabase.from("ai_generations").insert).toHaveBeenCalledWith({
        user_id: "user-123",
        status: "PENDING",
        model_name: "gpt-4o",
        model_version: "2024-08-06",
        temperature: 0.7,
        top_p: null,
        config: { model: "gpt-4o", temperature: 0.7 },
        deck_id: "deck-789",
        generation_batch_id: "batch-123",
      });
    });

    it("should throw GENERATION_NOT_FOUND when generation does not exist", async () => {
      mockSupabase
        .from("ai_generations")
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce(createMockQueryResult(null, { code: "PGRST116", message: "Not found" }));

      await expect(service.retryGeneration("user-123", "gen-missing")).rejects.toThrow("GENERATION_NOT_FOUND");
    });

    it("should throw INVALID_STATUS when generation is not in ERROR status", async () => {
      const mockSuccessGeneration = { ...mockErrorGeneration, status: "SUCCESS" };

      mockSupabase
        .from("ai_generations")
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce(createMockQueryResult(mockSuccessGeneration));

      await expect(service.retryGeneration("user-123", "gen-success")).rejects.toThrow("INVALID_STATUS");
    });

    it("should throw error when database insert fails", async () => {
      mockSupabase
        .from("ai_generations")
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce(createMockQueryResult(mockErrorGeneration));

      mockSupabase
        .from("ai_generations")
        .insert()
        .select()
        .single.mockResolvedValueOnce(createMockQueryResult(null, { message: "Insert failed" }));

      await expect(service.retryGeneration("user-123", "gen-error")).rejects.toThrow();
    });
  });

  describe("createGenerationBatch", () => {
    it("should create a generation batch successfully", async () => {
      const userId = "user-123";
      const mockBatchId = "batch-456";

      // Mock the insert query
      const mockInsertQuery = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(createMockQueryResult({ id: mockBatchId })),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsertQuery,
      });

      const result = await service.createGenerationBatch(userId);

      expect(result).toBe(mockBatchId);
      expect(mockSupabase.from).toHaveBeenCalledWith("generation_batches");
      expect(mockInsertQuery).toHaveBeenCalledWith({
        user_id: userId,
      });
    });

    it("should throw error when database insert fails", async () => {
      const userId = "user-123";
      const dbError = new Error("Database connection failed");

      const mockInsertQuery = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(createMockQueryResult(null, dbError)),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsertQuery,
      });

      await expect(service.createGenerationBatch(userId)).rejects.toThrow(dbError);
    });
  });

  describe("createAiGeneration", () => {
    const mockRequest = {
      sourceText: "A".repeat(2000),
      deckId: "deck-789",
      temperature: 1.2,
    };

    it("should create an AI generation record successfully", async () => {
      const userId = "user-123";
      const batchId = "batch-456";
      const mockGenerationId = "gen-789";

      const mockInsertQuery = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(createMockQueryResult({ id: mockGenerationId })),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsertQuery,
      });

      const result = await service.createAiGeneration(userId, batchId, mockRequest);

      expect(result).toBe(mockGenerationId);
      expect(mockSupabase.from).toHaveBeenCalledWith("ai_generations");

      const insertData = mockInsertQuery.mock.calls[0][0];
      expect(insertData).toEqual({
        user_id: userId,
        generation_batch_id: batchId,
        deck_id: mockRequest.deckId,
        status: "PENDING",
        model_name: "openai/gpt-4o-mini",
        temperature: mockRequest.temperature,
        top_p: null,
        config: expect.objectContaining({
          sourceTextLength: mockRequest.sourceText.length,
          estimatedCardCount: expect.any(Number),
          prompt: expect.any(String),
        }),
        error_message: null,
        prompt_tokens: null,
        completion_tokens: null,
      });
    });

    it("should create AI generation without deckId when not provided", async () => {
      const userId = "user-123";
      const batchId = "batch-456";
      const mockGenerationId = "gen-789";
      const requestWithoutDeck = {
        sourceText: "Some text",
        temperature: 0.7,
      };

      const mockInsertQuery = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(createMockQueryResult({ id: mockGenerationId })),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsertQuery,
      });

      const result = await service.createAiGeneration(userId, batchId, requestWithoutDeck);

      expect(result).toBe(mockGenerationId);
      const insertData = mockInsertQuery.mock.calls[0][0];
      expect(insertData.deck_id).toBeNull();
    });

    it("should throw error when database insert fails", async () => {
      const userId = "user-123";
      const batchId = "batch-456";
      const dbError = new Error("Database connection failed");

      const mockInsertQuery = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(createMockQueryResult(null, dbError)),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsertQuery,
      });

      await expect(service.createAiGeneration(userId, batchId, mockRequest)).rejects.toThrow(dbError);
    });
  });

  describe("validateDeckOwnership", () => {
    it("should return true when user owns the deck", async () => {
      const userId = "user-123";
      const deckId = "deck-789";

      const mockSelectQuery = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(createMockQueryResult({ id: deckId })),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelectQuery,
      });

      const result = await service.validateDeckOwnership(userId, deckId);

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("decks");
    });

    it("should return false when deck does not exist", async () => {
      const userId = "user-123";
      const deckId = "deck-999";

      const mockSelectQuery = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(createMockQueryResult(null, { code: "PGRST116" })),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelectQuery,
      });

      const result = await service.validateDeckOwnership(userId, deckId);

      expect(result).toBe(false);
    });

    it("should return false when user does not own the deck", async () => {
      const userId = "user-123";
      const deckId = "deck-789";

      const mockSelectQuery = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(createMockQueryResult(null, { code: "PGRST116" })),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelectQuery,
      });

      const result = await service.validateDeckOwnership(userId, deckId);

      expect(result).toBe(false);
    });

    it("should throw error when database query fails", async () => {
      const userId = "user-123";
      const deckId = "deck-789";
      const dbError = new Error("Database connection failed");

      const mockSelectQuery = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(createMockQueryResult(null, dbError)),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelectQuery,
      });

      await expect(service.validateDeckOwnership(userId, deckId)).rejects.toThrow(dbError);
    });
  });

  describe("createAiProcessingJob", () => {
    const mockRequest = {
      sourceText: "Some text to generate flashcards from",
      temperature: 0.7,
      deckId: "deck-789",
    };

    it("should create a background job successfully", async () => {
      const generationId = "gen-123";
      const mockJobId = "job-456";

      const mockInsertQuery = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(createMockQueryResult({ id: mockJobId })),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsertQuery,
      });

      const result = await service.createAiProcessingJob(generationId, mockRequest);

      expect(result).toBe(mockJobId);
      expect(mockSupabase.from).toHaveBeenCalledWith("background_jobs");

      const insertData = mockInsertQuery.mock.calls[0][0];
      expect(insertData).toEqual({
        job_type: "ai_flashcard_generation",
        status: "pending",
        payload: expect.objectContaining({
          generationId,
          sourceText: mockRequest.sourceText,
          temperature: mockRequest.temperature,
          deckId: mockRequest.deckId,
          model: "openai/gpt-4o-mini",
          maxTokens: 4000,
          responseFormat: expect.any(Object),
          messages: expect.any(Array),
        }),
        retry_count: 0,
        last_error: null,
      });
    });

    it("should create job without deckId when not provided", async () => {
      const generationId = "gen-123";
      const mockJobId = "job-456";
      const requestWithoutDeck = {
        sourceText: "Some text",
        temperature: 0.7,
      };

      const mockInsertQuery = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(createMockQueryResult({ id: mockJobId })),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsertQuery,
      });

      const result = await service.createAiProcessingJob(generationId, requestWithoutDeck);

      expect(result).toBe(mockJobId);
      const insertData = mockInsertQuery.mock.calls[0][0];
      expect(insertData.payload.deckId).toBeUndefined();
    });

    it("should throw error when database insert fails", async () => {
      const generationId = "gen-123";
      const dbError = new Error("Database connection failed");

      const mockInsertQuery = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(createMockQueryResult(null, dbError)),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsertQuery,
      });

      await expect(service.createAiProcessingJob(generationId, mockRequest)).rejects.toThrow(dbError);
    });
  });
});
