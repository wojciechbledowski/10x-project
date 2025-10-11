import type { Language } from "./config";
import { defaultLanguage, isValidLanguage } from "./config";

import enTranslations from "./translations/en.json";
import plTranslations from "./translations/pl.json";

type TranslationObject = typeof enTranslations;

const translations: Record<Language, TranslationObject> = {
  en: enTranslations,
  pl: plTranslations,
};
/**
 * Get translation for a given key
 * Supports nested keys with dot notation: "auth.login"
 */
export function t(lang: Language, key: string, replacements?: Record<string, string | number>): string {
  const keys = key.split(".");
  let value: unknown = translations[lang];

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      // Fallback to default language
      value = translations[defaultLanguage];
      for (const fallbackKey of keys) {
        if (value && typeof value === "object" && fallbackKey in value) {
          value = (value as Record<string, unknown>)[fallbackKey];
        } else {
          return key; // Return key if translation not found
        }
      }
      break;
    }
  }

  if (typeof value !== "string") {
    return key;
  }

  // Replace placeholders
  if (replacements && typeof value === "string") {
    let stringValue = value;
    Object.entries(replacements).forEach(([placeholder, replacement]) => {
      stringValue = stringValue.replace(new RegExp(`{{${placeholder}}}`, "g"), String(replacement));
    });
    value = stringValue;
  }

  return value as string;
}

/**
 * Get language from URL or cookie
 */
export function getLanguageFromUrl(url: URL): Language {
  const urlLang = url.searchParams.get("lang");
  if (urlLang && isValidLanguage(urlLang)) {
    return urlLang;
  }
  return defaultLanguage;
}

/**
 * Get language from cookie
 */
export function getLanguageFromCookie(cookieHeader: string | null): Language {
  if (!cookieHeader) return defaultLanguage;

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  const lang = cookies.lang;
  if (lang && isValidLanguage(lang)) {
    return lang;
  }

  return defaultLanguage;
}

/**
 * Create a translation function bound to a specific language
 */
export function createTranslator(lang: Language) {
  return (key: string, replacements?: Record<string, string | number>) => t(lang, key, replacements);
}
