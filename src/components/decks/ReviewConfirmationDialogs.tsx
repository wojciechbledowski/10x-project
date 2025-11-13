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
import { useI18n } from "@/lib/i18n/react";

interface ReviewConfirmationDialogsProps {
  showAcceptAllDialog: boolean;
  showDeleteAllDialog: boolean;
  isProcessing: boolean;
  onAcceptAll: () => void;
  onDeleteAll: () => void;
  onAcceptAllDialogChange: (open: boolean) => void;
  onDeleteAllDialogChange: (open: boolean) => void;
}

export function ReviewConfirmationDialogs({
  showAcceptAllDialog,
  showDeleteAllDialog,
  isProcessing,
  onAcceptAll,
  onDeleteAll,
  onAcceptAllDialogChange,
  onDeleteAllDialogChange,
}: ReviewConfirmationDialogsProps) {
  const { t } = useI18n();

  return (
    <>
      {/* Accept All Confirmation Dialog */}
      <AlertDialog open={showAcceptAllDialog} onOpenChange={onAcceptAllDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("review.generated.acceptAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("review.generated.acceptAllDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onAcceptAll} disabled={isProcessing}>
              {isProcessing ? t("common.processing") : t("review.generated.acceptAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={onDeleteAllDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("review.generated.deleteAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("review.generated.deleteAllDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteAll}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? t("common.deleting") : t("review.generated.deleteAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
