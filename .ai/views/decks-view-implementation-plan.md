# View Implementation Plan – Decks List (`/decks`)

## 1. Overview

The Decks List view allows an authenticated user to browse their flashcard decks, sort them, and create new ones. It presents each deck as a card showing its name, total card count, and the number of cards currently due for review. When the user has no decks, an Empty State prompts them to create their first deck. Creation is handled via an accessible modal with optimistic UI while the deck is persisted through the `/decks` API.

## 2. View Routing

- **Path:** `/decks`
- **Route file:** `src/pages/decks/index.astro`
  - Uses `prerender = false` (requires user session).
  - Imports React components bound with `client:visible` or `client:load`.

## 3. Component Structure

```
DecksPage (Astro page)
└── <DecksApp />  (React root)
    ├── HeaderBar
    │   ├── SortDropdown
    │   └── CreateDeckButton  (opens modal)
    ├── DeckGrid  (renders grid or EmptyState)
    │   ├── DeckCard  (N)
    │   └── EmptyState  (when decks.length === 0)
    └── CreateDeckModal (portal)
```

## 4. Component Details

### 4.1 `<DecksApp />`

- **Purpose:** Top-level React component that loads decks, manages state, and renders children.
- **Main elements:** `useEffect` fetch call → state; context provider for deck actions (optional).
- **Handled interactions:**
  - Fetch list on mount / when `sort` changes.
  - Handle page change (infinite scroll or paginator – MVP: none, fetch all for now).
  - Refresh list after deck creation.
- **Validation:** N/A (delegates to sub-components).
- **Types:** `DecksListResponse`, `DeckCardVM`.
- **Props:** None (data fetched internally).

### 4.2 `HeaderBar`

- **Purpose:** Toolbar grouping deck actions.
- **Elements:** flex container with `SortDropdown` & `CreateDeckButton`.
- **Events:**
  - `onSortChange(sortKey)` → lifts to `<DecksApp />`.
  - `onOpenCreate()` → toggles modal.
- **Validation:** None.
- **Props:** `{ sort: string; onSortChange: (k: SortKey) => void; onOpenCreate: () => void }`.

### 4.3 `SortDropdown`

- **Purpose:** Change deck ordering ("Newest", "Alphabetical", "Due first").
- **Elements:** Shadcn `<Select>`; visually hidden label.
- **Events:** `onValueChange` → lifts up.
- **Validation:** value ∈ `SortKey` enum.
- **Types:** `SortKey = "created_at" | "-created_at" | "name" | "due"`.
- **Props:** `{ value: SortKey; onChange: (v: SortKey) => void }`.

### 4.4 `CreateDeckButton`

- **Purpose:** CTA to open modal; in Empty State and Header.
- **Elements:** `<Button>` with `aria-label="Create deck"`.
- **Events:** `onClick` opens modal.
- **Props:** `{ onClick: () => void; variant?: "primary" | "outline" }`.

### 4.5 `DeckGrid`

- **Purpose:** Responsive grid wrapper.
- **Elements:** CSS grid with Tailwind `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- **Events:** None.
- **Props:** `{ decks: DeckCardVM[]; onSelect: (id: string) => void }`.

### 4.6 `DeckCard`

- **Purpose:** Visual card for a deck.
- **Elements:**
  - Card container with focus ring & role="button".
  - Name (heading), counts (badge chips).
- **Events:**
  - `onClick` / `onKeyPress="Enter"` → navigate to `/decks/{id}`.
- **Validation:** None.
- **Types:** `DeckCardVM`.
- **Props:** `{ deck: DeckCardVM; onSelect: (id: string) => void }`.

### 4.7 `EmptyState`

- **Purpose:** When no decks exist.
- **Elements:** Illustration SVG, explanatory text, primary `CreateDeckButton`.
- **Events:** CTA click.
- **Validation:** None.
- **Props:** `{ onCreate: () => void }`.

### 4.8 `CreateDeckModal`

- **Purpose:** Dialog to enter deck name and submit.
- **Elements:**
  - `<Dialog>` from Shadcn.
  - Form with `<Input>` (name) and Submit button.
  - Validation messages.
- **Events:**
  - `onSubmit` → calls create API.
  - `onOpenChange` (close after success / cancel).
- **Validation:**
  - `name` required, max 255 chars (frontend + schema via zod).
- **Types:** `CreateDeckRequest`, form state.
- **Props:** `{ open: boolean; onOpenChange: (o:boolean)=>void; onCreated?: (deck: DeckCardVM)=>void }`.

## 5. Types

```ts
// View-model used by DeckCard & DeckGrid
export interface DeckCardVM {
  id: string;
  name: string;
  totalCards: number; // cardCount from API
  dueCards: number; // to be added to API later – initially 0
}

// Sort key enum (kept in view layer)
export type SortKey = "created_at" | "-created_at" | "name" | "due";
```

Existing shared types reused:

- `DeckResponse`, `DecksListResponse`, `CreateDeckRequest` (from `src/types.ts`).

## 6. State Management

Custom hook **`useDecks`** encapsulates list fetching, sort, loading & error.

```ts
const { decks, loading, error, refetch, sort, setSort } = useDecks();
```

- Internally uses `useState` + `useEffect` to fetch `/api/decks?sort=${sort}`.
- Provides `createDeck(name)` method performing optimistic update (adds temp deck with local UUID until API resolves or rolls back on error).
- Error state surfaced for toast.

Global state library not required; keep local inside view.

## 7. API Integration

### GET /decks

- **Request:** `GET /api/decks?page=1&pageSize=50&sort={sort}`
- **Response:** `DecksListResponse`.
- **Implementation:** `useDecks` fetch on mount & whenever `sort` changes.

### POST /decks

- **Request body:** `CreateDeckRequest` JSON `{ name: string }`.
- **Response:** `201 Created` with `DeckResponse`.
- **Implementation:** `createDeck` function in `useDecks`.
- **Optimistic flow:**
  1. Add temp deck to list with negative `id` placeholder.
  2. Send POST; replace on success; rollback & toast on error.

## 8. User Interactions

1. **Page load** → decks fetched, shimmer skeleton shown.
2. **Sort change** → list refetched, focus returns to first card.
3. **Click deck card / press Enter when focused** → navigate to deck detail route.
4. **Click “Create deck”** → open modal, focus in input.
5. **Submit modal** → optimistic add, modal closes, toast success.
6. **Modal cancel / Esc** → modal closes, focus returns to CreateDeckButton.

## 9. Conditions & Validation

- Deck name must be non-empty & ≤ 255 chars (checked via zod & HTML `maxLength`).
- API 401 → redirect to `/auth/login` (middleware already handles).
- API 429 → show toast: “You’re creating decks too quickly. Try again in X s.”
- API 409 (name conflict) → inline field error under input.

## 10. Error Handling

- **Network / 500**: toast with retry button calling `refetch`.
- **Optimistic failure**: remove temp deck, reopen modal with previous value.
- **Empty list**: render `EmptyState`.
- **Accessibility**: all buttons/links have `aria-label`; modal traps focus; cards keyboard-navigable via `tabIndex={0}`.

## 11. Implementation Steps

1. **Route Setup**: create `src/pages/decks/index.astro` with `client:load` mounted `<DecksApp />`.
2. **Types**: Add `DeckCardVM`, `SortKey` to `src/types.ts` or local file.
3. **Hook**: Implement `useDecks` in `src/components/hooks/useDecks.ts`.
4. **Components**:
   a. `DeckCard` in `src/components/decks/DeckCard.tsx`.
   b. `DeckGrid` wrapper.
   c. `SortDropdown`, `CreateDeckButton`, `EmptyState`.
   d. `CreateDeckModal` using Shadcn `Dialog` & `zod` resolver.
5. **UI Layout**: Build `HeaderBar` with Tailwind flex.
6. **Optimistic Create**: implement logic + toast via existing `ToasterProvider`.
