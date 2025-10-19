import { useCallback, useState } from "react";
import { HeaderBar } from "./HeaderBar";
import { DeckGrid } from "./DeckGrid";
import { EmptyState } from "./EmptyState";
import { CreateDeckModal } from "./CreateDeckModal";
import { useDecks } from "../hooks/useDecks";
import { I18nProvider, useI18n } from "@/lib/i18n/react";
import type { SortKey } from "../../types";
import type { Language } from "@/lib/i18n/config";

/**
 * Main React component for the decks page
 * Manages deck list, sorting, creation, and user interactions
 */
function DecksAppInner() {
  const { t } = useI18n();
  const { decks, loading, error, sort, setSort, createDeck, refetch } = useDecks();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleSortChange = useCallback(
    (newSort: string) => {
      setSort(newSort as SortKey); // Safe cast since SortDropdown only emits valid SortKey values
    },
    [setSort]
  );

  const handleDeckSelect = useCallback((deckId: string) => {
    // Navigation is handled in DeckCard component
    // This callback can be used for analytics or other side effects
    void deckId; // Explicitly mark as intentionally unused
  }, []);

  const handleOpenCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleCreateDeck = useCallback(
    async (name: string) => {
      return await createDeck(name);
    },
    [createDeck]
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Show loading skeleton
  if (loading && decks.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl p-4 sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-6">
              <div className="h-6 w-3/4 bg-muted animate-pulse rounded mb-3" />
              <div className="flex gap-4">
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error && decks.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl p-4 sm:p-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-6 rounded-full bg-destructive/10 p-6">
            <svg className="h-12 w-12 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h3 className="mb-3 text-xl font-semibold text-foreground">{t("decks.failedToLoadDecks")}</h3>

          <p className="mb-8 max-w-md text-muted-foreground">{error}</p>

          <button
            onClick={handleRetry}
            className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("decks.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 sm:p-6">
      <HeaderBar sort={sort} onSortChange={handleSortChange} onOpenCreate={handleOpenCreateModal} />

      {decks.length === 0 ? (
        <EmptyState onCreate={handleOpenCreateModal} />
      ) : (
        <DeckGrid decks={decks} onSelect={handleDeckSelect} />
      )}

      <CreateDeckModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} onCreateDeck={handleCreateDeck} />
    </div>
  );
}

export function DecksApp({ lang = "en" }: { lang?: Language }) {
  return (
    <I18nProvider lang={lang}>
      <DecksAppInner />
    </I18nProvider>
  );
}
