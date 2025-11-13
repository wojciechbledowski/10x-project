import { createContext, useContext, type ReactNode } from "react";
import type { Language } from "./config";
import { createTranslator } from "./utils";

export interface I18nContextValue {
  lang: Language;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  lang: Language;
  children: ReactNode;
}

/**
 * I18n Provider for React components
 * Provides language and translation function to all children
 */
export function I18nProvider({ lang, children }: I18nProviderProps) {
  const t = createTranslator(lang);

  const contextValue = {
    lang,
    t,
  };

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

/**
 * Hook to access i18n in React components
 */
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

/**
 * Translation component for React
 * Usage: <T k="auth.login" />
 */
export function T({ k, ...replacements }: { k: string } & Record<string, string | number>) {
  const { t } = useI18n();
  return <>{t(k, replacements)}</>;
}
