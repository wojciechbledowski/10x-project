# UI Architecture for AI Flashcard Generator

## 1. UI Structure Overview

The application is divided into two routing domains: **Public** (unauthenticated) and **App** (authenticated). Astro 5 serves pages while interactive islands are built with React 19. A global auth middleware (`src/middleware/index.ts`) guards all routes inside **/app** and redirects unknown users to `/login`. Navigation adapts responsively — a bottom tab bar on mobile, a left side-nav on desktop. Page transitions use Astro’s page-transition module with a reduced-motion fallback. Shared UI primitives come from Shadcn/ui and Tailwind 4, ensuring WCAG AA compliance.

```
/              ─► Home (redirects → /login or /decks)
/login         ─► Public
/signup        ─► Public
/privacy       ─► Public  (static)
/terms         ─► Public  (static)
/decks         ─► App root
  ├─ /          Decks List / Empty-State
  └─ /:deckId   Deck Detail (tabs)
       ├─ /flashcards    (default)
       ├─ /stats
       └─ /settings
/review        ─► Review Session wizard
/profile       ─► Profile & Account settings
```

## 2. View List

| #   | View                    | Path                        | Main Purpose                                | Key Information                             | Key Components                                                          | UX / A11y / Security                                                                               |
| --- | ----------------------- | --------------------------- | ------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | Login                   | `/login`                    | Authenticate existing users.                | Email, password fields; error feedback.     | `AuthForm`, `Button`, `Input`, `Alert`                                  | Focus first field, password manager support, disable paste masking, CSRF-safe POST, error toaster. |
| 2   | Signup                  | `/signup`                   | Create new account.                         | Email, password, confirm; complexity hints. | `AuthForm`, `PasswordMeter`, `Button`                                   | Real-time validation, accessible error messages, email verification banner.                        |
| 3   | Privacy                 | `/privacy`                  | Legal info.                                 | Static markdown.                            | `MarkdownPage`                                                          | Readable typography; no tracking.                                                                  |
| 4   | Terms                   | `/terms`                    | Legal info.                                 | Static markdown.                            | `MarkdownPage`                                                          | Same as above.                                                                                     |
| 5   | Decks List              | `/decks`                    | Show user decks and provide creation entry. | Deck name, card count, due count.           | `DeckCard`, `CreateDeckModal`, `SortDropdown`, `EmptyState`             | Responsive grid, keyboard nav, aria-labels, optimistic create.                                     |
| 6   | Empty State             | `/decks` (no decks)         | Prompt to create first deck.                | Illustration, CTA button.                   | `EmptyState`                                                            | Large tap target, descriptive alt text.                                                            |
| 7   | Create Deck Modal       | `/decks#new`                | Enter deck name.                            | Text field.                                 | `Dialog`, `Input`, `Button`                                             | Focus trap, escape closes, submits via POST.                                                       |
| 8   | Deck Detail             | `/decks/:deckId`            | Manage a single deck.                       | Tabs, metrics.                              | `TabNav`, `GenerateButton`, `FlashcardList`,`StatsPanel`,`DeckSettings` | Route-persisted tab, infinite scroll, skip links.                                                  |
| 9   | Flashcards Tab          | `/decks/:deckId/flashcards` | List + edit cards.                          | Front/back, source badges.                  | `FlashcardItem`, `EditDialog`, `LoadMoreTrigger`                        | Optimistic rename, modal focus trap.                                                               |
| 10  | Stats Tab               | `/decks/:deckId/stats`      | Deck KPIs.                                  | Due count, ease distribution.               | `Chart`, `StatCard`                                                     | Uses accessible colors, ARIA descriptions.                                                         |
| 11  | Settings Tab            | `/decks/:deckId/settings`   | Rename, soft delete.                        | Rename input, delete button.                | `Input`, `AlertDialog`                                                  | PATCH & DELETE with CSRF tokens.                                                                   |
| 12  | Generate Progress Modal | `/decks/:deckId#generation` | Show polling progress.                      | Spinner, progress bar.                      | `Dialog`, `ProgressBar`                                                 | ARIA live region, Cancel button.                                                                   |
| 13  | Generated Cards Review  | modal+stepper               | Accept/Edit/Delete each generated card.     | Front/back editor.                          | `Stepper`, `ButtonGroup`, `EditDialog`                                  | Keyboard shortcuts, optimistic updates.                                                            |
| 14  | Review Session          | `/review`                   | Daily spaced-repetition flow.               | Card front/back, quality buttons.           | `ReviewCard`, `QualityButtons`, `ProgressBar`                           | `Space` flips, `1–5` rates; focus management; exits on done.                                       |
| 15  | Flashcard Edit Dialog   | modal                       | Edit card.                                  | Front/back textarea.                        | `Dialog`, `Textarea`, `Button`                                          | Full-screen on mobile, centered desktop.                                                           |
| 16  | Profile                 | `/profile`                  | Account & theme settings.                   | Email, password change, theme toggle.       | `Form`, `Toggle`, `AlertDialog`                                         | Accessible forms, localStorage theme, DELETE confirmation.                                         |
| 17  | Global Error Page       | `/error` (fallback)         | Display unexpected errors.                  | Error message, retry.                       | `ErrorBoundary`, `Button`                                               | Non-blocking toast + fallback page.                                                                |

## 3. User Journey Map

1. **First-time visitor:**
   a. Land on `/login` → chooses “Sign up” → `/signup`.
   b. Completes form → Supabase sign-up → redirected `/decks`.
   c. **Empty-state** appears → clicks “Create Deck” → `CreateDeckModal` → deck created.
   d. Redirected to new deck detail `/decks/:id` (Flashcards tab empty).
   e. Clicks “Generate Flashcards” → generation modal polls until done.
   f. On success, **Generated Cards Review** stepper opens; user Accepts / Edits cards.
   g. Returns to deck detail; cards now listed.
   h. Next day, visits `/review` via nav; completes daily review session.
   i. Opens `/profile` to switch dark mode and (optionally) delete account.

2. **Returning learner:**
   – Logs in → `/decks` shows grid sorted by due count.
   – Navigates directly to `/review` if due cards exist (future enhancement).

## 4. Layout and Navigation Structure

• **Navigation variants**
– **Mobile (<640 px):** Bottom tab bar with icons (Decks, Review, Profile).
– **Tablet & Desktop:** Persistent side-nav (left) with text labels and icons.

• **Header:** Displays current deck name or page title, plus theme toggle and user avatar menu.

• **Route Hierarchy** (Astro filesystem):

```
src/pages/
  ├─ index.astro            → route / (redirect)
  ├─ login.astro            → /login
  ├─ signup.astro           → /signup
  ├─ privacy.astro          → /privacy
  ├─ terms.astro            → /terms
  └─ decks/
       ├─ index.astro       → /decks
       └─ [deckId]/
            ├─ index.astro  → /decks/:deckId (Flashcards)
            ├─ stats.astro  → /decks/:deckId/stats
            └─ settings.astro → /decks/:deckId/settings
  ├─ review.astro           → /review
  └─ profile.astro          → /profile
```

## 5. Key Components (Cross-cutting)

| Component            | Purpose                                                                               |
| -------------------- | ------------------------------------------------------------------------------------- |
| `AppContext`         | Global state slices (`auth`, `decks`, `flashcards`) with reducers & optimistic queue. |
| `DeckCard`           | Card tile in deck list grid (name, counts, context menu).                             |
| `FlashcardItem`      | List row with front/back preview, edit button, source badge.                          |
| `ReviewCard`         | Full-screen flashcard for review session with flip animation.                         |
| `Dialog / Modal`     | Accessibility-compliant overlays (Shadcn/ui).                                         |
| `ProgressBar`        | Displays asynchronous job progress (generation, uploads).                             |
| `ToastProvider`      | Bottom-center toasts for transient messages & errors.                                 |
| `AlertDialog`        | Destructive action confirmation (delete deck, account).                               |
| `TabNav`             | Accessible tablist for Deck Detail (& Profile sub-sections).                          |
| `InfiniteScrollList` | Intersection-observer trigger to auto-load pages.                                     |
| `ErrorBoundary`      | Catches React errors and renders fallback UI.                                         |
| `ThemeToggle`        | Switch between system, light, dark; persists to localStorage.                         |

---

### Edge Cases & Error States Covered

• API errors mapped to toasts or inline alerts (400 validation inline, 401/403 logout & redirect, 429 cooldown modal).  
• Generation timeout/failure shows retry button in progress modal.  
• Empty datasets (no decks, no flashcards, no reviews) show contextual empty-state components.  
• Network offline: global alert banner; buttons disabled, retries queued when online.  
• Large text input (>10 000 chars) validation pre-submit with character counter.

### Requirement & Story Mapping

Each FR & US from PRD is satisfied by UI elements:
• FR-01/US-003 ➜ Flashcard Generation button & progress modal.  
• FR-02/US-005 ➜ “Add Flashcard” action in Deck Detail.  
• FR-03/US-004 ➜ Generated Cards Review stepper.  
• FR-04/06 ➜ Flashcard Edit Dialog inline.  
• FR-05 ➜ Supabase auth, RLS; guarded routes.  
• FR-06/US-007 ➜ Review Session view.  
• FR-07 ➜ Review queue fetched by `/reviews/queue`.  
• FR-08/US-001/002 ➜ Login & Signup views.  
• FR-09 ➜ Optimistic context logs events.  
• FR-10/US-008 ➜ Error toast & retry.  
• FR-11/US-009 ➜ Account delete in Profile.  
• FR-12/US-010 ➜ Tailwind palette, Shadcn/ui, WCAG AA rules.  
• FR-13/US-011 ➜ Metrics tab (Stats) & Privacy page.

### Known Unresolved Items

1. Exact API contract for optimistic mutation queue.
2. Infinite scroll thresholds & scroll-position restore.
3. Detailed charts for Stats tab.
4. Error monitoring solution (console vs external).
5. Future notification badge strategy.
6. i18n scaffolding.
