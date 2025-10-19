import { I18nProvider, useI18n } from "@/lib/i18n/react";
import type { Language } from "@/lib/i18n/config";

interface TabNavProps {
  deckId: string;
  lang: Language;
  currentPath?: string;
}

function TabNavContent({ deckId, currentPath }: { deckId: string; currentPath?: string }) {
  const { t } = useI18n();
  // Use currentPath prop if provided (SSR), otherwise fall back to window.location.pathname (client-side)
  const pathname = currentPath || (typeof window !== "undefined" ? window.location.pathname : "");

  const tabs = [
    { name: t("decks.tabs.flashcards"), href: `/decks/${deckId}/flashcards` },
    { name: t("decks.tabs.stats"), href: `/decks/${deckId}/stats` },
    { name: t("decks.tabs.settings"), href: `/decks/${deckId}/settings` },
  ];

  return (
    <div className="mb-6 border-b border-border">
      <nav className="-mb-px flex gap-8" aria-label="Deck sections">
        {tabs.map((tab) => (
          <a
            key={tab.name}
            href={tab.href}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              pathname === tab.href
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
            aria-current={pathname === tab.href ? "page" : undefined}
          >
            {tab.name}
          </a>
        ))}
      </nav>
    </div>
  );
}

export default function TabNav({ deckId, lang, currentPath }: TabNavProps) {
  return (
    <I18nProvider lang={lang}>
      <TabNavContent deckId={deckId} currentPath={currentPath} />
    </I18nProvider>
  );
}
