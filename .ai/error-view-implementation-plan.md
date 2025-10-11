# View Implementation Plan – Global Error Page (`/error`)

## 1. Overview

The **Global Error Page** is a fallback route displayed whenever the application encounters an uncaught runtime error or a route-level fetch/build error. Its goals are:

1. Present a clear, user-friendly explanation that something went wrong.
2. Offer immediate recovery actions ("Retry" / "Go Home").
3. Log the error context for analytics/debugging.
4. Maintain brand look & feel while meeting WCAG AA accessibility.

This view is rendered via Astro’s island architecture with a React `ErrorBoundary` around the app shell. It is also reachable directly at `/error`.

## 2. View Routing

- **Path**: `/error`
- **Fallback**: Registered in the global `ErrorBoundary` and Astro `pages/_error.astro` (or middleware redirect) so any uncaught error navigates to this route.
- **SEO**: `noindex, nofollow` meta-tags.

## 3. Component Structure

```
<ErrorLayout>
  └─ <ErrorContent>
        ├─ <ErrorIllustration /> (optional SVG)
        ├─ <ErrorMessage />
        └─ <ActionButtons>
              ├─ <Button variant="outline" onClick={retry}>Retry</Button>
              └─ <Button variant="default" onClick={goHome}>Home</Button>
```

## 4. Component Details

### 4.1 `ErrorBoundary` (React)

- **Purpose**: Catch runtime errors in children and render `<ErrorContent>`.
- **Main elements**: React error boundary class or hook (`react-error-boundary`).
- **Events**:
  - `componentDidCatch(error, info)` → log to Supabase `events` table.
- **Validation**: none (system-level).
- **Types**:
  - `ErrorBoundaryProps { children: ReactNode }`
- **Props**: `children` (required).

### 4.2 `ErrorLayout` (Astro)

- **Purpose**: Re-use standard layout (header/footer skipped) with centered content.
- **Main elements**: `<main class="flex h-screen w-full flex-col items-center justify-center px-4">...</main>`
- **Events**: none.
- **Validation**: none.
- **Types / Props**: same as existing `LayoutProps` (title override).

### 4.3 `ErrorContent`

- **Purpose**: Present illustration, message, actions.
- **Main elements**:
  - `h1` – generic error title.
  - `p` – detailed message (prop).
  - Child components listed above.
- **Events**: triggers from `ActionButtons`.
- **Validation**: message length ≤ 255 chars.
- **Types**:
  ```ts
  interface ErrorContentProps {
    message?: string; // fallback default
    onRetry?: () => void;
  }
  ```
- **Props**: `message`, `onRetry`.

### 4.4 `ActionButtons`

- **Purpose**: Offer recovery.
- **Main elements**: two Shadcn `Button` components.
- **Events**:
  - `retry`: reload current route (`router.reload()` or `window.location.reload()`).
  - `goHome`: push to `/`.
- **Validation**: disable `Retry` while reloading.
- **Types / Props**:
  ```ts
  interface ActionButtonsProps {
    isReloading: boolean;
    onRetry: () => void;
  }
  ```

### 4.5 `Toast` (global)

- **Purpose**: Non-blocking toast surfaced by `ErrorBoundary` before redirect.
- Uses existing toast system (`@radix-ui/react-toast`).

## 5. Types

1. `ErrorLogPayload` – sent to Supabase `events`:

```ts
interface ErrorLogPayload {
  path: string;
  message: string;
  stack?: string;
  userAgent: string;
  userId?: string;
  createdAt: string; // ISO
}
```

2. `ErrorContentProps`, `ActionButtonsProps` (see above).

No DTO changes needed; we reuse `EventResponse` if we log via API.

## 6. State Management

Custom hook `useErrorPage()` encapsulates:

```ts
const { isReloading, retry } = useErrorPage();
```

- `isReloading: boolean` – toggled while calling `window.location.reload()`.
- `retry()` – sets state then reloads.

Hook also sets document title "Unexpected Error" and focuses first button.

## 8. User Interactions

| Interaction     | Component     | Outcome                                                          |
| --------------- | ------------- | ---------------------------------------------------------------- |
| Page shows      | ErrorBoundary | Screen readers announce page title "Error".                      |
| Click **Retry** | ActionButtons | `isReloading` true → button spinner → `window.location.reload()` |
| Click **Home**  | ActionButtons | Navigate to `/` via Astro router.                                |

## 9. Conditions & Validation

1. `message` prop provided → use; else default "Something went wrong."
2. If reload in progress → disable buttons, show loader.
3. Error log must include `path` & `message` (non-empty strings).

## 10. Error Handling

- **Logging failure**: ignore silently; still render page.
- **Multiple errors**: first error triggers boundary; further errors ignored to prevent loops.
- **Offline**: `Retry` disabled if `navigator.onLine === false` (show tooltip "Offline").

## 11. Implementation Steps

1. **Create React `ErrorBoundary.tsx`** using `react-error-boundary`.
2. **Add `<ErrorBoundary>` wrapper** in `src/layouts/Layout.astro` around `<slot />`.
3. **Generate `/src/pages/error.astro`** using `ErrorLayout` + `ErrorContent` island.
4. **Implement `ErrorContent.tsx`, `ActionButtons.tsx`, `useErrorPage.ts` hook**.
5. **Integrate toast**: On boundary catch, show toast and redirect to `/error` after 250 ms.
6. **Add error logging util (`logClientError.ts`)** that inserts into Supabase.
7. **Style components** with Tailwind/`shadcn/ui` classes, ensure dark-mode support.
8. **Add SEO meta `noindex`** to `/error`.
9. **Write unit tests** for `ErrorBoundary` and hook (Jest + React Testing Library).
10. **Run accessibility audit** (axe-core) ensuring focus management and contrast.
11. **Update documentation** (README, Storybook story for Error page).
