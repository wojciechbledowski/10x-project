# Authentication & Account Management – Technical Specification

## Overview

This document specifies the architecture required to introduce email-and-password authentication (registration, login, logout & password recovery) into the AI Flashcard Generator while preserving existing behaviour. It is aligned with:

- Product requirements in `prd.md` (FR-01, FR-05, FR-08, FR-11)
- Tech stack in `tech-stack.md`  
  (Astro 5, React 19, TypeScript 5, Tailwind 4, Shadcn/ui, Supabase, OpenRouter.ai)
- Supabase Auth integration rules in `supabase-auth.mdc`

---

## 1. User-Interface Architecture

### 1.1 Page Matrix

| Route                          | File                                          | SSR    | Auth Access | Purpose                               |
| ------------------------------ | --------------------------------------------- | ------ | ----------- | ------------------------------------- |
| `/auth/login`                  | `src/pages/auth/login.astro`                  | server | Public      | Login form & link to register / reset |
| `/auth/register`               | `src/pages/auth/register.astro`               | server | Public      | Email/password registration form      |
| `/auth/reset-password`         | `src/pages/auth/reset-password.astro`         | server | Public      | Request reset link                    |
| `/auth/reset-password/[token]` | `src/pages/auth/reset-password/[token].astro` | server | Public      | Enter new password; token in URL      |
| `/logout`                      | `src/pages/auth/logout.astro` _(minimal)_     | server | Protected   | Performs logout then redirects        |
| `/profile`                     | `src/pages/profile.astro`                     | server | Protected   | Account settings incl. delete action  |

_No existing routes are renamed; protected routes continue to use middleware guard._

### 1.2 Layout Interaction

- **`src/layouts/Layout.astro`** gains a `user` prop (injected via `Astro.locals` in middleware) and conditionally renders:
  - `navigation/Header.tsx` shows _Login_ / _Register_ when `!user`, or avatar dropdown (_Profile_, _Logout_) when `user` defined.
  - Mobile navigation mirrors behaviour.
- No breaking change to existing pages: missing prop defaults to `undefined` (typed optional).

### 1.3 React Components

| Component             | Location                                          | Responsibility                                    | Notes                                                |
| --------------------- | ------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| `AuthFormShell`       | `src/components/auth/AuthFormShell.tsx`           | Centers form, handles common title/subtitle/links | Used by all auth pages                               |
| `LoginForm`           | `src/components/auth/LoginForm.tsx`               | Controlled React form (email, password)           | Client-side validation & call `POST /api/auth/login` |
| `RegisterForm`        | `src/components/auth/RegisterForm.tsx`            | Controlled form (email, password, confirm)        | Calls `POST /api/auth/register`                      |
| `RequestResetForm`    | `src/components/auth/RequestResetForm.tsx`        | Input email                                       | Calls `POST /api/auth/reset-password`                |
| `ResetPasswordForm`   | `src/components/auth/ResetPasswordForm.tsx`       | New password, confirm                             | Calls `POST /api/auth/reset-password/[token]`        |
| `AvatarDropdown`      | extend `navigation/*`                             | Shows user email & Logout button                  | Uses Shadcn/ui dropdown                              |
| `DeleteAccountButton` | `src/components/settings/DeleteAccountButton.tsx` | Shows confirmation modal, calls delete endpoint   | Uses Shadcn/ui dialog                                |

All forms share:

- Shadcn/ui `Input`, `Button`; Tailwind scopes for spacing
- React-Hook-Form + Zod for schema validation (client-side only)
- Toast notifications via existing `ToasterProvider`

### 1.4 Validation & Error UX

1. **Client-side** – fast feedback:
   - Email format (`z.string().email()`)
   - Password length ≥ 8 & complexity regex (≥1 upper, lower, number)
   - Password confirmation match
2. **Server-side** – canonical check in API route (Zod schema).  
   Form re-renders with field-level errors plus toast.
3. **Supabase errors** – mapped to human friendly messages (e.g. `Invalid login credentials`).
4. **Edge Scenarios**
   - Re-using expired reset token → `/auth/reset-password?error=expired` toast.
   - Registering existing email → inline error.
   - Rate-limit exceeded (via middleware) → generic `Too many attempts` toast.
   - Deleting account while not authenticated → redirect to login.

### 1.5 Flow Diagrams (textual)

- **Login**: Form submit → `fetch` API → Success → `Router.push('/')` (frontend) else errors.
- **Logout**: Link → `/logout` page – calls API signOut in `.astro` server context – redirects to `/`.
- **Password Reset**: Request → email w/ Supabase generated token → user clicks link → Reset form.

---

## 2. Backend Logic & API

### 2.1 Endpoint Map

| Method | Path                               | File                                           | Action                |
| ------ | ---------------------------------- | ---------------------------------------------- | --------------------- |
| `POST` | `/api/auth/login`                  | `src/pages/api/auth/login.ts`                  | Sign-in with password |
| `POST` | `/api/auth/register`               | `src/pages/api/auth/register.ts`               | Sign-up user          |
| `POST` | `/api/auth/reset-password`         | `src/pages/api/auth/reset-password.ts`         | Send reset email      |
| `POST` | `/api/auth/reset-password/[token]` | `src/pages/api/auth/reset-password/[token].ts` | Set new password      |
| `POST` | `/api/auth/logout`                 | `src/pages/api/auth/logout.ts`                 | Sign-out              |
| `POST` | `/api/auth/delete-account`         | `src/pages/api/auth/delete-account.ts`         | Delete user & data    |

_All endpoints adhere to Supabase Auth & cookie rules._

### 2.2 Request / Response Contracts

- **Common headers**: `Content-Type: application/json`
- **Success (200)**: `{ success: true }`
- **Validation error (400)**: `{ error: 'message' }`
- **Auth failure (401)**: `{ error: 'invalid_credentials' }`

### 2.3 Validation Layer

- Re-use shared Zod schemas in `src/lib/validation.ts` (`loginSchema`, `registerSchema`, etc.)
- Guard function `validate(schema, data)` returns `{ value, error }` early-returning on error.

### 2.4 Exception Handling

- Try/catch around Supabase calls
- Log via `lib/logger.ts` (`error`, `meta`) – respecting PII rules
- Return 500 for unexpected errors with generic message

### 2.5 SSR Considerations

- The application is configured for `output: "server"` (see `astro.config.mjs`).  
  No additional prerender config required; auth pages inherit SSR.
- Password-reset token pages also server-render (SEO friendly). Token passed via route param.

---

## 3. Authentication System Details

### 3.1 Supabase Server Instance

- Centralised in `src/db/supabase.client.ts` per `supabase-auth.mdc` rules.
- Exposed factory `createSupabaseServerInstance({ headers, cookies })` used in:
  - **Middleware** (`src/middleware/index.ts`) for session extraction.
  - **Auth API endpoints** for mutating auth state.

### 3.2 Middleware Flow

```
Incoming request
  └─▶ PUBLIC_PATHS? yes → next()   │
                       │           │
                       │           └─▶ return page (no auth)
                       │
                       └─▶ createSupabaseServerInstance
                                └─▶ supabase.auth.getUser()
                                         │
                                         ├─ user → locals.user and next()
                                         └─ !user → redirect('/auth/login')
```

### 3.3 JWT & Cookies

- Supabase manages JWT; middleware ensures it exists & is fresh.
- Cookie operations limited to `getAll` / `setAll` as required.
- `cookieOptions` set: `httpOnly`, `secure`, `sameSite:'lax'`, `path:'/'`.

### 3.4 Password Reset

- Supabase built-in email template used (EU data region).  
  Endpoint `/api/auth/reset-password` triggers `supabase.auth.resetPasswordForEmail(email)`.
- Reset-password page uses `supabase.auth.updateUser({ password })` with access token from link (in headers).

### 3.5 Security Concerns

- Rate-limiter in `lib/rateLimiter.ts` applied to auth endpoints (max 5/min per IP).
- CSRF: All mutating POSTs; Astro fetch same-origin only; cookies are sameSite.
- Bcrypt hashing handled by Supabase.

### 3.6 Account Deletion Workflow (GDPR – FR-11 / US-009)

1. **UI**: `DeleteAccountButton` opens modal → user types `DELETE` → calls `POST /api/auth/delete-account`.
2. **Endpoint logic**:
   - Requires valid session.
   - Uses service-role Supabase client (loaded from `SUPABASE_SERVICE_ROLE_KEY` env) **server-only** to:
     1. Remove all user-owned rows (`decks`, `flashcards`, `events`) via policy-enabled `delete` or server-side RPC `delete_user_data(user_id)`.
     2. Call `supabase.auth.admin.deleteUser(user_id)` to purge auth record.
   - Returns 200 and clears cookies via `setAll` with expired dates.
3. **Asynchronous fallback**: If data set is large, flag row in `user_deletion_queue` table; nightly cron job completes step 2 within 24h.
4. **Post-Deletion Redirect**: Logout and redirect to `/` with toast `Account deleted`.

Security: Service role key is **not** exposed to client; edge runtime must be environment-scoped.

---

## 4. Data Model Updates

- **Users**: Supabase Auth schema; id (UUID), email, encrypted password. `deleted_at` timestamp optional for queue.
- **profiles** table (optional future extension) stores display name, avatar URL.
  - Relationship `profiles.user_id` → `auth.users.id`.

_No changes required to flashcard tables._

---

## 5. Open Questions / Next Steps

1. Confirm UI copy & branding for auth emails.
2. Should we allow social login in future? (extend spec).
3. Accessibility audit of new forms.

---
