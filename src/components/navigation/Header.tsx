import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { I18nProvider, useI18n } from "@/lib/i18n/react";
import type { Language } from "@/lib/i18n/config";

interface HeaderProps {
  title: string;
  userName?: string;
  lang?: Language;
}

/**
 * Application header with page title, theme toggle, language switcher, and user menu
 */
function HeaderInner({ title, userName = "User" }: Omit<HeaderProps, "lang">) {
  const { t, lang: currentLang } = useI18n();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Get user initials for avatar
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <h1 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <LanguageSwitcher currentLang={currentLang} />

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={`${t("common.switchTo")} ${theme === "light" ? t("common.darkMode") : t("common.lightMode")}`}
        >
          {theme === "light" ? (
            <Moon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Sun className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>

        {/* User Avatar Menu - placeholder for now */}
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

export function Header({ title, userName = "User", lang = "en" }: HeaderProps) {
  return (
    <I18nProvider lang={lang as Language}>
      <HeaderInner title={title} userName={userName} />
    </I18nProvider>
  );
}
