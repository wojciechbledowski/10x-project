import { Library, RotateCw, User } from "lucide-react";
import { I18nProvider, useI18n } from "@/lib/i18n/react";
import type { Language } from "@/lib/i18n/config";

interface DesktopNavProps {
  currentPath: string;
  lang?: string;
}

/**
 * Side navigation for tablet and desktop (≥640px)
 * Shows icons with text labels on the left side
 */
function DesktopNavInner({ currentPath }: Omit<DesktopNavProps, "lang">) {
  const { t } = useI18n();

  const navItems = [
    {
      label: t("nav.decks"),
      href: "/decks",
      icon: Library,
      isActive: currentPath.startsWith("/decks"),
    },
    {
      label: t("nav.review"),
      href: "/review",
      icon: RotateCw,
      isActive: currentPath === "/review",
    },
    {
      label: t("nav.profile"),
      href: "/profile",
      icon: User,
      isActive: currentPath === "/profile",
    },
  ];

  return (
    <nav
      className="hidden w-64 flex-col gap-2 border-r border-border bg-background p-4 sm:flex"
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              item.isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            aria-current={item.isActive ? "page" : undefined}
            data-testid={`desktop-nav-${item.href.replace("/", "") || "home"}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

export function DesktopNav({ currentPath, lang = "en" }: DesktopNavProps) {
  return (
    <I18nProvider lang={lang as Language}>
      <DesktopNavInner currentPath={currentPath} />
    </I18nProvider>
  );
}
