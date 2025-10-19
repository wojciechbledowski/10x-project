# View Implementation Plan: Deck Detail

## 1. Overview

This document outlines the implementation plan for the "Deck Detail" view. This view serves as a centralized hub for managing a single deck, providing users with the ability to view and edit its flashcards, analyze performance statistics, and modify deck settings such as its name or status. The view is structured with a tabbed navigation system to logically separate these functions.

## 2. View Routing

The view will be accessible via nested routes under `/decks/[deckId]`. The active content will be determined by the specific sub-route:

- **Wrapper Layout**: `src/layouts/DeckDetailLayout.astro`. This layout will use the root `Layout.astro`.
- **Flashcards Tab**: `src/pages/decks/[deckId]/flashcards.astro` (This will be the default tab)
- **Stats Tab**: `src/pages/decks/[deckId]/stats.astro`
- **Settings Tab**: `src/pages/decks/[deckId]/settings.astro`
- A redirect will be set up from `/decks/[deckId]` to `/decks/[deckId]/flashcards`.

## 3. Component Structure

The view is composed of the root layout, a specialized wrapper layout for this view, and specific components for each tab.

```
- Layout.astro (Existing root layout)
  - Header.tsx (Displays page title, which will be the deck name)

- DeckDetailLayout.astro (Wrapper layout for this view)
  - (Uses Layout.astro)
  - TabNav.tsx (Tab navigation links)
  - <slot /> (Renders active tab's content)

- Flashcards Tab (flashcards.astro)
  - FlashcardList.tsx
    - FlashcardItem.tsx
    - EditFlashcardDialog.tsx
    - LoadMoreTrigger.tsx

- Stats Tab (stats.astro)
  - StatsPanel.tsx

- Settings Tab (settings.astro)
  - DeckSettingsForm.tsx
  - DeleteDeckDialog.tsx
```

## 4. Component Details

### DeckDetailLayout.astro

- **Description**: The main Astro layout for the deck detail view. It fetches initial deck data, uses the root `Layout.astro` to provide the main page shell (header, side navigation), and renders the `TabNav` component for deck-specific navigation. The deck's name is passed as the `pageTitle` prop to `Layout.astro`.
- **Main Elements**: Wraps content with `Layout.astro` and renders the `TabNav` React component above a `<slot />` for the tab pages.
- **Props**: None. It fetches its own data on the server.

### DeckHeader.tsx

- **Description**: A simple component to display the current deck's name.
- **Main Elements**: `<h1>` containing the deck name.
- **Props**: `deck: DeckDetailVM`

### TabNav.tsx

- **Description**: Displays navigation links for the "Flashcards", "Stats", and "Settings" tabs. It will highlight the active tab based on the current URL.
- **Main Elements**: A list of navigation links (`<a>`).
- **Props**: `deckId: string`

### FlashcardList.tsx

- **Description**: Manages and displays the list of flashcards for the deck. It handles data fetching, infinite scrolling, and optimistic updates for card edits.
- **Main Elements**: A list of `FlashcardItem` components and the `LoadMoreTrigger`.
- **Handled Interactions**: Listens for the `LoadMoreTrigger` to become visible to fetch the next page of results.
- **Types**: `FlashcardVM[]`, `Pagination`
- **Props**: `initialFlashcards: FlashcardsListResponse`, `deckId: string`

### EditFlashcardDialog.tsx

- **Description**: A modal form for editing a flashcard's front and back content.
- **Main Elements**: Shadcn/ui `Dialog` containing a form with two `Textarea` elements and Save/Cancel buttons.
- **Handled Interactions**: Form submission triggers an update request.
- **Handled Validation**:
  - Front content is required (1-1000 characters).
  - Back content is required (1-1000 characters).
- **Types**: `FlashcardVM`, `UpdateFlashcardRequest`
- **Props**: `card: FlashcardVM`, `onSave: (data) => void`, `isOpen: boolean`, `setIsOpen: (isOpen) => void`

### DeckSettingsForm.tsx

- **Description**: A form for updating deck settings, including renaming and initiating soft-deletion.
- **Main Elements**: A form with an `Input` for the name and a "Delete Deck" `Button` that opens the `DeleteDeckDialog`.
- **Handled Interactions**: Submitting the form to rename, clicking the delete button.
- **Handled Validation**:
  - Deck name is required (1-255 characters).
- **Types**: `DeckDetailVM`, `UpdateDeckRequest`
- **Props**: `deck: DeckDetailVM`

### DeleteDeckDialog.tsx

- **Description**: A confirmation modal to prevent accidental deck deletion.
- **Main Elements**: Shadcn/ui `AlertDialog` with a description of the action and Confirm/Cancel buttons.
- **Handled Interactions**: Clicking "Confirm" triggers the delete action.
- **Props**: `onConfirm: () => void`, `isOpen: boolean`, `setIsOpen: (isOpen) => void`

## 5. Types

The implementation will use DTOs from `src/types.ts` for API communication and introduce the following ViewModels (VMs) for client-side state management.

- **`DeckDetailVM`**: Represents the deck's data for display purposes.
  ```typescript
  export interface DeckDetailVM {
    id: string;
    name: string;
    createdAt: string; // Formatted for display
    cardCount: number;
  }
  ```
- **`FlashcardVM`**: A client-side representation of a flashcard.
  ```typescript
  export interface FlashcardVM {
    id: string;
    front: string;
    back: string;
    source: "manual" | "ai_generated" | "ai_edited";
    nextReviewAt: string | null; // Formatted for display
  }
  ```
- **`DeckStatsVM`**: A data structure for the statistics tab.
  ```typescript
  export interface DeckStatsVM {
    dueTodayCount: number;
    newTodayCount: number;
    totalCards: number;
    easeDistribution: { ease: number; count: number }[];
  }
  ```

## 6. State Management

Client-side state will be managed within React components using custom hooks to encapsulate business logic and API interactions.

- **`useFlashcards(deckId, initialData)`**: This hook will manage the state of the flashcards list. It will handle fetching subsequent pages for infinite scroll and perform optimistic updates when a flashcard is edited.
- **`useDeckSettings(deck)`**: This hook will manage the form state for the settings tab, including handling input changes for the deck name and executing the update and delete API calls.

## 7. API Integration

The view will integrate with the existing API endpoints.

- **`GET /api/decks/{deckId}`**: Fetched server-side in `DeckDetailLayout.astro` to get initial deck data.
- **`GET /api/decks/{deckId}/flashcards`**: Fetched by the `useFlashcards` hook to load the list of flashcards. The hook will manage `page` and `pageSize` query parameters.
- **`PATCH /api/flashcards/{cardId}`**: Called from `useFlashcards` to save edits to a specific flashcard.
- **`PATCH /api/decks/{deckId}`**: Called from the `useDeckSettings` hook to either update the deck's name or soft-delete it by passing a `deletedAt` timestamp.

## 8. User Interactions

- **Infinite Scroll**: As the user scrolls down the `FlashcardList`, a trigger element at the bottom will become visible, prompting the `useFlashcards` hook to fetch and append the next page of results.
- **Modal Editing**: Clicking "Edit" on a flashcard will open the `EditFlashcardDialog`. Saving will optimistically update the UI and trigger an API call. The modal will be keyboard-accessible and trap focus.
- **Tab Navigation**: Clicking a tab in the `TabNav` component will navigate the user to the corresponding URL, causing Astro to render the new page content within the shared layout.
- **Soft Deletion**: Clicking "Delete Deck" will open a confirmation dialog. Confirming the action will call the API to soft-delete the deck and then redirect the user to the main `/decks` page.

## 9. Conditions and Validation

- **Client-Side Validation**: Forms for renaming a deck and editing a flashcard will validate inputs against length constraints before enabling the submit button and making an API call.
- **API Error Handling**: If the API returns a validation error (e.g., deck name already exists), the error message will be displayed to the user near the relevant input field.
- **Authorization**: All data fetching will occur after server-side authentication checks in Astro. If a user tries to access a deck they do not own, the API will return a 404, which will be rendered as a "Not Found" page.

## 10. Error Handling

- **Network Errors**: API calls will be wrapped in `try...catch` blocks. If a request fails due to a network error, a global toast notification will be displayed, and the UI will revert any optimistic updates.
- **Not Found (404)**: If the initial deck fetch in `DeckDetailLayout.astro` fails with a 404, an Astro error page will be rendered.
- **Empty States**: If a deck contains no flashcards, the `FlashcardList` component will display an "empty state" message encouraging the user to add cards.

## 11. Implementation Steps

1.  **Create Wrapper Layout**: Implement `src/layouts/DeckDetailLayout.astro`. This layout will fetch the deck data, use the existing `src/layouts/Layout.astro` component (passing the deck name to the `pageTitle` prop), and render the `TabNav` component.
2.  **Implement Settings Tab**: Create the `settings.astro` page which uses `DeckDetailLayout.astro`. Implement the `DeckSettingsForm` and `DeleteDeckDialog` React components and the `useDeckSettings` hook.
3.  **Implement Flashcards Tab**: Create the `flashcards.astro` page using `DeckDetailLayout.astro`. Develop the `FlashcardList`, `FlashcardItem`, and `EditFlashcardDialog` components.
4.  **Develop `useFlashcards` Hook**: Implement the logic for paginated data fetching, infinite scrolling, and optimistic updates for flashcard edits.
5.  **Implement Stats Tab**: Create the `stats.astro` page using `DeckDetailLayout.astro` and a placeholder `StatsPanel` component.
6.  **Set Up Routing**: Create the redirect from `/decks/[deckId]/index.astro` to `/decks/[deckId]/flashcards.astro`.
7.  **Styling and Accessibility**: Apply Tailwind CSS for a responsive, mobile-first design. Ensure all interactive components are fully accessible via keyboard and screen readers, and that focus management is handled correctly for modals.
8.  **Testing**: Manually test all user flows, including success paths, validation, and error handling.
