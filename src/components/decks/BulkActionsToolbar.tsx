import { Button } from "@/components/ui/button";
import { CheckCircle, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";

interface BulkActionsToolbarProps {
  hasPendingCards: boolean;
  isProcessing: boolean;
  onAcceptAll: () => void;
  onDeleteAll: () => void;
}

export function BulkActionsToolbar({
  hasPendingCards,
  isProcessing,
  onAcceptAll,
  onDeleteAll,
}: BulkActionsToolbarProps) {
  const { t } = useI18n();

  if (!hasPendingCards) {
    return null;
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onAcceptAll} disabled={isProcessing} className="min-w-[100px]">
        <CheckCircle className="h-4 w-4 mr-2" />
        {t("review.generated.acceptAll")}
      </Button>
      <Button
        variant="outline"
        onClick={onDeleteAll}
        disabled={isProcessing}
        className="hover:bg-red-50 hover:border-red-200 hover:text-red-700 min-w-[100px]"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {t("review.generated.deleteAll")}
      </Button>
    </div>
  );
}
