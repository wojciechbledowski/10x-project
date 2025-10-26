import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/react";
import type { SortKey } from "../../types";

interface SortDropdownProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
}

/**
 * Dropdown for changing deck sorting order
 * Uses Shadcn Select component with predefined sort options
 */

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const { t } = useI18n();

  const sortOptions = [
    { value: "created_at", label: t("decks.newestFirst") },
    { value: "-created_at", label: t("decks.oldestFirst") },
    { value: "name", label: t("decks.nameAZ") },
    // { value: "due", label: t("decks.dueCardsFirst") }, // TODO: Implement in API later
  ] as const;

  return (
    <div className="flex items-center gap-2" data-testid="sort-dropdown">
      <ArrowUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-40" aria-label={t("decks.sortBy")} data-testid="sort-select-trigger">
          <SelectValue placeholder={t("decks.sortBy")} />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
