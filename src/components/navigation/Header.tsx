import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AvatarDropdown } from "./AvatarDropdown";
import { I18nProvider, useI18n } from "@/lib/i18n/react";
import type { Language } from "@/lib/i18n/config";
import type { Theme } from "@/types";

interface User {
  id: string;
  name: string;
  email?: string;
}

interface HeaderProps {
  title: string;
  user?: User;
  lang?: Language;
  theme?: Theme;
}

/**
 * Application header with page title, theme toggle, language switcher, and user menu
 */
function HeaderInner({ title, user, theme: initialTheme = "light" }: Omit<HeaderProps, "lang"> & { theme?: Theme }) {
  const { t, lang: currentLang } = useI18n();

  // Initialize theme state with the theme provided from server or fallback to light
  const [theme, setTheme] = useState<Theme>(initialTheme);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    // Set theme cookie for server-side rendering (expires in 1 year)
    const maxAge = 60 * 60 * 24 * 365; // 1 year in seconds
    document.cookie = `theme=${newTheme}; path=/; max-age=${maxAge}; SameSite=Lax`;

    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

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

        {/* Auth State - Show Login/Register or User Menu */}
        {user ? (
          <AvatarDropdown userName={user.name} userEmail={user.email} lang={currentLang} />
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="/auth/login">{t("auth.login")}</a>
            </Button>
            <Button size="sm" asChild>
              <a href="/auth/register">{t("auth.signup")}</a>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

export function Header({ title, user, lang = "en", theme = "light" }: HeaderProps) {
  return (
    <I18nProvider lang={lang as Language}>
      <HeaderInner title={title} user={user} theme={theme} />
    </I18nProvider>
  );
}
