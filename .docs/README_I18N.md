# Internationalization (i18n) Implementation

This document describes the i18n system implemented in the flashcard application.

## 📚 Overview

The application supports multiple languages with a lightweight, custom i18n implementation that works seamlessly with both Astro and React components.

### Supported Languages

- 🇬🇧 **English** (`en`) - Default
- 🇵🇱 **Polski** (`pl`) - Polish (Full translation)
- 🇪🇸 **Español** (`es`) - Spanish (Coming soon)
- 🇩🇪 **Deutsch** (`de`) - German (Coming soon)

## 🏗️ Architecture

### File Structure

```
src/lib/i18n/
├── config.ts                 # Language configuration
├── utils.ts                  # Translation utilities for Astro
├── react.tsx                 # React hooks and components
└── translations/
    ├── en.json               # English translations
    ├── pl.json               # Polish translations
    ├── es.json               # Spanish translations (TODO)
    └── de.json               # German translations (TODO)
```

### How It Works

1. **Language Detection**: Language is stored in a cookie (`lang=en`)
2. **Server-Side**: Astro pages read the cookie and pass language to components
3. **Client-Side**: React components receive language via props or context
4. **Persistence**: Language choice persists across sessions via cookie

## 🎨 Usage

### In Astro Pages

```astro
---
import Layout from "../layouts/Layout.astro";
import { getLanguageFromCookie } from "../lib/i18n/utils";
import { createTranslator } from "../lib/i18n/utils";

// Get current language
const lang = getLanguageFromCookie(Astro.request.headers.get("cookie"));

// Create translator function
const t = createTranslator(lang);
---

<Layout title={t("common.appName")}>
  <h1>{t("decks.title")}</h1>
  <p>{t("decks.subtitle")}</p>

  <!-- With replacements -->
  <p>{t("decks.cardsCount", { count: "45" })}</p>
</Layout>
```

### In React Components

#### Option 1: Using Context (Recommended)

```tsx
import { I18nProvider, useI18n } from "@/lib/i18n/react";

// Wrap your component with I18nProvider
export function MyFeature({ lang }: { lang: Language }) {
  return (
    <I18nProvider lang={lang}>
      <MyComponent />
    </I18nProvider>
  );
}

// Use the hook inside
function MyComponent() {
  const { t, lang } = useI18n();

  return (
    <div>
      <h1>{t("profile.title")}</h1>
      <p>{t("profile.accountInfo")}</p>
    </div>
  );
}
```

#### Option 2: Using T Component

```tsx
import { I18nProvider, T } from "@/lib/i18n/react";

function MyComponent() {
  return (
    <div>
      <h1>
        <T k="profile.title" />
      </h1>
      <p>
        <T k="decks.cardsCount" count="42" />
      </p>
    </div>
  );
}
```

#### Option 3: Direct Import

```tsx
import { createTranslator } from "@/lib/i18n/utils";
import type { Language } from "@/lib/i18n/config";

function MyComponent({ lang }: { lang: Language }) {
  const t = createTranslator(lang);

  return <h1>{t("common.appName")}</h1>;
}
```

## 🔧 Translation Keys

### Common Translations (`common`)

```typescript
t("common.appName"); // "Flashcard App"
t("common.loading"); // "Loading..."
t("common.error"); // "Error"
t("common.save"); // "Save"
t("common.delete"); // "Delete"
```

### Authentication (`auth`)

```typescript
t("auth.login"); // "Sign In"
t("auth.signup"); // "Sign Up"
t("auth.email"); // "Email"
t("auth.password"); // "Password"
```

### Navigation (`nav`)

```typescript
t("nav.decks"); // "Decks"
t("nav.review"); // "Review"
t("nav.profile"); // "Profile"
```

### Decks (`decks`)

```typescript
t("decks.title"); // "My Decks"
t("decks.createDeck"); // "Create Deck"
t("decks.cardsCount", { count: 5 }); // "5 cards"
```

### Flashcards (`flashcards`)

```typescript
t("flashcards.front"); // "Front"
t("flashcards.back"); // "Back"
t("flashcards.addCard"); // "Add Card"
```

### Review (`review`)

```typescript
t("review.title"); // "Review"
t("review.progress"); // "Progress"
t("review.rating.good"); // "Good"
```

### Profile (`profile`)

```typescript
t("profile.title"); // "Profile"
t("profile.accountInfo"); // "Account Information"
t("profile.changePassword"); // "Change Password"
```

See `src/lib/i18n/translations/en.json` for the complete list.

## 🔄 Switching Languages

### Automatic Language Switcher

The application includes a language switcher in the header:

- Globe icon button
- Dropdown with all supported languages
- Checkmark shows current language
- Clicking a language saves cookie and reloads page

### Manual Language Change

```typescript
// Set cookie
document.cookie = "lang=pl; path=/; max-age=31536000";

// Reload to apply
window.location.reload();
```

### URL Parameter (Optional)

You can also pass language via URL:

```
https://yourapp.com/decks?lang=pl
```

## 📝 Adding New Languages

### 1. Add Language to Config

```typescript
// src/lib/i18n/config.ts
export const languages = {
  en: "English",
  pl: "Polski",
  es: "Español", // Add this
  de: "Deutsch", // Add this
} as const;
```

### 2. Create Translation File

```bash
# Copy English as template
cp src/lib/i18n/translations/en.json src/lib/i18n/translations/es.json
```

### 3. Translate Content

```json
// src/lib/i18n/translations/es.json
{
  "common": {
    "appName": "Aplicación de Tarjetas",
    "loading": "Cargando...",
    ...
  }
}
```

### 4. Import in Utils

```typescript
// src/lib/i18n/utils.ts
import esTranslations from "./translations/es.json";

const translations: Record<Language, TranslationObject> = {
  en: enTranslations,
  pl: plTranslations,
  es: esTranslations, // Add this
  de: deTranslations, // Add this
};
```

## 🎯 Best Practices

### 1. Use Semantic Keys

✅ **Good:**

```typescript
t("auth.welcomeBack");
t("decks.createFirstDeck");
t("error.somethingWentWrong");
```

❌ **Bad:**

```typescript
t("text1");
t("button_label_2");
t("message");
```

### 2. Group by Feature

Organize translations by feature/page:

- `auth.*` - Authentication
- `decks.*` - Deck management
- `flashcards.*` - Flashcard operations
- `profile.*` - User profile
- `common.*` - Shared across app

### 3. Use Replacements for Dynamic Content

```typescript
// Translation
"cardsCount": "{{count}} cards"

// Usage
t("decks.cardsCount", { count: flashcards.length })
```

### 4. Provide Context in Keys

✅ **Good:**

```json
{
  "review": {
    "rating": {
      "again": "Again",
      "hard": "Hard",
      "good": "Good"
    }
  }
}
```

❌ **Bad:**

```json
{
  "again": "Again",
  "hard": "Hard",
  "good": "Good"
}
```

## 🐛 Troubleshooting

### Translation Not Showing

1. **Check key exists**: Verify key in `en.json`
2. **Check syntax**: Use dot notation `"auth.login"`
3. **Check fallback**: Falls back to English if key missing

### Language Not Switching

1. **Check cookie**: `document.cookie` should show `lang=pl`
2. **Clear cache**: Hard refresh (Ctrl+Shift+R)
3. **Check browser**: Some browsers block cookies in dev

### TypeScript Errors

```typescript
// Make sure to import the Language type
import type { Language } from "@/lib/i18n/config";

// Not just string
const lang: Language = "en"; // ✅
const lang: string = "en"; // ❌
```

## 🚀 Future Enhancements

- [ ] Add Spanish translations
- [ ] Add German translations
- [ ] Add French translations
- [ ] Implement plural rules (1 card vs 2 cards)
- [ ] Add date/time formatting per locale
- [ ] Add number formatting per locale
- [ ] Browser language detection
- [ ] Translation management UI
- [ ] Export/import translations
- [ ] Translation validation in CI/CD

## 📚 Resources

- [i18next Documentation](https://www.i18next.com/)
- [MDN: Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [W3C i18n](https://www.w3.org/International/)

---

**Status**: ✅ i18n fully implemented with English and Polish translations!
