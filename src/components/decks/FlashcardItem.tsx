import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";
import type { FlashcardVM } from "@/types";

interface FlashcardItemProps {
  card: FlashcardVM;
  onEdit: (card: FlashcardVM) => void;
  onDelete: (cardId: string) => void;
}

function FlashcardItemInner({ card, onEdit, onDelete }: FlashcardItemProps) {
  const { t } = useI18n();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    setShowDeleteDialog(false);
    onDelete(card.id);
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
  };

  const getSourceBadge = (source: FlashcardVM["source"]) => {
    const sourceLabels = {
      manual: t("flashcards.source.manual"),
      ai: t("flashcards.source.ai"),
      ai_edited: t("flashcards.source.aiEdited"),
    };

    const badgeClasses = {
      manual: "bg-primary/10 text-primary",
      ai: "bg-secondary/50 text-secondary-foreground",
      ai_edited: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
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
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(card)}
              className="h-8 w-8 p-0"
              aria-label={t("common.edit")}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-700"
              aria-label={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-muted-foreground">{t("flashcards.back")}</p>
        <p className="text-foreground">{card.back}</p>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("flashcards.deleteCardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("flashcards.deleteCardDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function FlashcardItem({ card, onEdit, onDelete }: FlashcardItemProps) {
  return <FlashcardItemInner card={card} onEdit={onEdit} onDelete={onDelete} />;
}
