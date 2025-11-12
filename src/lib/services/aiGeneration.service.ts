import type { Json } from "@/db/database.types";
import type { SupabaseServerClient } from "../../db/supabase.client";
import type {
  GenerationBatchResponse,
  AiGenerationResponse,
  FlashcardResponse,
  GenerateFlashcardsRequest,
} from "../../types";
import type { OpenRouterService } from "@/lib/openrouter/service";
import { ConsoleLogger } from "@/lib/utils/logger";

/**
 * Service for managing AI generation operations
 */
export class AiGenerationService {
  private readonly logger = new ConsoleLogger("AiGenerationService");

  constructor(
    private readonly supabase: SupabaseServerClient,
    private readonly openRouterService?: OpenRouterService
  ) {}

  /**
   * Retrieves a single AI generation with its associated flashcards
   * @param userId The authenticated user's ID
   * @param generationId The generation ID to retrieve
   * @returns The AI generation with associated flashcards, or null if not found
   */
  async getGenerationWithFlashcards(userId: string, generationId: string): Promise<AiGenerationResponse | null> {
    this.logger.info("Retrieving AI generation", { userId, generationId });

    // Fetch generation with associated flashcards via junction table
    const { data, error } = await this.supabase
      .from("ai_generations")
      .select(
        `
        id,
        status,
        model_name,
        model_version,
        temperature,
        top_p,
        config,
        prompt_tokens,
        completion_tokens,
        error_message,
        created_at,
        deck_id,
        generation_batch_id,
        user_id,
        card_generations (
          flashcards (
            id,
            front,
            back,
            deck_id,
            source,
            ease_factor,
            interval_days,
            repetition,
            next_review_at,
            created_at,
            updated_at,
            user_id,
            deleted_at
          )
        )
      `
      )
      .eq("id", generationId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Row not found
        this.logger.info("AI generation not found", { userId, generationId });
        return null;
      }
      this.logger.error("Database error retrieving AI generation", {
        userId,
        generationId,
        error: error.message,
      });
      throw error;
    }

    if (!data) {
      this.logger.info("AI generation not found", { userId, generationId });
      return null;
    }

    // Transform the data to match our response types
    const generation = data as {
      id: string;
      status: string;
      model_name: string;
      model_version: string | null;
      temperature: number | null;
      top_p: number | null;
      config: Record<string, unknown>;
      prompt_tokens: number | null;
      completion_tokens: number | null;
      error_message: string | null;
      created_at: string;
      deck_id: string | null;
      generation_batch_id: string | null;
      user_id: string;
      card_generations:
        | {
            flashcards: {
              id: string;
              front: string;
              back: string;
              deck_id: string | null;
              source: string;
              ease_factor: number;
              interval_days: number;
              repetition: number;
              next_review_at: string | null;
              created_at: string;
              updated_at: string;
              user_id: string;
              deleted_at: string | null;
            } | null;
          }[]
        | null;
    };

    // Extract flashcards from the junction table
    const flashcards: FlashcardResponse[] = (generation.card_generations || [])
      .filter((cg): cg is typeof cg & { flashcards: NonNullable<typeof cg.flashcards> } => cg.flashcards !== null)
      .map((cg) => ({
        id: cg.flashcards.id,
        front: cg.flashcards.front,
        back: cg.flashcards.back,
        deckId: cg.flashcards.deck_id,
        source: cg.flashcards.source as "ai" | "manual" | "ai_edited",
        easeFactor: cg.flashcards.ease_factor,
        intervalDays: cg.flashcards.interval_days,
        repetition: cg.flashcards.repetition,
        nextReviewAt: cg.flashcards.next_review_at,
        createdAt: cg.flashcards.created_at,
        updatedAt: cg.flashcards.updated_at,
        userId: cg.flashcards.user_id,
        deletedAt: cg.flashcards.deleted_at,
      }));

    const result: AiGenerationResponse = {
      id: generation.id,
      status: generation.status as "PENDING" | "SUCCESS" | "ERROR",
      modelName: generation.model_name,
      modelVersion: generation.model_version,
      temperature: generation.temperature,
      topP: generation.top_p,
      config: generation.config as Json,
      promptTokens: generation.prompt_tokens,
      completionTokens: generation.completion_tokens,
      errorMessage: generation.error_message,
      createdAt: generation.created_at,
      deckId: generation.deck_id,
      generationBatchId: generation.generation_batch_id,
      userId: generation.user_id,
      flashcards: flashcards.length > 0 ? flashcards : undefined,
    };

    this.logger.info("AI generation retrieved successfully", {
      userId,
      generationId,
      status: result.status,
      flashcardCount: flashcards.length,
    });

    return result;
  }

  /**
   * Retrieves a generation batch with all its associated generations and flashcards
   * @param userId The authenticated user's ID
   * @param batchId The batch ID to retrieve
   * @returns The generation batch with computed status, or null if not found
   */
  async getGenerationBatch(userId: string, batchId: string): Promise<GenerationBatchResponse | null> {
    this.logger.info("Retrieving generation batch", { userId, batchId });

    // Fetch batch metadata and all associated generations with flashcards in one query
    const { data, error } = await this.supabase
      .from("generation_batches")
      .select(
        `
        id,
        user_id,
        created_at,
        ai_generations (
          id,
          status,
          model_name,
          model_version,
          temperature,
          top_p,
          config,
          prompt_tokens,
          completion_tokens,
          error_message,
          created_at,
          deck_id,
          generation_batch_id,
          user_id,
          card_generations (
            flashcards (
              id,
              front,
              back,
              deck_id,
              source,
              ease_factor,
              interval_days,
              repetition,
              next_review_at,
              created_at,
              updated_at,
              user_id,
              deleted_at
            )
          )
        )
      `
      )
      .eq("id", batchId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Row not found
        this.logger.info("Generation batch not found", { userId, batchId });
        return null;
      }
      this.logger.error("Database error retrieving generation batch", {
        userId,
        batchId,
        error: error.message,
      });
      throw error;
    }

    if (!data) {
      this.logger.info("Generation batch not found", { userId, batchId });
      return null;
    }

    // Transform the data to match our response types
    const batch = data as {
      id: string;
      user_id: string;
      created_at: string;
      ai_generations: {
        id: string;
        status: string;
        model_name: string;
        model_version: string | null;
        temperature: number | null;
        top_p: number | null;
        config: Record<string, unknown>;
        prompt_tokens: number | null;
        completion_tokens: number | null;
        error_message: string | null;
        created_at: string;
        deck_id: string | null;
        generation_batch_id: string | null;
        user_id: string;
        card_generations:
          | {
              flashcards: {
                id: string;
                front: string;
                back: string;
                deck_id: string | null;
                source: string;
                ease_factor: number;
                interval_days: number;
                repetition: number;
                next_review_at: string | null;
                created_at: string;
                updated_at: string;
                user_id: string;
                deleted_at: string | null;
              } | null;
            }[]
          | null;
      }[];
    };

    // Transform generations and compute batch status
    const generations: AiGenerationResponse[] = batch.ai_generations.map((gen) => {
      // Extract flashcards from the junction table
      const flashcards: FlashcardResponse[] = (gen.card_generations || [])
        .filter((cg): cg is typeof cg & { flashcards: NonNullable<typeof cg.flashcards> } => cg.flashcards !== null)
        .map((cg) => ({
          id: cg.flashcards.id,
          front: cg.flashcards.front,
          back: cg.flashcards.back,
          deckId: cg.flashcards.deck_id,
          source: cg.flashcards.source as "ai" | "manual" | "ai_edited",
          easeFactor: cg.flashcards.ease_factor,
          intervalDays: cg.flashcards.interval_days,
          repetition: cg.flashcards.repetition,
          nextReviewAt: cg.flashcards.next_review_at,
          createdAt: cg.flashcards.created_at,
          updatedAt: cg.flashcards.updated_at,
          userId: cg.flashcards.user_id,
          deletedAt: cg.flashcards.deleted_at,
        }));

      return {
        id: gen.id,
        status: gen.status as "PENDING" | "SUCCESS" | "ERROR",
        modelName: gen.model_name,
        modelVersion: gen.model_version,
        temperature: gen.temperature,
        topP: gen.top_p,
        config: gen.config as Json,
        promptTokens: gen.prompt_tokens,
        completionTokens: gen.completion_tokens,
        errorMessage: gen.error_message,
        createdAt: gen.created_at,
        deckId: gen.deck_id,
        generationBatchId: gen.generation_batch_id,
        userId: gen.user_id,
        flashcards: flashcards.length > 0 ? flashcards : undefined,
      };
    });

    // Compute batch status based on individual generation statuses
    const batchStatus = this.computeBatchStatus(generations);
    const completedCount = generations.filter((gen) => gen.status === "SUCCESS").length;
    const totalCount = generations.length;

    const result: GenerationBatchResponse = {
      id: batch.id,
      userId: batch.user_id,
      createdAt: batch.created_at,
      generations,
      status: batchStatus,
      completedCount,
      totalCount,
    };

    this.logger.info("Generation batch retrieved successfully", {
      userId,
      batchId,
      status: batchStatus,
      completedCount,
      totalCount,
    });

    return result;
  }

  /**
   * Retries a failed AI generation by creating a new generation record
   * @param userId The authenticated user's ID
   * @param generationId The ID of the failed generation to retry
   * @returns The new generation record with PENDING status
   */
  async retryGeneration(userId: string, generationId: string): Promise<AiGenerationResponse> {
    this.logger.info("Retrying AI generation", { userId, generationId });

    // Fetch the original generation to validate and extract parameters
    const { data: originalGeneration, error: fetchError } = await this.supabase
      .from("ai_generations")
      .select(
        `
        id,
        status,
        model_name,
        model_version,
        temperature,
        top_p,
        config,
        deck_id,
        generation_batch_id,
        user_id
      `
      )
      .eq("id", generationId)
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        // Row not found
        this.logger.info("AI generation not found for retry", { userId, generationId });
        throw new Error("GENERATION_NOT_FOUND");
      }
      this.logger.error("Database error retrieving generation for retry", {
        userId,
        generationId,
        error: fetchError.message,
      });
      throw fetchError;
    }

    if (!originalGeneration) {
      this.logger.info("AI generation not found for retry", { userId, generationId });
      throw new Error("GENERATION_NOT_FOUND");
    }

    // Validate that the generation is in ERROR status
    if (originalGeneration.status !== "ERROR") {
      this.logger.warn("Cannot retry generation with non-ERROR status", {
        userId,
        generationId,
        currentStatus: originalGeneration.status,
      });
      throw new Error("INVALID_STATUS");
    }

    // Create new generation record with same parameters
    const { data: newGeneration, error: insertError } = await this.supabase
      .from("ai_generations")
      .insert({
        user_id: userId,
        status: "PENDING",
        model_name: originalGeneration.model_name,
        model_version: originalGeneration.model_version,
        temperature: originalGeneration.temperature,
        top_p: originalGeneration.top_p,
        config: originalGeneration.config,
        deck_id: originalGeneration.deck_id,
        generation_batch_id: originalGeneration.generation_batch_id,
      })
      .select(
        `
        id,
        status,
        model_name,
        model_version,
        temperature,
        top_p,
        config,
        prompt_tokens,
        completion_tokens,
        error_message,
        created_at,
        deck_id,
        generation_batch_id,
        user_id
      `
      )
      .single();

    if (insertError) {
      this.logger.error("Failed to create retry generation", {
        userId,
        originalGenerationId: generationId,
        error: insertError.message,
      });
      throw insertError;
    }

    if (!newGeneration) {
      this.logger.error("No data returned when creating retry generation", {
        userId,
        originalGenerationId: generationId,
      });
      throw new Error("RETRY_CREATION_FAILED");
    }

    // Transform to response format
    const result: AiGenerationResponse = {
      id: newGeneration.id,
      status: newGeneration.status as "PENDING" | "SUCCESS" | "ERROR",
      modelName: newGeneration.model_name,
      modelVersion: newGeneration.model_version,
      temperature: newGeneration.temperature,
      topP: newGeneration.top_p,
      config: newGeneration.config as Json,
      promptTokens: newGeneration.prompt_tokens,
      completionTokens: newGeneration.completion_tokens,
      errorMessage: newGeneration.error_message,
      createdAt: newGeneration.created_at,
      deckId: newGeneration.deck_id,
      generationBatchId: newGeneration.generation_batch_id,
      userId: newGeneration.user_id,
      // No flashcards for PENDING status
    };

    this.logger.info("AI generation retry created successfully", {
      userId,
      originalGenerationId: generationId,
      newGenerationId: result.id,
    });

    return result;
  }

  /**
   * Computes the overall batch status based on individual generation statuses
   * @param generations Array of AI generation responses
   * @returns The computed batch status
   */
  // Made public for testing purposes
  computeBatchStatus(generations: AiGenerationResponse[]): "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" {
    if (generations.length === 0) {
      return "PENDING";
    }

    const statusCounts = generations.reduce(
      (counts, gen) => {
        counts[gen.status] = (counts[gen.status] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    );

    const pendingCount = statusCounts.PENDING || 0;
    const errorCount = statusCounts.ERROR || 0;
    const successCount = statusCounts.SUCCESS || 0;
    const totalCount = generations.length;

    // PENDING: All generations have status "PENDING"
    if (pendingCount === totalCount) {
      return "PENDING";
    }

    // COMPLETED: All generations have status "SUCCESS"
    if (successCount === totalCount) {
      return "COMPLETED";
    }

    // FAILED: At least one generation has status "ERROR" and none are "PENDING"
    if (errorCount > 0 && pendingCount === 0) {
      return "FAILED";
    }

    // IN_PROGRESS: At least one generation is "PENDING" or "SUCCESS", but not all are complete
    return "IN_PROGRESS";
  }

  /**
   * Creates a new generation batch for the user
   * @param userId The authenticated user's ID
   * @returns The ID of the created generation batch
   */
  async createGenerationBatch(userId: string): Promise<string> {
    this.logger.info("Creating generation batch", { userId });

    const { data, error } = await this.supabase
      .from("generation_batches")
      .insert({
        user_id: userId,
      })
      .select("id")
      .single();

    if (error) {
      this.logger.error("Failed to create generation batch", {
        userId,
        error: error.message,
      });
      throw error;
    }

    this.logger.info("Generation batch created", { userId, batchId: data.id });
    return data.id;
  }

  /**
   * Creates an initial AI generation record for flashcard generation
   * @param userId The authenticated user's ID
   * @param batchId The generation batch ID
   * @param request The validated generation request
   * @returns The ID of the created AI generation
   */
  async createAiGeneration(userId: string, batchId: string, request: GenerateFlashcardsRequest): Promise<string> {
    this.logger.info("Creating AI generation", { userId, batchId });

    // Estimate card count based on text length
    // Rough estimate: ~150-250 words per card, ~5-8 chars per word average
    const estimatedCards = Math.max(1, Math.min(20, Math.floor(request.sourceText.length / 1000)));

    const { data, error } = await this.supabase
      .from("ai_generations")
      .insert({
        user_id: userId,
        generation_batch_id: batchId,
        deck_id: request.deckId || null,
        status: "PENDING",
        model_name: "microsoft/wizardlm-2-8x22b", // Free model
        temperature: request.temperature,
        top_p: null, // Not used with temperature
        config: {
          sourceTextLength: request.sourceText.length,
          estimatedCardCount: estimatedCards,
          prompt: this.buildGenerationPrompt(request.sourceText),
        },
        error_message: null,
        prompt_tokens: null,
        completion_tokens: null,
      })
      .select("id")
      .single();

    if (error) {
      this.logger.error("Failed to create AI generation", {
        userId,
        batchId,
        error: error.message,
      });
      throw error;
    }

    this.logger.info("AI generation created", {
      userId,
      batchId,
      generationId: data.id,
      estimatedCards,
    });
    return data.id;
  }

  /**
   * Validates that a deck exists and belongs to the user (if deckId provided)
   * @param userId The authenticated user's ID
   * @param deckId The deck ID to validate
   * @returns True if deck exists and belongs to user, false otherwise
   */
  async validateDeckOwnership(userId: string, deckId: string): Promise<boolean> {
    this.logger.info("Validating deck ownership", { userId, deckId });

    const { data, error } = await this.supabase
      .from("decks")
      .select("id")
      .eq("id", deckId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Row not found
        this.logger.info("Deck not found or not owned by user", { userId, deckId });
        return false;
      }
      this.logger.error("Database error validating deck ownership", {
        userId,
        deckId,
        error: error.message,
      });
      throw error;
    }

    this.logger.info("Deck ownership validated", { userId, deckId });
    return !!data;
  }

  /**
   * Creates a background job to process the AI generation
   * @param generationId The AI generation ID to process
   * @param request The validated generation request
   * @returns The ID of the created background job
   */
  async createAiProcessingJob(generationId: string, request: GenerateFlashcardsRequest): Promise<string> {
    this.logger.info("Creating AI processing background job", { generationId });

    const jobPayload = {
      generationId,
      sourceText: request.sourceText,
      temperature: request.temperature,
      deckId: request.deckId,
      model: "microsoft/wizardlm-2-8x22b",
      maxTokens: 4000, // Reserve tokens for response
      responseFormat: {
        type: "json_schema" as const,
        json_schema: {
          name: "flashcard_array",
          schema: {
            type: "object",
            properties: {
              flashcards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    front: { type: "string" },
                    back: { type: "string" },
                  },
                  required: ["front", "back"],
                },
              },
            },
            required: ["flashcards"],
          },
        },
      },
      messages: [
        {
          role: "user" as const,
          content: this.buildGenerationPrompt(request.sourceText),
        },
      ],
    };

    const { data, error } = await this.supabase
      .from("background_jobs")
      .insert({
        job_type: "ai_flashcard_generation",
        status: "QUEUED",
        payload: jobPayload,
        retry_count: 0,
        last_error: null,
      })
      .select("id")
      .single();

    if (error) {
      this.logger.error("Failed to create background job", {
        generationId,
        error: error.message,
      });
      throw error;
    }

    this.logger.info("Background job created", {
      generationId,
      jobId: data.id,
    });
    return data.id;
  }

  /**
   * Generates flashcards synchronously using OpenRouter API and creates AI generation record
   * @param userId The authenticated user's ID
   * @param request The validated generation request
   * @param batchId The generation batch ID
   * @returns The generation ID for the created flashcards
   */
  async generateFlashcardsSynchronously(
    userId: string,
    request: GenerateFlashcardsRequest,
    batchId: string
  ): Promise<string> {
    this.logger.info("Generating flashcards synchronously", {
      userId,
      deckId: request.deckId,
      sourceTextLength: request.sourceText.length,
    });

    // Create AI generation record first
    const generationId = await this.createAiGeneration(userId, batchId, request);

    // Build the generation prompt
    const prompt = this.buildGenerationPrompt(request.sourceText);

    // Call OpenRouter API
    if (!this.openRouterService) {
      throw new Error("OpenRouterService not provided to AiGenerationService");
    }
    const openRouterService = this.openRouterService;

    const response = await openRouterService.chat(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        model: "microsoft/wizardlm-2-8x22b",
        params: {
          temperature: request.temperature ?? 0.7,
        },
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "flashcard_generation",
            schema: {
              type: "object",
              properties: {
                flashcards: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      front: { type: "string", minLength: 1, maxLength: 1000 },
                      back: { type: "string", minLength: 1, maxLength: 1000 },
                    },
                    required: ["front", "back"],
                  },
                },
              },
              required: ["flashcards"],
            },
            strict: true,
          },
        },
      }
    );

    // Parse the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in OpenRouter response");
    }

    const contentString = typeof content === "string" ? content : JSON.stringify(content);

    let parsedResponse;
    try {
      // Clean markdown code blocks if present
      let jsonString = contentString.trim();
      if (jsonString.startsWith("```json") && jsonString.endsWith("```")) {
        jsonString = jsonString.slice(7, -3).trim();
      } else if (jsonString.startsWith("```") && jsonString.endsWith("```")) {
        jsonString = jsonString.slice(3, -3).trim();
      }

      parsedResponse = JSON.parse(jsonString);
    } catch (error) {
      this.logger.error("Failed to parse OpenRouter response", {
        content: contentString,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid response format from AI service");
    }

    // Handle both array format and object with flashcards property
    let flashcards;
    if (Array.isArray(parsedResponse)) {
      flashcards = parsedResponse;
    } else if (parsedResponse.flashcards && Array.isArray(parsedResponse.flashcards)) {
      flashcards = parsedResponse.flashcards;
    } else {
      flashcards = [];
    }

    // Validate and prepare flashcards for review
    const validFlashcards = flashcards
      .filter((card: { front?: unknown; back?: unknown }) => card.front && card.back)
      .map((card: { front: unknown; back: unknown }) => ({
        front: String(card.front).trim(),
        back: String(card.back).trim(),
      }))
      .filter(
        (card: { front: string; back: string }) =>
          card.front.length > 0 && card.back.length > 0 && card.front.length <= 1000 && card.back.length <= 1000
      );

    // Store generated flashcards in the ai_generation record as JSON for review
    await this.supabase
      .from("ai_generations")
      .update({
        generated_data: {
          flashcards: validFlashcards,
        },
        status: "SUCCESS",
        completed_at: new Date().toISOString(),
      })
      .eq("id", generationId);

    this.logger.info("Flashcards generated successfully", {
      userId,
      generationId,
      generatedCount: validFlashcards.length,
    });

    return generationId;
  }

  /**
   * Generate flashcards directly and return them without storing in database
   * @param userId The user ID
   * @param request The generation request
   * @returns Array of generated flashcards
   */
  async generateFlashcardsDirect(
    userId: string,
    request: GenerateFlashcardsRequest
  ): Promise<{ front: string; back: string }[]> {
    this.logger.info("Generating flashcards directly", {
      userId,
      deckId: request.deckId,
      sourceTextLength: request.sourceText.length,
    });

    // Build the generation prompt
    const prompt = this.buildGenerationPrompt(request.sourceText);

    // Call OpenRouter API
    if (!this.openRouterService) {
      throw new Error("OpenRouterService not provided to AiGenerationService");
    }
    const openRouterService = this.openRouterService;

    const response = await openRouterService.chat(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        params: {
          max_tokens: 4000,
          temperature: 0.7,
        },
      }
    );

    // Parse the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in OpenRouter response");
    }

    const contentString = typeof content === "string" ? content : JSON.stringify(content);

    let parsedResponse;
    try {
      // Clean markdown code blocks if present
      let jsonString = contentString.trim();
      if (jsonString.startsWith("```json") && jsonString.endsWith("```")) {
        jsonString = jsonString.slice(7, -3).trim();
      } else if (jsonString.startsWith("```") && jsonString.endsWith("```")) {
        jsonString = jsonString.slice(3, -3).trim();
      }

      parsedResponse = JSON.parse(jsonString);
    } catch (error) {
      this.logger.error("Failed to parse OpenRouter response", {
        content: contentString,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid response format from AI service");
    }

    // Handle both array format and object with flashcards property
    let flashcards;
    if (Array.isArray(parsedResponse)) {
      flashcards = parsedResponse;
    } else if (parsedResponse.flashcards && Array.isArray(parsedResponse.flashcards)) {
      flashcards = parsedResponse.flashcards;
    } else {
      flashcards = [];
    }

    // Validate and prepare flashcards for review
    const validFlashcards = flashcards
      .filter((card: { front?: unknown; back?: unknown }) => card.front && card.back)
      .map((card: { front: unknown; back: unknown }) => ({
        front: String(card.front).trim(),
        back: String(card.back).trim(),
      }))
      .filter(
        (card: { front: string; back: string }) =>
          card.front.length > 0 && card.back.length > 0 && card.front.length <= 1000 && card.back.length <= 1000
      );

    this.logger.info("Flashcards generated successfully", {
      userId,
      generatedCount: validFlashcards.length,
    });

    return validFlashcards;
  }

  /**
   * Builds the prompt for AI flashcard generation
   * @param sourceText The source text to generate flashcards from
   * @returns The formatted prompt string
   */
  private buildGenerationPrompt(sourceText: string): string {
    return `Please analyze the following text and generate high-quality flashcards for learning and memorization.

TEXT TO ANALYZE:
${sourceText}

INSTRUCTIONS:
1. Create flashcards that cover the key concepts, facts, and relationships in the text
2. Each flashcard should have a clear, concise question or prompt on the front
3. The back should contain the complete, accurate answer or explanation
4. Focus on important information that would be valuable to remember
5. Use simple, direct language appropriate for the subject matter
6. Generate between 3-15 flashcards depending on the text length and complexity
7. Ensure flashcards are self-contained and don't require external context
8. Cover both factual knowledge and conceptual understanding
9. Include definitions, examples, and relationships where relevant

Return your response as a JSON array of flashcard objects. Each object must have exactly two properties: "front" and "back". Do not include any other text, markdown, or formatting in your response.

Example format:
[
  {
    "front": "What is the capital of France?",
    "back": "Paris"
  },
  {
    "front": "What is 2 + 2?",
    "back": "4"
  }
]`;
  }
}
