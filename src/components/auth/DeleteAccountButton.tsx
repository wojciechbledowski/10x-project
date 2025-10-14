import { useState, useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { useI18n, I18nProvider } from "@/lib/i18n/react";
import { toast } from "sonner";
import type { Language } from "@/lib/i18n/config";

interface DeleteAccountButtonProps {
  onDelete?: () => void;
}

interface DeleteAccountButtonWrapperProps extends DeleteAccountButtonProps {
  lang: Language;
}

/**
 * Inner component that handles the delete account functionality with translations
 */
function DeleteAccountButtonInner({ onDelete }: DeleteAccountButtonProps) {
  const { t } = useI18n();
  const confirmInputId = useId();

  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmValid = confirmText === "DELETE";

  const handleDelete = useCallback(async () => {
    // Guard clause: early return if validation fails
    if (!isConfirmValid) return;

    setIsDeleting(true);

    try {
      // Call custom onDelete if provided (for testing)
      if (onDelete) {
        await onDelete();
        setIsDeleting(false);
        setOpen(false);
        setConfirmText("");
        return;
      }

      // Call delete account API
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // API returned an error
        const errorMessage = data.error ? t(data.error) : t("auth.errors.unexpectedError");
        toast.error(errorMessage);
        setIsDeleting(false);
        return;
      }

      // Success! Show toast and redirect
      toast.success(t("profile.accountDeleted"));

      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (error) {
      console.error("Delete account error:", error);
      toast.error(t("auth.errors.networkError"));
      setIsDeleting(false);
    }
  }, [isConfirmValid, onDelete, t]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    setConfirmText("");
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded-lg border border-destructive bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors">
          {t("profile.deleteAccount")}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>{t("profile.deleteAccount")}</DialogTitle>
          </div>
          <DialogDescription className="text-left">{t("profile.deleteAccountWarning")}</DialogDescription>
        </DialogHeader>

        <div className="my-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>{t("profile.deleteAccountDataList.decks")}</li>
            <li>{t("profile.deleteAccountDataList.flashcards")}</li>
            <li>{t("profile.deleteAccountDataList.progress")}</li>
            <li>{t("profile.deleteAccountDataList.account")}</li>
          </ul>
        </div>

        <div className="space-y-2">
          <label htmlFor={confirmInputId} className="text-sm font-medium">
            {t("profile.deleteAccountConfirmText")}
          </label>
          <input
            id={confirmInputId}
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={t("profile.deleteAccountConfirmPlaceholder")}
            disabled={isDeleting}
            aria-label={t("profile.deleteAccountConfirmText")}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isDeleting}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!isConfirmValid || isDeleting}>
            {isDeleting ? t("profile.deleteAccountDeleting") : t("profile.deleteAccount")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Delete account button component that provides i18n context
 */
export function DeleteAccountButton({ lang, onDelete }: DeleteAccountButtonWrapperProps) {
  return (
    <I18nProvider lang={lang}>
      <DeleteAccountButtonInner onDelete={onDelete} />
    </I18nProvider>
  );
}
