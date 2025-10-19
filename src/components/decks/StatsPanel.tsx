import { I18nProvider, useI18n } from "@/lib/i18n/react";
import type { Language } from "@/lib/i18n/config";

interface StatsPanelProps {
  deckId: string;
  lang: Language;
}

function StatsPanelInner({ deckId }: { deckId: string }) {
  const { t } = useI18n();

  // Placeholder data - in a real implementation, this would come from an API
  const stats = {
    totalCards: 45,
    dueToday: 12,
    averageEaseFactor: 2.5,
    retentionRate: 87,
  };

  return (
    <>
      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Cards */}
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">{t("stats.totalCards")}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.totalCards}</p>
        </div>

        {/* Cards Due */}
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">{t("stats.dueToday")}</p>
          <p className="mt-2 text-3xl font-bold text-destructive">{stats.dueToday}</p>
        </div>

        {/* Average Ease */}
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">{t("stats.avgEaseFactor")}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.averageEaseFactor}</p>
        </div>

        {/* Retention Rate */}
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">{t("stats.retentionRate")}</p>
          <p className="mt-2 text-3xl font-bold text-primary">{stats.retentionRate}%</p>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-card-foreground">{t("stats.reviewHistory")}</h3>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <p>{t("stats.chartPlaceholder")}</p>
        </div>
      </div>
    </>
  );
}

export function StatsPanel({ deckId, lang }: StatsPanelProps) {
  return (
    <I18nProvider lang={lang}>
      <StatsPanelInner deckId={deckId} />
    </I18nProvider>
  );
}
