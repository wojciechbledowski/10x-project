import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { I18nProvider, useI18n } from "@/lib/i18n/react";
import { useFlashcards } from "@/components/hooks/useFlashcards";
import { FlashcardItem } from "./FlashcardItem";
import { EditFlashcardDialog } from "./EditFlashcardDialog";
import type { FlashcardVM } from "@/types";
import type { Language } from "@/lib/i18n/config";

interface FlashcardListProps {
  deckId: string;
  lang: Language;
}

function LoadMoreTrigger({ onLoadMore, isLoading }: { onLoadMore: () => void; isLoading: boolean }) {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (triggerRef.current) {
      observer.observe(triggerRef.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return <div ref={triggerRef} className="h-4" />;
}

function FlashcardListInner({ deckId, lang }: { deckId: string; lang: Language }) {
  const { t } = useI18n();
  const { flashcards, isLoading, isLoadingMore, error, hasMore, loadMore, updateFlashcard } = useFlashcards(deckId);

  const [editingCard, setEditingCard] = useState<FlashcardVM | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleEdit = (card: FlashcardVM) => {
    setEditingCard(card);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (cardId: string, updates: { front: string; back: string }) => {
    await updateFlashcard(cardId, updates);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="animate-pulse">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/4 mb-1"></div>
                  <div className="h-5 bg-muted rounded w-3/4"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
              <div>
                <div className="h-4 bg-muted rounded w-1/4 mb-1"></div>
                <div className="h-5 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-card p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>{t("common.retry")}</Button>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <div className="mb-4">
          <div className="mx-auto h-12 w-12 text-muted-foreground">
            <Plus className="h-full w-full" />
          </div>
        </div>
        <h3 className="mb-2 text-lg font-semibold">
          {t("flashcards.emptyTitle", { defaultValue: "No flashcards yet" })}
        </h3>
        <p className="text-muted-foreground mb-4">
          {t("flashcards.emptyDescription", {
            defaultValue: "Create your first flashcard to start learning.",
          })}
        </p>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("flashcards.addCard")}
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Flashcards Actions */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("flashcards.count", { count: flashcards.length })}</p>
        <div className="flex gap-2">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            {t("flashcards.addCard")}
          </Button>
          <Button>{t("flashcards.generateFlashcards")}</Button>
        </div>
      </div>

      {/* Flashcards List */}
      <div className="space-y-4">
        {flashcards.map((card) => (
          <FlashcardItem key={card.id} card={card} lang={lang} onEdit={handleEdit} />
        ))}

        {/* Load More Trigger */}
        {hasMore && <LoadMoreTrigger onLoadMore={loadMore} isLoading={isLoadingMore} />}
      </div>

      {/* Edit Dialog */}
      <EditFlashcardDialog
        card={editingCard}
        lang={lang}
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        onSave={handleSaveEdit}
      />
    </>
  );
}

export function FlashcardList({ deckId, lang }: FlashcardListProps) {
  return (
    <I18nProvider lang={lang}>
      <FlashcardListInner deckId={deckId} lang={lang} />
    </I18nProvider>
  );
}
