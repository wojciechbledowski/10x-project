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
import { Check, Edit3, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";
import type { CardActionsProps } from "@/types";

function CardActionsInner({ status, isEditing, onAccept, onEdit, onDelete, isProcessing }: CardActionsProps) {
  const { t } = useI18n();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleAccept = () => {
    onAccept();
  };

  const handleEdit = () => {
    onEdit();
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    setShowDeleteDialog(false);
    onDelete();
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
  };

  const isAccepted = status === "accepted";
  const isDeleted = status === "deleted";

  return (
    <>
      <div className="flex items-center justify-center space-x-3">
        {/* Accept Button */}
        <Button
          onClick={handleAccept}
          disabled={isProcessing || isEditing || isAccepted || isDeleted}
          variant={isAccepted ? "default" : "outline"}
          size="sm"
          className={isAccepted ? "bg-green-600 hover:bg-green-700 text-white" : ""}
          aria-label={isAccepted ? t("review.cardAccepted") : t("review.acceptCard")}
        >
          {isAccepted && <Check className="h-4 w-4 mr-2" />}
          {isAccepted ? t("review.accepted") : t("review.accept")}
        </Button>

        {/* Edit Button */}
        <Button
          onClick={handleEdit}
          disabled={isProcessing || isDeleted}
          variant="outline"
          size="sm"
          aria-label={t("review.editCard")}
        >
          <Edit3 className="h-4 w-4 mr-2" />
          {t("common.edit")}
        </Button>

        {/* Delete Button */}
        <Button
          onClick={handleDelete}
          disabled={isProcessing || isEditing || isAccepted}
          variant="outline"
          size="sm"
          className={
            isDeleted
              ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              : "hover:bg-red-50 hover:border-red-200 hover:text-red-700"
          }
          aria-label={t("review.deleteCard")}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isDeleted ? t("review.deleted") : t("common.delete")}
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("review.deleteCardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("review.deleteCardDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete} disabled={isProcessing}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CardActions(props: CardActionsProps) {
  return <CardActionsInner {...props} />;
}
