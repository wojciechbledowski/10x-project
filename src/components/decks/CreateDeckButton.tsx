import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";

interface CreateDeckButtonProps {
  onClick: () => void;
  variant?: "primary" | "outline";
  size?: "default" | "sm";
}

/**
 * CTA button to open deck creation modal
 * Can be used in HeaderBar or EmptyState
 */
export function CreateDeckButton({ onClick, variant = "primary", size = "default" }: CreateDeckButtonProps) {
  const { t } = useI18n();

  return (
    <Button
      onClick={onClick}
      variant={variant === "primary" ? "default" : "outline"}
      size={size}
      aria-label={t("decks.createDeck")}
      data-testid="create-deck-button"
    >
      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
      {t("decks.createDeck")}
    </Button>
  );
}
