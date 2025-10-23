# Component Structure Visualization

## Layout.astro

Main application layout component that structures the entire app.

### Components

├── Header
│ ├── LanguageSwitcher
│ ├── ThemeToggle (Button)
│ └── AvatarDropdown
│ ├── User menu items
├── DesktopNav
│ ├── Navigation links (Decks, Review, Profile)
├── MobileNav
│ ├── Bottom navigation for mobile
└── ToasterProvider
└── Toast notifications

### Parent Components

└── Root Astro pages
├── index.astro
├── decks/index.astro
├── decks/[deckId]/index.astro
└── auth/\*.astro

---

## DecksApp.tsx

Main React component for deck management and listing.

### Components

├── HeaderBar
│ ├── SortDropdown
│ │ ├── Dropdown menu items
│ └── CreateDeckButton
│ └── CreateDeckModal
│ ├── Modal dialog
│ ├── Form inputs
│ └── Action buttons
├── DeckGrid
│ └── DeckCard (multiple)
│ ├── Card content
│ ├── Navigation link
│ └── Status indicators
└── EmptyState
└── CreateDeckButton

### Hooks

├── useDecks
│ ├── API calls (/api/decks)
│ ├── State management (decks, loading, error)
│ └── Optimistic updates
└── useI18n
└── Translation context

### Services

└── DeckService
├── listDecks()
├── createDeck()
└── softDeleteDeck()

### Types

├── DeckCardVM
├── SortKey
├── DeckResponse
└── DecksListResponse

### Parent Components

└── decks/index.astro

---

## Auth Components

### LoginForm.tsx

Authentication form for user login.

#### Components

├── Form inputs (email, password)
├── Validation error display
├── Submit button
└── Links (forgot password, signup)

#### Hooks

├── useI18n
│ └── Translation context
└── useId (accessibility)

#### Services

└── API calls (/api/auth/login)

#### Types

├── Login schema validation
└── Form error types

#### Parent Components

└── auth/login.astro

### RegisterForm.tsx

User registration form.

#### Components

├── Form inputs (email, password, confirm)
├── Validation display
├── Terms acceptance
└── Submit button

#### Hooks

├── useI18n
└── useId

#### Services

└── API calls (/api/auth/register)

#### Parent Components

└── auth/register.astro

### AuthFormShell.tsx

Shared wrapper for auth forms.

#### Components

├── Form container
├── Logo/branding
└── AuthForm children

#### Parent Components

├── LoginForm
├── RegisterForm
├── ResetPasswordForm
└── UpdatePasswordForm

---

## Navigation Components

### DesktopNav.tsx

Side navigation for desktop/tablet.

#### Components

├── Navigation links
│ ├── Decks (/decks)
│ ├── Review (/review)
│ └── Profile (/profile)
└── Active state indicators

#### Hooks

└── useI18n

#### Parent Components

└── Layout.astro

### MobileNav.tsx

Bottom navigation for mobile devices.

#### Components

├── Bottom tab bar
├── Navigation icons
└── Active indicators

#### Hooks

└── useI18n

#### Parent Components

└── Layout.astro

### AvatarDropdown.tsx

User menu dropdown.

#### Components

├── User avatar
├── Dropdown menu
│ ├── Profile link
│ ├── Settings
│ └── Logout
└── Menu triggers

#### Hooks

└── useI18n

#### Parent Components

└── Header

---

## Deck Detail Components

### DeckDetailLayout.astro

Layout for individual deck pages.

#### Components

├── Header (inherited)
├── Navigation (inherited)
├── TabNav
│ ├── Tab navigation
│ └── Active tab indicators
└── Page content slots

#### Parent Components

├── decks/[deckId]/index.astro
├── decks/[deckId]/flashcards.astro
├── decks/[deckId]/settings.astro
└── decks/[deckId]/stats.astro

### FlashcardList.tsx

List of flashcards in a deck.

#### Components

├── FlashcardItem (multiple)
│ ├── Card content
│ ├── Edit actions
│ └── Delete actions
├── Load more button
└── Empty state

#### Hooks

├── useFlashcards
│ ├── API calls (/api/decks/[deckId]/flashcards)
│ └── State management
└── useI18n

#### Services

└── FlashcardService

#### Types

├── FlashcardVM
└── FlashcardsListResponse

#### Parent Components

└── decks/[deckId]/flashcards.astro

### EditFlashcardDialog.tsx

Modal for editing flashcards.

#### Components

├── Modal dialog
├── Form inputs (front, back)
├── Validation
└── Action buttons

#### Hooks

├── useFlashcards
└── useI18n

#### Parent Components

└── FlashcardList

---

## Utility Components

### ErrorBoundary.tsx

Error boundary for React components.

#### Components

├── Error display
├── Retry actions
└── Fallback UI

#### Hooks

└── Error state management

#### Parent Components

├── DecksApp
├── Auth components
└── Other feature components

### ToasterProvider.tsx

Toast notification provider.

#### Components

└── Toast container
└── Toast messages

#### Services

└── Sonner toast library

#### Parent Components

└── Layout.astro

---

## Data Flow Architecture

### API Layer

├── /api/auth/_
│ ├── login.ts
│ ├── register.ts
│ ├── logout.ts
│ └── reset-password.ts
├── /api/decks/_
│ ├── index.ts (GET/POST)
│ ├── [deckId].ts
│ └── [deckId]/flashcards.ts
└── /api/flashcards/\*
└── [cardId].ts

### Service Layer

├── DeckService
│ ├── CRUD operations
│ └── Business logic
├── FlashcardService
│ ├── Card management
│ └── AI generation
└── Auth services (middleware)

### Hook Layer

├── useDecks
│ └── Deck state management
├── useFlashcards
│ └── Flashcard state management
├── useDeckSettings
│ └── Settings management
└── useErrorPage
└── Error handling

### Type Layer

├── DTOs (Request/Response)
├── View Models (VM)
├── Entity types
└── Utility types

---

## Component Hierarchy Summary

```
Layout.astro (Root)
├── Header
│   ├── LanguageSwitcher
│   ├── Theme Toggle
│   └── AvatarDropdown
├── DesktopNav
├── MobileNav
├── ToasterProvider
└── Page Content
    ├── DecksApp (decks/index.astro)
    │   ├── HeaderBar
    │   │   ├── SortDropdown
    │   │   └── CreateDeckButton
    │   ├── DeckGrid
    │   │   └── DeckCard (×N)
    │   └── EmptyState
    ├── Auth Forms (auth/*.astro)
    │   ├── AuthFormShell
    │   │   ├── LoginForm
    │   │   ├── RegisterForm
    │   │   └── Other auth forms
    └── Deck Detail (decks/[deckId]/*.astro)
        ├── DeckDetailLayout
        │   ├── TabNav
        │   └── Page content
        ├── FlashcardList
        │   └── FlashcardItem (×N)
        └── EditFlashcardDialog
```
