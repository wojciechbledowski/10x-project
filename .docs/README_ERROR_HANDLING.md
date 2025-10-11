# Error Handling Implementation

This document describes the global error handling system implemented in the application.

## Overview

The application uses a **React ErrorBoundary** to catch and handle runtime errors gracefully in React components. When an error occurs, users see a loading message and are redirected to a dedicated error page with recovery options.

## Components

### 1. ErrorBoundary (`src/components/ErrorBoundary.tsx`)

A React class component that catches JavaScript errors anywhere in the child component tree.

**Features:**

- Catches runtime errors in React components
- Logs errors with context (path, stack trace, user agent)
- Shows loading message while redirecting
- Stores source page URL for smart retry functionality
- Redirects to `/error` page after 500ms

**Usage:**
⚠️ **Critical**: ErrorBoundary must be in the **same React tree** as the components it protects. See [Using ErrorBoundary with React Islands](#using-errorboundary-with-react-islands) below.

### 2. Error Page (`/error`)

A dedicated error page (`src/pages/error.astro`) that displays user-friendly error messages and recovery options.

**Features:**

- Displays error message (from query parameter or default)
- "Retry" button to reload the page that caused the error
- "Home" button to navigate to homepage
- Smart retry: only shows "Retry" if there's a source page to return to
- Offline detection (disables retry when offline)
- Full dark mode support
- Accessible (WCAG AA compliant)

### 3. Toast Notifications (Optional)

The project includes Shadcn's Sonner toast component for general notifications.

**Provider:**

- `ToasterProvider` is included in the global layout
- Configured with `position="top-center"` and rich colors
- Not used for error notifications (error page provides better UX)

## Using ErrorBoundary with React Islands

### ⚠️ Critical: ErrorBoundary Must Be in the Same React Tree

**IMPORTANT:** In Astro, each React island with a different hydration directive creates a **separate React root**. An ErrorBoundary can only catch errors within its own React tree.

### ❌ This Does NOT Work:

```astro
---
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MyComponent } from "@/components/MyComponent";
---

<Layout>
  <!-- These are SEPARATE React roots! -->
  <ErrorBoundary client:only="react">
    <MyComponent client:load />
  </ErrorBoundary>
</Layout>
```

The ErrorBoundary cannot catch errors from `MyComponent` because they're in different React trees.

### ✅ This DOES Work:

**Option 1: Single Island (Recommended)**

Create a wrapper component that includes both the boundary and the component:

```tsx
// src/components/MyFeatureWithErrorBoundary.tsx
import { ErrorBoundary } from "./ErrorBoundary";
import { MyComponent } from "./MyComponent";

export function MyFeatureWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

```astro
---
import { MyFeatureWithErrorBoundary } from "@/components/MyFeatureWithErrorBoundary";
---

<Layout>
  <MyFeatureWithErrorBoundary client:load />
</Layout>
```

**Option 2: Same Hydration Strategy**

Use the same directive for both (but this is less flexible):

```astro
<ErrorBoundary client:load>
  <MyComponent client:load />
</ErrorBoundary>
```

Both components now use `client:load` and share the same React root.

### Real Example: Test Error Page

See `src/components/TestErrorBoundary.tsx` for a working example:

```tsx
export function TestErrorBoundary() {
  return (
    <ErrorBoundary>
      <TestErrorButton />
    </ErrorBoundary>
  );
}
```

Used in `src/pages/test-error.astro`:

```astro
<TestErrorBoundary client:load />
```

### Nested ErrorBoundaries

For fine-grained error handling in complex React components, you can add nested ErrorBoundaries:

```tsx
// src/components/ComplexFeature.tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CriticalSection } from "./CriticalSection";
import { FallbackUI } from "./FallbackUI";

export function ComplexFeature() {
  return (
    <div>
      <h1>My Feature</h1>
      {/* This section has its own error boundary */}
      <ErrorBoundary>
        <CriticalSection />
      </ErrorBoundary>
      {/* Other sections continue working even if CriticalSection fails */}
      <OtherSection />
    </div>
  );
}
```

### Manual Error Logging

To manually log errors without triggering the ErrorBoundary redirect:

```tsx
import { logClientError } from "@/lib/logClientError";

try {
  // risky operation
  await fetchData();
} catch (error) {
  logClientError({
    path: window.location.pathname,
    message: error.message,
    stack: error.stack,
    userAgent: navigator.userAgent,
  });

  // Handle error locally without redirecting
  setError(error.message);
}
```

## Smart Retry Functionality

The error page implements intelligent retry behavior:

1. **ErrorBoundary** stores the current page URL in `sessionStorage`:

   ```tsx
   sessionStorage.setItem("errorSourcePage", window.location.href);
   ```

2. **Error page** checks if a source page exists:
   - If yes → Shows "Retry" button that returns to the original page
   - If no (direct visit to `/error`) → Hides "Retry" button

3. **Retry button** navigates back to the stored URL:

   ```tsx
   const sourcePage = sessionStorage.getItem("errorSourcePage");
   window.location.href = sourcePage; // Returns to /test-error, /dashboard, etc.
   ```

4. **Home button** clears the error state:
   ```tsx
   sessionStorage.removeItem("errorSourcePage");
   window.location.href = "/";
   ```

## Dark Mode Support

All error UI components support dark mode automatically through Tailwind CSS:

- Background: `bg-background`
- Text: `text-foreground` / `text-muted-foreground`
- Error icon: `text-destructive` with `bg-destructive/10` background

The system theme is automatically detected and applied.

## Accessibility

The error page implementation follows WCAG AA guidelines:

- Semantic HTML structure
- Focus management (first button focused on mount)
- ARIA labels on buttons
- Sufficient color contrast
- Screen reader friendly
- Keyboard navigation support
- Offline state indication

## Error Logging

Currently, errors are logged to the browser console with structured formatting:

```javascript
{
  timestamp: "2024-10-11T10:30:00.000Z",
  path: "/some-page",
  message: "Error message",
  stack: "Error stack trace...",
  userAgent: "Mozilla/5.0...",
  componentStack: "at ComponentName..."
}
```

### Production Considerations

For production, integrate with external error monitoring services:

1. **Sentry**: Add Sentry SDK and send errors in `logClientError`
2. **LogRocket**: Include LogRocket for session replay
3. **Custom Table**: Create a dedicated `error_logs` table in Supabase
4. **Datadog/New Relic**: Use APM integration

Example Sentry integration:

```typescript
// src/lib/logClientError.ts
import * as Sentry from "@sentry/react";

export async function logClientError(payload: ErrorLogPayload) {
  // ... existing code ...

  // Send to Sentry
  Sentry.captureException(new Error(payload.message), {
    extra: {
      path: payload.path,
      stack: payload.stack,
      componentStack: payload.componentStack,
    },
  });
}
```

## Testing Error Handling

To test the error boundary in development:

1. Visit `http://localhost:4321/test-error`
2. Click "Trigger Test Error" button
3. Verify:
   - ✅ Error is caught by ErrorBoundary
   - ✅ Loading message shows ("An error occurred. Redirecting...")
   - ✅ Redirect to `/error` happens after ~500ms
   - ✅ Error page displays with error message
   - ✅ Both "Retry" and "Home" buttons are visible
4. Click "Retry":
   - ✅ Returns to `/test-error` page
   - ✅ Can trigger error again
5. Trigger error again, click "Home":
   - ✅ Goes to homepage
   - ✅ Error state cleared

### Direct Error Page Visit

1. Visit `http://localhost:4321/error` directly
2. Verify:
   - ✅ Error page displays
   - ✅ Only "Home" button shows (no "Retry")
   - ✅ No hydration warnings in console

## API

### ErrorBoundary Props

```typescript
interface ErrorBoundaryProps {
  children: ReactNode; // Content to protect
}
```

### ErrorContent Props

```typescript
interface ErrorContentProps {
  message?: string; // Error message to display (max 255 chars)
  onRetry?: () => void; // Custom retry handler (optional)
}
```

### ActionButtons Props

```typescript
interface ActionButtonsProps {
  isReloading: boolean; // Show loading state on retry
  onRetry: () => void; // Retry handler
  showRetry?: boolean; // Whether to show retry button (default: true)
}
```

### ErrorLogPayload Type

```typescript
interface ErrorLogPayload {
  path: string; // Current page path
  message: string; // Error message
  stack?: string; // Stack trace
  userAgent: string; // Browser user agent
  userId?: string; // Optional user ID
  componentStack?: string | null; // React component stack
}
```

## Configuration

### Toast Settings

Modify toast behavior in `src/components/ToasterProvider.tsx`:

```tsx
<Toaster
  position="top-center" // Change position
  duration={3000} // Change default duration
  richColors // Enable colored toasts
  closeButton // Show close button
/>
```

### Error Page Route

The error page is accessible at `/error` and accepts an optional `message` query parameter:

- `/error` - Shows default message
- `/error?message=Custom%20error%20message` - Shows custom message

## Limitations

1. **Server-Side Errors**: ErrorBoundary only catches client-side React errors. For server-side Astro errors, implement middleware error handling.

2. **Async Errors**: Errors in async operations (promises, event handlers) aren't caught by ErrorBoundary. Use try-catch blocks.

3. **Astro Islands**: ErrorBoundary only works within its own React tree. Different hydration directives create separate trees.

4. **Events Table**: The current Supabase `events` table is specific to flashcard events and cannot store generic errors. Consider creating a separate `error_logs` table for production.

## File Structure

```
src/
├── components/
│   ├── ErrorBoundary.tsx          # React error boundary
│   ├── ErrorContent.tsx           # Error page UI (dark mode ready)
│   ├── ActionButtons.tsx          # Retry/Home buttons
│   ├── ToasterProvider.tsx        # Toast notifications provider
│   ├── TestErrorButton.tsx        # Test component (remove in prod)
│   ├── TestErrorBoundary.tsx      # Example wrapper (remove in prod)
│   ├── hooks/
│   │   └── useErrorPage.ts        # Error page logic hook
│   └── ui/
│       ├── button.tsx             # Shadcn button
│       └── sonner.tsx             # Shadcn toast (Astro-compatible)
├── layouts/
│   └── Layout.astro               # Global layout with ToasterProvider
├── lib/
│   └── logClientError.ts          # Error logging utility
├── pages/
│   ├── error.astro                # Error page route
│   ├── test-error.astro           # Test page (remove in prod)
│   └── index.astro
├── types.ts                       # ErrorLogPayload type
└── styles/
    └── global.css                 # Dark mode CSS variables
```

## Future Enhancements

- [ ] Add custom error pages for specific error types (404, 500, etc.)
- [ ] Implement error recovery strategies (automatic retry with exponential backoff)
- [ ] Add error reporting dashboard
- [ ] Integrate with external monitoring service (Sentry, LogRocket)
- [ ] Create `error_logs` table in Supabase
- [ ] Add error rate limiting to prevent spam
- [ ] Implement error aggregation and grouping
- [ ] Remove test files (`TestErrorButton.tsx`, `TestErrorBoundary.tsx`, `test-error.astro`) in production
