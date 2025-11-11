import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";
import type { FlashcardVM } from "@/types";

interface FlashcardItemProps {
  card: FlashcardVM;
  onEdit: (card: FlashcardVM) => void;
}

function FlashcardItemInner({ card, onEdit }: { card: FlashcardVM; onEdit: (card: FlashcardVM) => void }) {
  const { t } = useI18n();

  const getSourceBadge = (source: FlashcardVM["source"]) => {
    const sourceLabels = {
      manual: t("flashcards.source.manual"),
      ai: t("flashcards.source.ai"),
      ai_generated: t("flashcards.source.ai"),
      ai_edited: t("flashcards.source.aiEdited"),
    };

    const badgeClasses = {
      manual: "bg-primary/10 text-primary",
      ai: "bg-secondary/50 text-secondary-foreground",
      ai_generated: "bg-secondary/50 text-secondary-foreground",
      ai_edited: "bg-secondary/50 text-secondary-foreground",
    };

    return (
      <span className={`rounded px-2 py-1 text-xs font-medium ${badgeClasses[source]}`}>{sourceLabels[source]}</span>
    );
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex-1">
          <p className="mb-1 text-sm font-medium text-muted-foreground">{t("flashcards.front")}</p>
          <p className="text-foreground">{card.front}</p>
        </div>
        <div className="ml-4 flex flex-col items-end gap-2">
          {getSourceBadge(card.source)}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(card)}
            className="h-8 w-8 p-0"
            aria-label={t("common.edit")}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-muted-foreground">{t("flashcards.back")}</p>
        <p className="text-foreground">{card.back}</p>
      </div>
    </div>
  );
}

export function FlashcardItem({ card, onEdit }: FlashcardItemProps) {
  return <FlashcardItemInner card={card} onEdit={onEdit} />;
}
