import React from "react";
import { I18nProvider, useI18n } from "@/lib/i18n/react";
import { SortDropdown } from "./SortDropdown";
import { CreateDeckButton } from "./CreateDeckButton";
import type { SortKey } from "../../types";
import type { Language } from "@/lib/i18n/config";

interface HeaderBarProps {
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  onOpenCreate: () => void;
}

/**
 * Toolbar component grouping deck actions
 * Contains sort dropdown and create deck button
 */
export function HeaderBar({ sort, onSortChange, onOpenCreate }: HeaderBarProps) {
  const { t } = useI18n();

  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-foreground">{t("decks.title")}</h2>
      </div>

      <div className="flex items-center gap-4">
        <SortDropdown value={sort} onChange={onSortChange} />
        <CreateDeckButton onClick={onOpenCreate} />
      </div>
    </div>
  );
}
