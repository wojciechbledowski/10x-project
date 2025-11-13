import type { GenerationBatchResponse, CreateFlashcardRequest, FlashcardResponse } from "@/types";

/**
 * Service layer for generation batch API operations
 */
export const generationBatchService = {
  /**
   * Fetch a generation batch by ID
   */
  async fetchBatch(batchId: string, signal?: AbortSignal): Promise<GenerationBatchResponse> {
    const response = await fetch(`/api/generation-batches/${batchId}`, { signal });

    if (!response.ok) {
      throw new Error(`Failed to fetch batch: HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * Save a flashcard to the database
   */
  async saveFlashcard(card: CreateFlashcardRequest): Promise<FlashcardResponse> {
    const response = await fetch("/api/flashcards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(card),
    });

    if (!response.ok) {
      throw new Error(`Failed to save flashcard: HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * Save multiple flashcards in bulk
   */
  async saveFlashcardsBulk(cards: CreateFlashcardRequest[]): Promise<FlashcardResponse[]> {
    const savedCards: FlashcardResponse[] = [];

    for (const card of cards) {
      const savedCard = await this.saveFlashcard(card);
      savedCards.push(savedCard);
    }

    return savedCards;
  },
};
