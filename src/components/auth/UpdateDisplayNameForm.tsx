import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n, I18nProvider } from "@/lib/i18n/react";
import { toast } from "sonner";
import type { Language } from "@/lib/i18n/config";

interface UpdateDisplayNameFormProps {
  currentName: string;
  onSubmit?: (data: { displayName: string }) => void;
}

interface UpdateDisplayNameFormWrapperProps extends UpdateDisplayNameFormProps {
  lang: Language;
}

/**
 * Update display name form component
 * Currently a placeholder - display name editing requires profiles table implementation
 */
function UpdateDisplayNameFormInner({ currentName, onSubmit }: UpdateDisplayNameFormProps) {
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (displayName.trim() === currentName.trim()) {
      toast.info(t("profile.displayNameUnchanged"));
      return;
    }

    setIsLoading(true);

    try {
      // Call custom onSubmit if provided (for testing)
      if (onSubmit) {
        await onSubmit({ displayName: displayName.trim() });
        setIsLoading(false);
        return;
      }

      // Call update display name API
      const response = await fetch("/api/auth/update-display-name", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        // API returned an error
        const errorMessage = data.error ? t(data.error) : t("auth.errors.unexpectedError");
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      // Success! Show toast and update current name
      toast.success(t("profile.displayNameUpdated"));
      // Note: The page will need to be refreshed to show updated name from middleware
      // In a more advanced implementation, we could update the parent state
    } catch (error) {
      console.error("Update display name error:", error);
      toast.error(t("auth.errors.unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={t("profile.displayName")}
          disabled={isLoading}
          maxLength={50}
        />
        <Button type="submit" disabled={isLoading || displayName.trim() === currentName.trim()}>
          {isLoading ? t("common.saving") : t("common.save")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("profile.displayNameHelp")}</p>
    </form>
  );
}

/**
 * Update display name form component that provides i18n context
 */
export function UpdateDisplayNameForm({ lang, currentName, onSubmit }: UpdateDisplayNameFormWrapperProps) {
  return (
    <I18nProvider lang={lang}>
      <UpdateDisplayNameFormInner currentName={currentName} onSubmit={onSubmit} />
    </I18nProvider>
  );
}
