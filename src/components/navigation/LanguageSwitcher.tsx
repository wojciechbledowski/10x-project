import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { languages, type Language } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/react";

interface LanguageSwitcherProps {
  currentLang: Language;
}

/**
 * Language switcher dropdown component
 * Allows users to switch between supported languages
 */
export function LanguageSwitcher({ currentLang }: LanguageSwitcherProps) {
  const { t } = useI18n();

  const handleLanguageChange = (lang: Language) => {
    // Set language cookie and reload page
    // eslint-disable-next-line react-compiler/react-compiler
    document.cookie = `lang=${lang}; path=/; max-age=31536000`; // 1 year
    window.location.href = window.location.href.split("?")[0];
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.language_switcher_label")}>
          <Globe className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.keys(languages).map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code as Language)}
            className={currentLang === code ? "bg-accent" : ""}
          >
            {t(`common.language_${code}`)}
            {currentLang === code && <span className="ml-2">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
