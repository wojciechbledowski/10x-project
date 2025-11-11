# View Implementation Plan - Flashcards Tab

## 1. Overview

The Flashcards Tab view provides a comprehensive interface for managing flashcards within a specific deck. Users can view all flashcards with their front/back content and source badges, edit individual cards through a modal dialog, and navigate through paginated results with infinite scrolling. The view supports optimistic updates for better UX and includes proper accessibility features like modal focus trapping.

## 2. View Routing

The view is accessible at the path `/decks/:deckId/flashcards`, where `:deckId` is a URL parameter representing the specific deck identifier. This route is part of the deck detail layout and is rendered within the `DeckDetailLayout.astro` component.

## 3. Component Structure

```
FlashcardsTabView (Astro page)
├── DeckDetailLayout (Astro layout)
│   └── FlashcardList (React component)
        ├── FlashcardListInner (React component)
        │   ├── FlashcardActions (div)
        │   │   ├── CardCount (p)
        │   │   └── ActionButtons (div)
        │   │       ├── AddCardButton (Button)
        │   │       └── GenerateFlashcardsButton (Button)
        │   ├── FlashcardsList (div)
        │   │   ├── FlashcardItem[] (React components)
        │   │   └── LoadMoreTrigger (React component)
        │   └── EditFlashcardDialog (React component)
        └── I18nProvider (React context)
```

## 4. Component Details

### FlashcardList

**Component description**: Main container component that orchestrates the flashcards display, manages state for editing, and handles the overall layout of the flashcards tab.

**Main elements**:

- FlashcardListInner - Inner component wrapped with I18nProvider
- Actions section with card count and action buttons
- Flashcards list container
- Edit dialog integration

**Handled interactions**:

- Edit button clicks on individual cards
- Dialog open/close state management
- Save operations for card edits

**Handled validation**: None directly (delegated to EditFlashcardDialog and useFlashcards hook)

**Types**:

- FlashcardListProps: `{ deckId: string; lang: Language }`
- Uses FlashcardVM[] from the useFlashcards hook

**Props**:

- `deckId: string` - The deck identifier from URL params
- `lang: Language` - Current language for internationalization

### FlashcardItem

**Component description**: Individual flashcard display component showing front/back content with source badges and edit functionality.

**Main elements**:

- Card container with border and padding
- Front content section with label and text
- Back content section with label and text
- Source badge in top-right corner
- Edit button with icon

**Handled interactions**:

- Edit button click triggers onEdit callback

**Handled validation**: None (display-only component)

**Types**:

- FlashcardItemProps: `{ card: FlashcardVM; lang: Language; onEdit: (card: FlashcardVM) => void }`
- FlashcardVM interface

**Props**:

- `card: FlashcardVM` - The flashcard data to display
- `lang: Language` - Language for i18n
- `onEdit: (card: FlashcardVM) => void` - Callback for edit actions

### EditFlashcardDialog

**Component description**: Modal dialog for editing flashcard front and back content with validation and error handling.

**Main elements**:

- Dialog container with proper focus management
- Front textarea with character counter
- Back textarea with character counter
- Error display area
- Footer with Cancel/Save buttons

**Handled interactions**:

- Text input changes
- Save button clicks with validation
- Cancel button clicks with form reset
- Dialog open/close state

**Handled validation**:

- Front content required (non-empty after trim)
- Back content required (non-empty after trim)
- Front content max length (1000 characters)
- Back content max length (1000 characters)

**Types**:

- EditFlashcardDialogProps: `{ card: FlashcardVM | null; lang: Language; isOpen: boolean; setIsOpen: (isOpen: boolean) => void; onSave: (cardId: string, updates: { front: string; back: string }) => Promise<void> }`

**Props**:

- `card: FlashcardVM | null` - Card being edited or null
- `lang: Language` - Language for i18n
- `isOpen: boolean` - Dialog visibility state
- `setIsOpen: (isOpen: boolean) => void` - State setter for dialog visibility
- `onSave: (cardId: string, updates: { front: string; back: string }) => Promise<void>` - Save callback

### LoadMoreTrigger

**Component description**: Invisible trigger component that loads more flashcards when scrolled into view, implementing infinite scrolling.

**Main elements**:

- IntersectionObserver-watched div element
- Loading spinner during load operations
- Empty div when not loading

**Handled interactions**:

- Automatic intersection detection triggers loadMore callback

**Handled validation**: None

**Types**: No props interface (uses inline function types)

**Props**: None (internal component with callback dependencies)

## 5. Types

### Existing Types Used

```typescript
// From @/types.ts
export interface FlashcardVM {
  id: string;
  front: string;
  back: string;
  source: FlashcardSource;
  nextReviewAt: string | null;
}

export type FlashcardSource = Enums<"source_enum">; // 'manual' | 'ai' | 'ai_generated' | 'ai_edited'

export interface FlashcardsListResponse {
  data: FlashcardResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface FlashcardResponse {
  id: string;
  front: string;
  back: string;
  deckId: string | null;
  source: FlashcardSource;
  easeFactor: number;
  intervalDays: number;
  repetition: number;
  nextReviewAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  deletedAt: string | null;
}
```

### New Types (None required)

No additional types are needed beyond the existing shared types in `@/types.ts`.

## 6. State Management

State management is handled through the `useFlashcards` custom hook, which provides:

- `flashcards: FlashcardVM[]` - Array of flashcards in view model format
- `isLoading: boolean` - Loading state for initial fetch
- `isLoadingMore: boolean` - Loading state for pagination
- `error: string | null` - Error message if any
- `hasMore: boolean` - Whether more pages are available
- `loadMore: () => void` - Function to load next page
- `updateFlashcard: (cardId: string, updates: { front?: string; back?: string }) => Promise<void>` - Update function with optimistic updates
- `refresh: () => void` - Function to refresh the entire list

Local component state includes:

- `editingCard: FlashcardVM | null` - Currently editing card
- `isEditDialogOpen: boolean` - Dialog visibility state

The hook implements optimistic updates for flashcard editing, updating the UI immediately while making the API call in the background, with automatic rollback on failure.

## 7. API Integration

The view integrates with the `/api/flashcards` endpoint through the `useFlashcards` hook:

**GET /api/flashcards** - List flashcards with pagination

- **Request**: `GET /api/flashcards?deckId={deckId}&page={page}&pageSize={pageSize}&sort=-created_at`
- **Response**: `FlashcardsListResponse`
- **Purpose**: Fetches paginated flashcards for the specified deck, sorted by creation date descending

**PATCH /api/flashcards/{cardId}** - Update flashcard

- **Request**: `PATCH /api/flashcards/{cardId}` with body `{ front?: string; back?: string }`
- **Response**: `FlashcardResponse`
- **Purpose**: Updates flashcard content with optimistic UI updates

Rate limiting is enforced on flashcard creation (50 per minute per user) but not on listing/updating operations.

## 8. User Interactions

### Primary Interactions

1. **View Flashcards**: Users can scroll through the paginated list of flashcards, each showing front/back content and source badge.

2. **Edit Flashcard**: Clicking the edit button on any flashcard opens the edit dialog with pre-filled front/back content.

3. **Modify Content**: In the edit dialog, users can modify front and back content with real-time character counting.

4. **Save Changes**: Clicking "Save" validates content and updates the flashcard with optimistic UI updates.

5. **Cancel Editing**: Clicking "Cancel" or pressing Escape closes the dialog without saving changes.

6. **Load More**: Scrolling to the bottom automatically loads more flashcards when available.

### Keyboard Interactions

- **Enter/Escape**: In edit dialog for save/cancel operations
- **Tab**: Proper focus management within modal dialogs
- **Modal Focus Trap**: Focus is contained within the edit dialog when open

### Touch/Mobile Interactions

- **Tap to Edit**: Touch-friendly edit buttons on mobile devices
- **Scroll**: Native scrolling for pagination with intersection observer trigger

## 9. Conditions and Validation

### API Response Conditions

1. **Authentication Required**: All API calls require authenticated user (handled by middleware)
2. **Deck Ownership**: Users can only access flashcards from decks they own
3. **Pagination Limits**: pageSize maximum is 100 (enforced by API)
4. **Rate Limiting**: Flashcard creation limited to 50 per minute per user (though not used in this view)

### Component-Level Validation

1. **Edit Dialog Validation**:
   - Front content cannot be empty after trimming
   - Back content cannot be empty after trimming
   - Front content cannot exceed 1000 characters
   - Back content cannot exceed 1000 characters

2. **UI State Conditions**:
   - Edit button disabled during loading states
   - Save button disabled during update operations
   - Load more only triggered when not already loading and more pages exist
   - Empty state shown when no flashcards exist

3. **Error States**:
   - Network errors display retry options
   - Validation errors shown inline in edit dialog
   - API errors trigger optimistic update rollback

## 10. Error Handling

### Network Errors

- Failed flashcard list fetches show error message with retry button
- Failed updates trigger optimistic update rollback with error toast
- Loading states prevent multiple simultaneous operations

### Validation Errors

- Required field errors displayed inline in edit dialog
- Character limit errors shown with current count
- Form prevents submission until all validation passes

### Edge Cases

- Empty flashcard list shows appropriate empty state
- Invalid deck ID handled by API with 404 response
- Unauthorized access handled by middleware redirect
- Component gracefully handles missing or malformed data

### Accessibility Error States

- Error messages associated with form fields using aria-describedby
- Color-only error states avoided (text + icons used)
- Screen reader announcements for dynamic content changes

## 11. Implementation Steps

1. **Set up the Astro page structure** (`/decks/[deckId]/flashcards.astro`)
   - Import DeckDetailLayout
   - Extract deckId from params
   - Render FlashcardList component with client:load directive

2. **Implement FlashcardList container component**
   - Create wrapper with I18nProvider
   - Add state for edit dialog management
   - Implement edit handlers and dialog integration

3. **Create FlashcardItem display component**
   - Implement front/back content display
   - Add source badges with appropriate styling
   - Include edit button with accessibility labels

4. **Build EditFlashcardDialog component**
   - Implement modal with proper focus management
   - Add textarea inputs with character counting
   - Include validation logic and error display
   - Handle save/cancel operations with loading states

5. **Implement LoadMoreTrigger component**
   - Set up IntersectionObserver for infinite scrolling
   - Handle loading states and visual feedback

6. **Create useFlashcards custom hook**
   - Implement API calls for fetching and updating
   - Add optimistic update logic with rollback
   - Handle pagination and loading states

7. **Add internationalization support**
   - Implement translation keys for all user-facing text
   - Support multiple languages through I18nProvider

8. **Implement responsive design**
   - Ensure mobile-first approach with Tailwind classes
   - Test touch interactions and keyboard navigation

9. **Add accessibility features**
   - Implement ARIA labels and descriptions
   - Ensure WCAG AA compliance with proper contrast
   - Add focus management and keyboard navigation

10. **Testing and validation**
    - Test all user interactions and edge cases
    - Verify API integration and error handling
    - Validate accessibility with automated tools
