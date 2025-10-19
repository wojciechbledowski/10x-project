import React from "react";
import { CreateDeckButton } from "./CreateDeckButton";
import { Library } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";

interface EmptyStateProps {
  onCreate: () => void;
}

/**
 * Empty state component shown when no decks exist
 * Displays illustration, explanatory text, and CTA button
 */
export function EmptyState({ onCreate }: EmptyStateProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 rounded-full bg-muted p-6">
        <Library className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      </div>

      <h3 className="mb-3 text-xl font-semibold text-foreground">{t("decks.noDeck")}</h3>

      <p className="mb-8 max-w-md text-muted-foreground">{t("decks.learnWithAI")}</p>

      <CreateDeckButton onClick={onCreate} />
    </div>
  );
}
