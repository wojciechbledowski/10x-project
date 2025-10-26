import type { Language } from "@/lib/i18n/config";
import { I18nProvider, useI18n } from "@/lib/i18n/react";
import { Library, RotateCw, User } from "lucide-react";

interface MobileNavProps {
  currentPath: string;
  lang?: string;
}

/**
 * Bottom tab bar navigation for mobile devices (<640px)
 * Shows icons with labels for Decks, Review, and Profile
 */
function MobileNavInner({ currentPath }: Omit<MobileNavProps, "lang">) {
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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background sm:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                item.isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={item.isActive ? "page" : undefined}
              data-testid={`mobile-nav-${item.href.replace("/", "") || "home"}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileNav({ currentPath, lang = "en" }: MobileNavProps) {
  return (
    <I18nProvider lang={lang as Language}>
      <MobileNavInner currentPath={currentPath} />
    </I18nProvider>
  );
}
