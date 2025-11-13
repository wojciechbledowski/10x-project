import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";

interface EditActionsProps {
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  hasValidationErrors: boolean;
}

/**
 * Edit action buttons for card editing
 */
export function EditActions({ onCancel, onSave, isSaving, hasValidationErrors }: EditActionsProps) {
  const { t } = useI18n();

  return (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
        <RotateCcw className="h-4 w-4 mr-2" />
        {t("common.cancel")}
      </Button>
      <Button size="sm" onClick={onSave} disabled={isSaving || hasValidationErrors}>
        {isSaving ? t("common.saving") : t("common.save")}
      </Button>
    </div>
  );
}
