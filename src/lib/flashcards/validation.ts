import type { ReviewCardVM } from "@/types";

export interface ValidationErrors {
  front?: string;
  back?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

type TranslationFunction = (key: string, replacements?: Record<string, string | number>) => string;

/**
 * Validate card content against business rules
 */
export function validateCardContent(
  side: "front" | "back",
  content: string,
  t: TranslationFunction
): string | undefined {
  const trimmed = content.trim();

  if (!trimmed) {
    return t("common.validation.required");
  }

  if (trimmed.length > 1000) {
    return t("common.validation.maxLength", { max: 1000 });
  }

  return undefined;
}

/**
 * Validate all accepted/edited cards before completion
 */
export function validateCompletionCards(cards: ReviewCardVM[]): { isValid: boolean; error?: string } {
  const acceptedOrEditedCards = cards.filter((card) => card.status === "accepted" || card.status === "edited");

  for (const card of acceptedOrEditedCards) {
    const frontTrimmed = card.front.trim();
    const backTrimmed = card.back.trim();

    if (!frontTrimmed || frontTrimmed.length > 1000) {
      return {
        isValid: false,
        error: `Card "${frontTrimmed.substring(0, 50)}..." has invalid front content`,
      };
    }

    if (!backTrimmed || backTrimmed.length > 1000) {
      return {
        isValid: false,
        error: `Card "${frontTrimmed.substring(0, 50)}..." has invalid back content`,
      };
    }
  }

  return { isValid: true };
}
