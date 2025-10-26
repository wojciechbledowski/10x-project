import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { I18nProvider, useI18n } from "@/lib/i18n/react";
import { useDeckSettings } from "@/components/hooks/useDeckSettings";
import type { Language } from "@/lib/i18n/config";

interface DeleteDeckDialogProps {
  deckId: string;
  lang: Language;
}

function DeleteDeckDialogInner({ deckId }: { deckId: string }) {
  const { t } = useI18n();
  const { deck, isLoadingDeck, deleteDeck, isDeleting, error: hookError } = useDeckSettings(deckId);
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteDeck();
      // Navigation is handled by the hook
    } catch {
      // Error is handled by the hook
      setIsOpen(false);
    }
  };

  if (isLoadingDeck) {
    return (
      <div className="rounded-lg border border-destructive bg-card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded mb-4"></div>
          <div className="h-10 bg-muted rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="rounded-lg border border-destructive bg-card p-6">
        <p className="text-destructive">
          {hookError || t("settings.loadDeckError", { defaultValue: "Failed to load deck" })}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-destructive bg-card p-6">
      <h3 className="mb-2 text-lg font-semibold text-destructive">{t("settings.dangerZone")}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{t("settings.deleteDeckWarning")}</p>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={isDeleting}
            data-testid="delete-deck-button"
          >
            {t("settings.deleteDeck")}
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.deleteDeck")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.deleteDeckConfirm", {
                defaultValue: "Are you sure you want to delete this deck? This action cannot be undone.",
              })}
              <br />
              <br />
              <strong>{deck.name}</strong>
              <br />
              {t("settings.deleteDeckConfirmCards", {
                count: deck.cardCount,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-deck-button"
            >
              {isDeleting ? t("common.deleting", { defaultValue: "Deleting..." }) : t("settings.deleteDeck")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function DeleteDeckDialog({ deckId, lang }: DeleteDeckDialogProps) {
  return (
    <I18nProvider lang={lang}>
      <DeleteDeckDialogInner deckId={deckId} />
    </I18nProvider>
  );
}
