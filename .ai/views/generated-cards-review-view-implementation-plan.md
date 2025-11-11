# View Implementation Plan - Generated Cards Review

## 1. Overview

The Generated Cards Review view provides a modal-based stepper interface for reviewing AI-generated flashcards after generation completes. Users can navigate through each generated card using a stepper component, with options to accept, edit, or delete each card. The view supports inline editing with front/back content validation, optimistic updates, and keyboard navigation. This view is crucial for the AI generation workflow, allowing users to curate their generated content before adding cards to their deck.

## 2. View Routing

The view is accessible as a modal overlay that can be triggered from the Flashcards Tab view at `/decks/:deckId/flashcards`. It appears when AI generation completes and requires a `batchId` parameter to load the generation results. The modal is conditionally rendered within the existing FlashcardList component.

## 3. Component Structure

```
GeneratedCardsReviewModal (React component)
├── Modal (Dialog component)
│   ├── ModalHeader
│   │   ├── Title ("Review Generated Cards")
│   │   ├── Progress indicator ("X of Y cards")
│   │   └── Close button
│   ├── ModalBody
│   │   ├── StepperNavigation (horizontal stepper)
│   │   │   ├── Step indicators (completed/pending)
│   │   │   └── Previous/Next buttons
│   │   └── CardReviewContent
│   │       ├── CardDisplay (front/back flip animation)
│   │       │   ├── FrontContent (editable)
│   │       │   └── BackContent (editable)
│   │       └── CardActions
│   │           ├── AcceptButton
│   │           ├── EditButton (toggles edit mode)
│   │           └── DeleteButton
│   └── ModalFooter
│       ├── BulkActions
│       │   ├── AcceptAllButton
│       │   ├── DeleteAllButton
│       │   └── CancelButton
│       └── StepperControls
│           ├── PreviousCardButton
│           ├── NextCardButton
│           └── FinishReviewButton
└── LoadingStates
    ├── InitialLoadingSpinner
    └── CardProcessingSpinner
```

## 4. Component Details

### GeneratedCardsReviewModal

**Component description**: Main modal component that orchestrates the entire review process, managing stepper state, card navigation, and batch operations.

**Main elements**:

- Dialog container with full-screen mobile overlay
- Header with progress tracking and close functionality
- Stepper navigation with card indicators
- Card review content with flip animation
- Action buttons for individual and bulk operations
- Footer with navigation and completion controls

**Handled interactions**:

- Modal open/close state management
- Stepper navigation (previous/next card)
- Card actions (accept/edit/delete)
- Bulk operations (accept all/delete all)
- Keyboard navigation (arrow keys, Enter, Escape)
- Touch gestures for mobile card flipping

**Handled validation**:

- Front/back content validation during editing (required, max length)
- Stepper navigation validation (can't proceed past last card)
- Bulk operations require confirmation for destructive actions

**Types**:

- `GeneratedCardsReviewModalProps`: `{ batchId: string; isOpen: boolean; onClose: () => void; onComplete: (acceptedCards: FlashcardResponse[]) => void }`
- Uses `GenerationBatchResponse`, `AiGenerationResponse`, `FlashcardResponse`

**Props**:

- `batchId: string` - Generation batch identifier
- `isOpen: boolean` - Modal visibility state
- `onClose: () => void` - Callback when modal is closed
- `onComplete: (acceptedCards: FlashcardResponse[]) => void` - Callback when review completes with accepted cards

### StepperNavigation

**Component description**: Horizontal stepper showing progress through the generated cards, with clickable step indicators and navigation buttons.

**Main elements**:

- Step indicator dots/circles showing completion status
- Previous/Next navigation buttons
- Current step highlight with card number display
- Progress bar showing overall completion percentage

**Handled interactions**:

- Click on step indicators to jump to specific cards
- Previous/Next button clicks
- Keyboard arrow key navigation
- Touch swipe gestures for mobile

**Handled validation**:

- Previous button disabled on first card
- Next button disabled on last card
- Step indicators disabled for unprocessed cards

**Types**:

- `StepperNavigationProps`: `{ currentStep: number; totalSteps: number; onStepChange: (step: number) => void; cardStatuses: CardStatus[] }`
- `CardStatus`: `'pending' | 'accepted' | 'edited' | 'deleted'`

**Props**:

- `currentStep: number` - Current card index (0-based)
- `totalSteps: number` - Total number of cards to review
- `onStepChange: (step: number) => void` - Callback for step changes
- `cardStatuses: CardStatus[]` - Status of each card in the review

### CardReviewContent

**Component description**: Main content area displaying the current card with front/back flip functionality and inline editing capabilities.

**Main elements**:

- Card container with flip animation
- Front side with content and edit toggle
- Back side with content and edit toggle
- Character counters for edited content
- Visual indicators for card status changes

**Handled interactions**:

- Card flip animation on click/tap
- Inline editing toggle
- Content changes with auto-save on blur
- Keyboard shortcuts for flipping and editing

**Handled validation**:

- Content validation during editing (required, 1-1000 chars)
- Edit mode prevents card navigation until saved or cancelled
- Visual feedback for validation errors

**Types**:

- `CardReviewContentProps`: `{ card: ReviewCardVM; isEditing: boolean; onEditToggle: () => void; onContentChange: (side: 'front' | 'back', content: string) => void; onSave: () => Promise<void> }`
- `ReviewCardVM`: Extended `FlashcardVM` with review status

**Props**:

- `card: ReviewCardVM` - Card data with review status
- `isEditing: boolean` - Whether card is in edit mode
- `onEditToggle: () => void` - Toggle edit mode
- `onContentChange: (side: 'front' | 'back', content: string) => void` - Content change handler
- `onSave: () => Promise<void>` - Save edited content

### CardActions

**Component description**: Action buttons for individual card operations (accept, edit, delete) with confirmation dialogs for destructive actions.

**Main elements**:

- Accept button (primary action)
- Edit button (secondary action)
- Delete button (destructive action)
- Confirmation dialog for delete action
- Loading states during operations

**Handled interactions**:

- Accept button marks card as accepted
- Edit button toggles inline editing mode
- Delete button shows confirmation dialog
- Confirmation dialog accept/cancel

**Handled validation**:

- Delete confirmation required
- Operations disabled during loading states
- Edit mode changes disable other actions

**Types**:

- `CardActionsProps`: `{ cardId: string; status: CardStatus; isEditing: boolean; onAccept: () => void; onEdit: () => void; onDelete: () => void; isProcessing: boolean }`

**Props**:

- `cardId: string` - Card identifier
- `status: CardStatus` - Current card status
- `isEditing: boolean` - Whether card is being edited
- `onAccept: () => void` - Accept card callback
- `onEdit: () => void` - Edit card callback
- `onDelete: () => void` - Delete card callback
- `isProcessing: boolean` - Loading state for operations

## 5. Types

### Existing Types Used

```typescript
// From @/types.ts
export interface GenerationBatchResponse {
  id: string;
  userId: string;
  createdAt: string;
  generations: AiGenerationResponse[];
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  completedCount: number;
  totalCount: number;
}

export interface AiGenerationResponse {
  id: string;
  status: GenerationStatus;
  modelName: string;
  modelVersion: string | null;
  temperature: number | null;
  topP: number | null;
  config: Json;
  promptTokens: number | null;
  completionTokens: number | null;
  errorMessage: string | null;
  createdAt: string;
  deckId: string | null;
  generationBatchId: string | null;
  userId: string;
  flashcards?: FlashcardResponse[];
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

### New Types Required

```typescript
// View-specific types for the review modal
export interface ReviewCardVM {
  id: string;
  front: string;
  back: string;
  source: FlashcardSource;
  status: CardStatus;
  isEdited: boolean;
  originalFront: string;
  originalBack: string;
}

export type CardStatus = "pending" | "accepted" | "edited" | "deleted";

export interface GeneratedCardsReviewModalProps {
  batchId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (acceptedCards: FlashcardResponse[]) => void;
}

export interface StepperNavigationProps {
  currentStep: number;
  totalSteps: number;
  onStepChange: (step: number) => void;
  cardStatuses: CardStatus[];
}

export interface CardReviewContentProps {
  card: ReviewCardVM;
  isFlipped: boolean;
  isEditing: boolean;
  onFlip: () => void;
  onEditToggle: () => void;
  onContentChange: (side: "front" | "back", content: string) => void;
  onSave: () => Promise<void>;
  validationErrors: { front?: string; back?: string };
}

export interface CardActionsProps {
  cardId: string;
  status: CardStatus;
  isEditing: boolean;
  onAccept: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isProcessing: boolean;
}
```

## 6. State Management

State management is handled through a custom `useGeneratedCardsReview` hook that manages the entire review process:

**Hook State Variables**:

- `batch: GenerationBatchResponse | null` - Current generation batch data
- `cards: ReviewCardVM[]` - Array of cards being reviewed with status
- `currentStep: number` - Current card index in stepper (0-based)
- `isLoading: boolean` - Loading state for initial batch fetch
- `isProcessing: boolean` - Loading state for card operations
- `error: string | null` - Error state for failed operations

**Hook Functions**:

- `loadBatch: (batchId: string) => Promise<void>` - Load generation batch and cards
- `acceptCard: (cardId: string) => Promise<void>` - Mark card as accepted
- `editCard: (cardId: string, updates: { front?: string; back?: string }) => Promise<void>` - Update card content
- `deleteCard: (cardId: string) => Promise<void>` - Mark card for deletion
- `acceptAllCards: () => Promise<void>` - Accept all pending cards
- `deleteAllCards: () => Promise<void>` - Delete all pending cards
- `nextCard: () => void` - Navigate to next card in stepper
- `previousCard: () => void` - Navigate to previous card in stepper
- `completeReview: () => void` - Finalize review and return accepted cards

**Local Component State**:

- `isFlipped: boolean` - Card flip state (front/back)
- `isEditing: boolean` - Inline editing mode
- `validationErrors: Record<string, string>` - Form validation errors

The hook implements optimistic updates for all card operations, updating the UI immediately while making API calls in the background with automatic rollback on failure.

## 7. API Integration

The view integrates with multiple endpoints through the `useGeneratedCardsReview` hook:

**GET /generation-batches/{batchId}** - Poll batch status

- **Request**: `GET /generation-batches/{batchId}`
- **Response**: `GenerationBatchResponse`
- **Purpose**: Load generation batch with all associated generations and flashcards
- **Polling**: Automatic polling every 2 seconds until status is COMPLETED or FAILED

**GET /ai-generations/{generationId}** - Get generation results

- **Request**: `GET /ai-generations/{generationId}`
- **Response**: `AiGenerationResponse`
- **Purpose**: Fetch detailed generation results including generated flashcards
- **Usage**: Called for each generation in the batch to get flashcard data

**POST /flashcards** - Save accepted cards

- **Request**: `POST /flashcards` with `CreateFlashcardRequest[]`
- **Response**: `FlashcardResponse[]`
- **Purpose**: Bulk save all accepted cards to the user's deck
- **Rate Limiting**: Subject to 50 flashcards per minute per user

**PATCH /flashcards/{cardId}** - Update edited cards

- **Request**: `PATCH /flashcards/{cardId}` with `UpdateFlashcardRequest`
- **Response**: `FlashcardResponse`
- **Purpose**: Save edits made during review process

**DELETE /flashcards/{cardId}** - Soft delete cards

- **Request**: `DELETE /flashcards/{cardId}`
- **Response**: `204 No Content`
- **Purpose**: Soft delete cards marked for deletion during review

## 8. User Interactions

### Primary Interactions

1. **Modal Opening**: Modal opens automatically when generation completes or manually via "Review Generated Cards" button

2. **Card Navigation**: Users navigate through cards using stepper dots, arrow buttons, or keyboard arrows

3. **Card Review**: Each card can be flipped to view front/back content with smooth animation

4. **Accept Card**: Primary action button marks card as accepted for addition to deck

5. **Edit Card**: Toggle inline editing mode to modify front/back content before accepting

6. **Delete Card**: Mark card for deletion with confirmation dialog

7. **Bulk Actions**: Accept All or Delete All buttons for efficient batch processing

8. **Complete Review**: Finish button saves all accepted cards and closes modal

### Keyboard Interactions

- **Arrow Keys**: Navigate between cards (Left/Right) and flip cards (Up/Down)
- **Enter**: Accept current card or confirm actions
- **Escape**: Cancel editing mode or close confirmation dialogs
- **Tab**: Navigate between interactive elements with proper focus management
- **Space**: Flip card front/back

### Touch/Mobile Interactions

- **Swipe Left/Right**: Navigate between cards in stepper
- **Tap**: Flip card to view opposite side
- **Long Press**: Open context menu for card actions
- **Pinch**: Zoom card content on mobile devices

## 9. Conditions and Validation

### API Response Conditions

1. **Authentication Required**: All API calls require authenticated user (enforced by middleware)

2. **Batch Ownership**: Users can only access generation batches they own

3. **Generation Status**: Modal only opens for COMPLETED batches; shows error for FAILED batches

4. **Rate Limiting**: Flashcard creation limited to 50 per minute per user

5. **Deck Association**: Generated cards inherit deck association from generation request

### Component-Level Validation

1. **Content Validation**:
   - Front content required (non-empty after trim)
   - Back content required (non-empty after trim)
   - Maximum 1000 characters per side
   - HTML sanitization for security

2. **Navigation Validation**:
   - Previous button disabled on first card
   - Next button disabled on last card
   - Step indicators disabled for unprocessed generations

3. **Action Validation**:
   - Accept/Delete disabled during processing
   - Edit mode disables other actions
   - Bulk actions require pending cards to exist

4. **Modal State Validation**:
   - Close disabled during unsaved edits
   - Complete disabled if no cards accepted

## 10. Error Handling

### Network Errors

- Failed batch loading shows error message with retry option
- Failed card operations trigger optimistic update rollback
- Polling errors show toast notifications without blocking UI
- Automatic retry logic for transient failures

### Validation Errors

- Inline validation errors displayed below input fields
- Character counters change color when approaching limits
- Form submission blocked until validation passes
- Real-time validation feedback during typing

### Edge Cases

- Empty generation results show appropriate empty state
- Partial generation failures handled gracefully
- Component handles missing or malformed card data
- Memory management for large card sets with virtualization

### Accessibility Error States

- Error messages linked to inputs with aria-describedby
- Color-independent error indicators (icons + text)
- Screen reader announcements for state changes
- High contrast error styling for WCAG AA compliance

## 11. Implementation Steps

1. **Create ReviewCardVM type and supporting interfaces**
   - Add new types to `@/types.ts`
   - Define CardStatus enum and review-specific interfaces

2. **Implement useGeneratedCardsReview hook**
   - Create hook for batch polling and card management
   - Implement optimistic updates for all operations
   - Add error handling and loading states

3. **Build CardReviewContent component**
   - Implement flip animation for card display
   - Add inline editing with validation
   - Create keyboard and touch interaction handlers

4. **Create StepperNavigation component**
   - Build horizontal stepper with progress indicators
   - Implement navigation controls and keyboard support
   - Add visual feedback for card statuses

5. **Implement CardActions component**
   - Create action buttons with proper styling
   - Add confirmation dialogs for destructive actions
   - Implement loading states and disabled conditions

6. **Build GeneratedCardsReviewModal main component**
   - Integrate all sub-components
   - Implement modal lifecycle management
   - Add bulk operations and completion logic

7. **Add modal trigger to FlashcardList**
   - Integrate modal into existing flashcard generation flow
   - Handle generation completion events
   - Pass batchId and manage modal state

8. **Implement internationalization**
   - Add translation keys for all user-facing text
   - Support multiple languages through existing i18n system

9. **Add accessibility features**
   - Implement ARIA labels and live regions
   - Ensure keyboard navigation and focus management
   - Add screen reader support for dynamic content

10. **Testing and validation**
    - Test all user interactions and edge cases
    - Verify API integration and error handling
    - Validate accessibility with automated tools
    - Performance test with large card sets
