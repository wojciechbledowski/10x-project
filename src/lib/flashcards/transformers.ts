import type { GenerationBatchResponse, ReviewCardVM, FlashcardResponse, CardStatus } from "@/types";

/**
 * Convert API flashcard response to ReviewCardVM format
 */
export function convertToReviewCardVM(flashcard: FlashcardResponse): ReviewCardVM {
  return {
    id: flashcard.id,
    front: flashcard.front,
    back: flashcard.back,
    source: flashcard.source,
    status: "pending" as CardStatus,
    isEdited: false,
    originalFront: flashcard.front,
    originalBack: flashcard.back,
  };
}

/**
 * Convert generation batch response to array of ReviewCardVM
 */
export function batchToReviewCards(batchResponse: GenerationBatchResponse): ReviewCardVM[] {
  const allFlashcards: { front: string; back: string; id: string }[] = [];

  // Collect all flashcards from all generations in the batch
  batchResponse.generations.forEach((generation) => {
    if (generation.generatedData?.flashcards) {
      // Add generated data flashcards with temporary IDs
      generation.generatedData.flashcards.forEach((card: { front: string; back: string }, index: number) => {
        allFlashcards.push({
          id: `temp-${generation.id}-${index}`,
          front: card.front,
          back: card.back,
        });
      });
    }
  });

  return allFlashcards.map((card) =>
    convertToReviewCardVM({
      id: card.id,
      front: card.front,
      back: card.back,
      source: "ai",
      deckId: null,
      easeFactor: 2.5,
      intervalDays: 1,
      repetition: 0,
      nextReviewAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: "",
      deletedAt: null,
    })
  );
}
