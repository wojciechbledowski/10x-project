# View Implementation Plan - Review Session

## 1. Overview

The Review Session view implements the daily spaced-repetition workflow where users review flashcards that are due based on the SM-2 algorithm. Users see cards sequentially, can flip between front and back content, and rate their recall quality using a 0-5 scale. The view tracks response latency, updates card scheduling automatically, and provides progress tracking throughout the session. This is a core feature that enables effective spaced repetition learning with proper accessibility support and mobile-first design.

## 2. View Routing

The view is accessible at `/review` as a dedicated page in the application. Users navigate to this page through the main navigation or are redirected after completing other actions that trigger reviews.

## 3. Component Structure

```
ReviewSessionView (Page Component)
├── ReviewSessionHeader
│   ├── SessionTitle ("Daily Review")
│   ├── ProgressBar (cards completed/total)
│   └── ExitButton (with confirmation)
├── ReviewCard
│   ├── CardContainer (with flip animation)
│   │   ├── CardFront (clickable to reveal back)
│   │   └── CardBack (shows after flip)
│   └── FlipHint ("Press Space or click to reveal")
├── QualityButtons
│   ├── QualityButton (score 0-5, 6 buttons total)
│   │   ├── ButtonLabel ("Again", "Hard", "Good", "Easy")
│   │   └── QualityScore (0-5)
│   └── KeyboardHints ("or press 1-5")
└── SessionFooter
    ├── CardCounter ("Card 3 of 25")
    └── SessionStats (average latency, time remaining estimate)
```

## 4. Component Details

### ReviewSessionView

**Component description**: Main page component that orchestrates the entire review session, managing queue loading, card navigation, review submission, and session completion.

**Main elements**:

- Full-page layout with centered card display
- Header with progress and exit controls
- Main card area with flip animation
- Quality selection buttons below card
- Footer with session statistics

**Handled interactions**:

- Initial queue loading on mount
- Card progression after quality selection
- Session exit with progress saving
- Keyboard shortcuts for power users
- Touch gestures for mobile users

**Handled validation**:

- Queue loading validation (handle empty queue)
- Quality score validation (0-5 range)
- Session state validation (prevent invalid transitions)
- Authentication validation (redirect if not logged in)

**Types**:

- Uses `ReviewQueueResponse`, `CreateReviewRequest`, `ReviewResponse`
- Custom view models: `ReviewCardVM`, `ReviewSessionVM`, `QualityScore`

**Props**:

- No props (standalone page component)

### ReviewCard

**Component description**: Displays the current flashcard with front/back content and flip animation. Handles the reveal interaction that shows the back of the card.

**Main elements**:

- Card container with perspective for 3D flip effect
- Front side showing question/prompt
- Back side showing answer/explanation
- Visual flip animation using CSS transforms
- Click target overlay for flip interaction

**Handled interactions**:

- Click anywhere on card to flip
- Space key to flip
- Touch tap on mobile
- Animation state management

**Handled validation**:

- Content validation (ensure front/back exist)
- Animation state validation (prevent rapid flipping)
- Accessibility validation (proper ARIA labels)

**Types**:

- `ReviewCardVM`: `{ id: string; front: string; back: string; isFlipped: boolean; showBack: boolean }`

**Props**:

- `card: ReviewCardVM` - Current card data and display state
- `onFlip: () => void` - Callback when card is flipped

### QualityButtons

**Component description**: Quality rating buttons allowing users to rate their recall performance (0-5 scale) which feeds into the SM-2 algorithm.

**Main elements**:

- Six buttons arranged horizontally (0-5)
- Each button shows score number and descriptive label
- Keyboard shortcuts (1-6 keys) indicated
- Loading state during submission
- Visual feedback for selection

**Handled interactions**:

- Button clicks to select quality score
- Keyboard number keys (1-6 for scores 0-5)
- Enter key to confirm selection
- Focus management between buttons

**Handled validation**:

- Score range validation (0-5)
- Single selection enforcement
- Disabled state during submission
- Keyboard navigation validation

**Types**:

- `QualityScore`: `0 | 1 | 2 | 3 | 4 | 5`
- `QualityButtonConfig`: `{ score: QualityScore; label: string; description: string; color: string }`

**Props**:

- `onQualitySelect: (score: QualityScore) => void` - Callback when quality is selected
- `isSubmitting: boolean` - Loading state during submission
- `disabled: boolean` - Overall disabled state

### ProgressBar

**Component description**: Visual progress indicator showing session completion status with current card position and total cards.

**Main elements**:

- Linear progress bar showing completion percentage
- Text indicator ("3 of 25 cards")
- Time estimate for session completion
- Responsive design for mobile/desktop

**Handled interactions**:

- Visual updates on card completion
- No user interactions (display-only)

**Handled validation**:

- Progress calculation validation (current ≤ total)
- Display formatting validation (proper percentages)
- Edge case handling (0 cards, 1 card)

**Types**:

- `ProgressData`: `{ current: number; total: number; percentage: number }`

**Props**:

- `current: number` - Current card index (1-based)
- `total: number` - Total cards in session
- `className?: string` - Optional styling classes

## 5. Types

### Existing Types Used

```typescript
// From @/types.ts
export interface ReviewQueueResponse {
  data: FlashcardResponse[];
  totalDue: number;
}

export interface CreateReviewRequest {
  flashcardId: string;
  quality: number; // 0-5
  latencyMs?: number;
}

export interface ReviewResponse {
  id: string;
  flashcardId: string;
  quality: number;
  createdAt: string;
  flashcard: {
    id: string;
    easeFactor: number;
    intervalDays: number;
    repetition: number;
    nextReviewAt: string | null;
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

### New Types Required

```typescript
// View-specific types for the review session
export type QualityScore = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewCardVM {
  id: string;
  front: string;
  back: string;
  source: FlashcardSource;
  isFlipped: boolean;
  showBack: boolean;
}

export interface ReviewSessionVM {
  currentCardIndex: number; // 0-based
  totalCards: number;
  completedCards: number;
  sessionStartTime: Date;
  averageLatencyMs: number;
}

export interface QualityButtonConfig {
  score: QualityScore;
  label: string;
  description: string;
  color: string; // Tailwind color class
}

export interface ProgressData {
  current: number;
  total: number;
  percentage: number;
}
```

## 6. State Management

State management is handled through a custom `useReviewSession` hook that encapsulates all review session logic:

**Hook State Variables**:

- `queue: ReviewQueueResponse | null` - Current review queue data
- `currentCard: ReviewCardVM | null` - Current card being reviewed
- `sessionProgress: ReviewSessionVM` - Session progress tracking
- `isLoading: boolean` - Initial queue loading state
- `isSubmitting: boolean` - Review submission loading state
- `error: string | null` - Error state for failed operations

**Hook Functions**:

- `loadQueue(): Promise<void>` - Load today's due flashcards
- `submitReview(quality: QualityScore): Promise<void>` - Submit quality rating and advance
- `flipCard(): void` - Flip current card front/back
- `exitSession(): Promise<void>` - Exit session with confirmation
- `getNextCard(): ReviewCardVM | null` - Get next card in queue

**Local Component State**:

- ReviewCard: `isFlipped`, `showBack` (for animation timing)
- QualityButtons: `selectedScore` (visual feedback)
- ReviewSessionView: `showExitConfirm` (exit confirmation dialog)

The hook implements optimistic updates for review submissions, updating the UI immediately while making API calls in the background with automatic rollback on failure.

## 7. API Integration

The view integrates with review endpoints through the `useReviewSession` hook:

**GET /reviews/queue** - Load daily review queue

- **Request**: `GET /reviews/queue`
- **Response**: `ReviewQueueResponse`
- **Purpose**: Fetch all flashcards due for review today, ordered by next_review_at
- **Error Handling**: Network errors show retry option, empty queue shows completion message
- **Caching**: No caching due to time-sensitive nature of due dates

**POST /reviews** - Submit review quality

- **Request**: `POST /reviews` with `CreateReviewRequest`
- **Request Body**:
  ```json
  {
    "flashcardId": "uuid",
    "quality": 4,
    "latencyMs": 3500
  }
  ```
- **Response**: `ReviewResponse`
- **Purpose**: Record quality score, update SM-2 scheduling, return new card timing
- **Rate Limiting**: Subject to API rate limits, handled with retry logic
- **Optimistic Updates**: UI advances immediately, rolls back on API failure

## 8. User Interactions

### Primary Interactions

1. **Session Start**: Page loads and automatically fetches due cards
2. **Card Review**: Click card or press Space to reveal answer
3. **Quality Rating**: Click quality button or press number key (1-6)
4. **Progression**: Automatic advancement to next card after rating
5. **Session Completion**: Automatic exit when no more cards due
6. **Manual Exit**: Click exit button with confirmation dialog

### Keyboard Interactions

- **Space**: Flip card to reveal answer
- **1-6**: Select quality scores (0-5)
- **Enter**: Confirm quality selection
- **Escape**: Show exit confirmation
- **Tab/Shift+Tab**: Navigate focusable elements
- **Arrow Keys**: Navigate between quality buttons

### Touch/Mobile Interactions

- **Tap Card**: Flip to reveal answer
- **Tap Quality Button**: Select rating
- **Swipe**: Navigate between cards (future enhancement)
- **Long Press**: Show card details (future enhancement)

### Accessibility Interactions

- **Screen Reader**: Announces card content and state changes
- **Focus Management**: Proper tab order and focus indicators
- **High Contrast**: All interactions work with high contrast mode
- **Keyboard Only**: Full functionality without mouse/touch

## 9. Conditions and Validation

### API Response Conditions

1. **Authentication Required**: All endpoints require valid JWT token
2. **User Ownership**: Only returns flashcards owned by authenticated user
3. **Due Date Filtering**: Only cards where `next_review_at <= now()` are included
4. **Ordering**: Cards ordered by `next_review_at` ascending (earliest first)
5. **Empty Queue**: Returns empty array when no cards are due

### Component-Level Validation

1. **Quality Score Validation**:
   - Must be integer 0-5
   - Prevents submission of invalid scores
   - Visual feedback for valid/invalid states

2. **Card Content Validation**:
   - Front content must exist and be non-empty
   - Back content must exist and be non-empty
   - Graceful handling of missing content

3. **Session State Validation**:
   - Prevents actions during loading states
   - Validates card progression logic
   - Ensures proper session completion

4. **UI State Validation**:
   - Card flip state consistency
   - Progress bar accuracy
   - Button disabled states during operations

## 10. Error Handling

### Network Errors

- **Queue Loading Failure**: Shows error message with retry button, prevents session start
- **Review Submission Failure**: Shows toast error, allows retry without advancing card
- **Partial Session Loss**: Saves progress in localStorage, offers resume on return
- **Rate Limiting**: Shows cooldown message, automatic retry with backoff

### Validation Errors

- **Invalid Quality Score**: Inline validation prevents submission, shows error message
- **Missing Card Data**: Fallback display with error logging, continues session
- **Session State Corruption**: Reset to safe state, reload queue if possible

### Edge Cases

- **Empty Review Queue**: Shows "All caught up!" message with suggestions
- **Single Card Queue**: Simplified UI, auto-exit after single review
- **Very Large Queue**: Progress saving every 10 cards, memory optimization
- **Browser Refresh**: Progress loss warning, option to restart session

### User Experience Errors

- **Slow Network**: Loading indicators, optimistic updates
- **Session Interruption**: Confirmation dialogs, progress preservation
- **Accessibility Issues**: Screen reader announcements, keyboard fallbacks
- **Mobile Issues**: Touch target sizing, gesture conflict resolution

## 11. Implementation Steps

1. **Create Review Session Types**
   - Add `ReviewCardVM`, `ReviewSessionVM`, `QualityScore` to `@/types.ts`
   - Define `QualityButtonConfig` and `ProgressData` interfaces

2. **Implement useReviewSession Hook**
   - Create custom hook for session state management
   - Implement queue loading and card progression logic
   - Add optimistic updates for review submissions
   - Handle error states and loading indicators

3. **Build ReviewCard Component**
   - Implement flip animation with CSS transforms
   - Add click and keyboard interaction handlers
   - Ensure proper accessibility attributes
   - Handle content display and formatting

4. **Create QualityButtons Component**
   - Build six quality rating buttons with proper styling
   - Implement keyboard shortcuts (1-6 keys)
   - Add loading states and validation feedback
   - Ensure mobile-friendly touch targets

5. **Implement ProgressBar Component**
   - Create visual progress indicator
   - Add responsive design for mobile/desktop
   - Implement proper percentage calculations
   - Add session statistics display

6. **Build ReviewSessionView Page Component**
   - Integrate all sub-components
   - Implement page routing at `/review`
   - Add session lifecycle management
   - Handle authentication and error states

7. **Add Keyboard Navigation**
   - Implement global keyboard event handlers
   - Add focus management and tab order
   - Ensure accessibility compliance
   - Test with screen readers

8. **Implement Mobile Responsiveness**
   - Optimize touch interactions
   - Ensure proper viewport handling
   - Add mobile-specific gesture support
   - Test across device sizes

9. **Add Error Boundaries and Logging**
   - Implement error boundary components
   - Add client-side error logging
   - Handle unexpected errors gracefully
   - Add user-friendly error messages

10. **Testing and Validation**
    - Unit tests for all components and hooks
    - Integration tests for API interactions
    - Accessibility testing with automated tools
    - Performance testing with large card queues
    - Cross-browser and mobile device testing
