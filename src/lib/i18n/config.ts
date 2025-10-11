/**
 * i18n configuration
 * Defines supported languages and default language
 */

export const languages = {
  en: "English",
  pl: "Polski",
} as const;

export type Language = keyof typeof languages;

export const defaultLanguage: Language = "en";

export const supportedLanguages = Object.keys(languages) as Language[];

/**
 * Get language display name
 */
export function getLanguageName(lang: Language): string {
  return languages[lang];
}

/**
 * Check if language is supported
 */
export function isValidLanguage(lang: string): lang is Language {
  return lang in languages;
}
