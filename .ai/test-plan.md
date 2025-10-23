# Test Plan – AI Flashcard Generator

## 1. Introduction and Testing Objectives

### 1.1 Purpose

This document defines a comprehensive testing strategy for the AI Flashcard Generator application, a web-based spaced-repetition learning tool that transforms study text into flashcards using AI and manages review sessions with the SM-2 algorithm.

### 1.2 Testing Objectives

- **Functional Correctness**: Verify all features work as specified in the Product Requirements Document (PRD)
- **Data Security**: Ensure Row-Level Security (RLS) policies, authentication, and authorization work correctly
- **AI Integration Reliability**: Validate OpenRouter API integration, error handling, and retry mechanisms
- **Algorithm Accuracy**: Confirm SM-2 spaced-repetition algorithm calculations are correct
- **Performance**: Ensure acceptable response times under typical and peak loads
- **Accessibility**: Validate WCAG AA compliance for inclusive user experience
- **Data Integrity**: Verify database constraints, cascades, and soft-delete functionality
- **User Experience**: Ensure responsive design, error handling, and intuitive workflows

---

## 2. Scope of Testing

### 2.1 In Scope

- **Authentication & Authorization**: Registration, login, logout, password reset, account deletion
- **Deck Management**: Create, read, update, soft-delete decks
- **Flashcard Management**: Manual creation, AI generation, editing, soft-delete
- **Review System**: Daily queue, SM-2 scheduling, quality scoring
- **API Endpoints**: All REST endpoints defined in `api-plan.md`
- **Database Layer**: Schema, RLS policies, constraints, indexes, partitions
- **Frontend Components**: Astro pages, React components, hooks, state management
- **AI Integration**: OpenRouter service, error handling, rate limiting
- **Internationalization**: English and Polish translations
- **Responsive Design**: Mobile, tablet, desktop breakpoints
- **Accessibility**: Keyboard navigation, screen reader compatibility, WCAG AA

### 2.2 Out of Scope

- **Native Mobile Apps**: Not part of current implementation
- **Third-Party Integrations**: External educational platforms
- **Performance Testing at Scale**: Beyond typical usage (defer to load testing phase)
- **Penetration Testing**: Security audit by specialized team (separate initiative)
- **Browser Compatibility**: Focus on modern evergreen browsers (Chrome, Firefox, Safari, Edge latest versions)

### 2.3 Feature Prioritization

| Priority          | Features                                                                            |
| ----------------- | ----------------------------------------------------------------------------------- |
| **P0 (Critical)** | Authentication, Deck CRUD, Flashcard CRUD, AI Generation, Review Flow, RLS Policies |
| **P1 (High)**     | Middleware, API Validation, Rate Limiting, Soft Delete, Pagination, Error Handling  |
| **P2 (Medium)**   | i18n, Theme Switching, Metrics, Background Jobs, Accessibility                      |
| **P3 (Low)**      | Analytics Dashboard, Performance Optimization, Advanced Error Boundaries            |

---

## 3. Types of Tests

### 3.1 Unit Tests

**Objective**: Test individual functions, methods, and components in isolation.

**Coverage Areas**:

- **Services**: `DeckService`, `FlashcardService`, `OpenRouterService`
- **Utilities**: Validation helpers, error factories, logger, rate limiter
- **Schemas**: Zod schema validation (auth, decks, flashcards)
- **React Hooks**: `useDecks`, `useFlashcards`, `useDeckSettings`
- **React Components**: Pure components with predictable inputs/outputs
- **Algorithms**: SM-2 spaced-repetition calculation logic

**Tools**: Vitest, React Testing Library

**Example Tests**:

- `DeckService.createDeck()` with valid payload returns `DeckResponse`
- `DeckService.createDeck()` with duplicate name throws error
- `OpenRouterService.chat()` validates messages array
- Rate limiter blocks requests after threshold
- Zod schemas reject invalid inputs

### 3.2 Integration Tests

**Objective**: Test interactions between multiple components, services, and external systems.

**Coverage Areas**:

- **API Endpoints**: Full request/response cycle with Supabase
- **Authentication Flow**: Login → Session Creation → Cookie Setting
- **AI Generation Pipeline**: Request → OpenRouter → Database → Response
- **Database Operations**: CRUD with RLS enforcement
- **Middleware**: Request interception, user resolution, redirects

**Tools**: Vitest, Supertest (or similar), Supabase local instance

**Example Tests**:

- `POST /api/decks` creates deck and returns 201 with `Location` header
- `GET /api/decks` returns only user's own decks (RLS validation)
- `POST /api/flashcards/generate` triggers AI generation and returns batch ID
- Middleware redirects unauthenticated users to `/auth/login`
- Invalid JWT token returns 401

### 3.3 End-to-End (E2E) Tests

**Objective**: Simulate real user workflows from browser to database.

**Coverage Areas**:

- **User Registration**: Form submission → Email validation → Account creation
- **Deck Creation Flow**: Login → Navigate to Decks → Create Deck → View Deck
- **AI Flashcard Generation**: Paste text → Generate → Review cards → Accept/Edit/Delete
- **Review Session**: View queue → Study card → Submit quality → Next card
- **Account Deletion**: Settings → Delete Account → Confirmation → Data removed

**Tools**: Playwright

**Example Tests**:

- New user signs up, verifies email, creates first deck, generates flashcards
- Existing user logs in, reviews due cards, submits quality scores
- User edits flashcard inline, saves changes, verifies persistence
- User deletes deck, confirms soft delete, verifies deck no longer appears

### 3.4 Database Tests

**Objective**: Validate schema, constraints, indexes, and RLS policies.

**Coverage Areas**:

- **Schema Validation**: Tables, columns, data types, defaults
- **Constraints**: Foreign keys, check constraints, unique constraints
- **RLS Policies**: Owner-based access, service role bypass
- **Indexes**: Query performance, full-text search
- **Partitions**: Monthly partition creation for `reviews` and `events`
- **Cascades**: Soft deletes propagate correctly
- **Triggers**: `updated_at` auto-update

**Tools**: Supabase CLI, SQL scripts, pgTAP (optional)

**Example Tests**:

- User A cannot read User B's decks (RLS enforcement)
- Soft-deleted decks are excluded from queries
- `flashcards` foreign key on `deck_id` is `ON DELETE SET NULL`
- Full-text search index returns correct results
- New month partition is created for `reviews` table

### 3.5 Performance Tests

**Objective**: Ensure acceptable response times and resource usage.

**Coverage Areas**:

- **API Response Times**: P95 < 500ms for CRUD operations
- **AI Generation**: P95 < 10s for typical input (5000 chars)
- **Database Queries**: N+1 query prevention, index usage
- **Frontend Rendering**: Time to Interactive (TTI) < 2s
- **Pagination**: Large datasets (1000+ decks) load efficiently

**Tools**: k6, Lighthouse, Web Vitals

**Example Tests**:

- 100 concurrent users creating decks: avg response time < 300ms
- Loading deck with 500 flashcards: query time < 100ms
- Lighthouse score: Performance > 90, Accessibility > 95

### 3.6 Accessibility Tests

**Objective**: Ensure WCAG AA compliance for inclusive design.

**Coverage Areas**:

- **Keyboard Navigation**: All interactive elements reachable via Tab
- **Focus Indicators**: Visible focus states on all controls
- **Screen Reader**: ARIA labels, landmarks, live regions
- **Contrast**: Text meets 4.5:1 ratio, large text meets 3:1 ratio
- **Forms**: Labels, error messages, validation feedback
- **Responsive**: Content reflows without loss of information

**Tools**: axe DevTools, Pa11y, Lighthouse, Manual Testing

**Example Tests**:

- Deck creation form: all fields have associated labels
- Error messages announced by screen reader
- Keyboard users can navigate through flashcard review
- Color contrast passes for all text and UI elements
- No heading level skips (h1 → h2 → h3)

### 3.7 Security Tests

**Objective**: Identify vulnerabilities and ensure secure data handling.

**Coverage Areas**:

- **Authentication**: Session hijacking, brute force, token expiration
- **Authorization**: Privilege escalation, RLS bypass attempts
- **Input Validation**: SQL injection, XSS, CSRF
- **Data Exposure**: Sensitive data in logs, error messages
- **Rate Limiting**: API abuse prevention

**Tools**: Manual testing, OWASP ZAP (optional), Security audit

**Example Tests**:

- Modified JWT token is rejected
- User cannot access another user's deck by changing URL
- XSS payload in flashcard content is sanitized
- Login endpoint rate-limited after 5 failed attempts
- Deleted accounts have all data removed (GDPR compliance)

### 3.8 Regression Tests

**Objective**: Ensure new changes don't break existing functionality.

**Coverage Areas**:

- **Critical Paths**: All P0 and P1 features
- **Bug Fixes**: Previously reported issues
- **Data Migrations**: Schema changes don't corrupt data

**Tools**: Automated test suite (unit + integration + E2E)

**Strategy**: Run full test suite on every PR, nightly builds, and pre-release

---

## 4. Test Scenarios for Key Functionalities

### 4.1 Authentication

| Test Case ID | Description                                      | Priority | Type        |
| ------------ | ------------------------------------------------ | -------- | ----------- |
| AUTH-001     | Register with valid email and password           | P0       | E2E         |
| AUTH-002     | Register with duplicate email returns 409        | P0       | Integration |
| AUTH-003     | Register with invalid email format returns 400   | P1       | Integration |
| AUTH-004     | Login with valid credentials sets session cookie | P0       | E2E         |
| AUTH-005     | Login with invalid credentials returns 400       | P0       | Integration |
| AUTH-006     | Logout clears session cookie and redirects       | P0       | E2E         |
| AUTH-007     | Password reset email sent for valid account      | P1       | Integration |
| AUTH-008     | Reset password with valid token updates password | P1       | E2E         |
| AUTH-009     | Reset password with expired token returns error  | P1       | Integration |
| AUTH-010     | Account deletion removes all user data           | P0       | Integration |

### 4.2 Deck Management

| Test Case ID | Description                                       | Priority | Type        |
| ------------ | ------------------------------------------------- | -------- | ----------- |
| DECK-001     | Create deck with valid name returns 201           | P0       | Integration |
| DECK-002     | Create deck with duplicate name returns 409       | P1       | Integration |
| DECK-003     | Create deck with empty name returns 400           | P1       | Integration |
| DECK-004     | Create deck with name > 255 chars returns 400     | P1       | Integration |
| DECK-005     | List decks returns only user's own decks          | P0       | Integration |
| DECK-006     | List decks with pagination works correctly        | P1       | Integration |
| DECK-007     | List decks sorted by name (ascending)             | P1       | Integration |
| DECK-008     | List decks sorted by created_at (descending)      | P1       | Integration |
| DECK-009     | Get deck by ID returns deck with card count       | P0       | Integration |
| DECK-010     | Get non-existent deck returns 404                 | P1       | Integration |
| DECK-011     | Get another user's deck returns 403/404           | P0       | Security    |
| DECK-012     | Update deck name successfully                     | P1       | Integration |
| DECK-013     | Update deck name to duplicate returns 409         | P1       | Integration |
| DECK-014     | Soft delete deck sets deleted_at timestamp        | P0       | Integration |
| DECK-015     | Soft deleted decks excluded from list             | P0       | Integration |
| DECK-016     | Create deck rate limit (10 requests/min) enforced | P1       | Integration |

### 4.3 Flashcard Management

| Test Case ID | Description                                               | Priority | Type        |
| ------------ | --------------------------------------------------------- | -------- | ----------- |
| FLASH-001    | Create manual flashcard with valid data returns 201       | P0       | Integration |
| FLASH-002    | Create flashcard with empty front/back returns 400        | P1       | Integration |
| FLASH-003    | Create flashcard with front/back > 1000 chars returns 400 | P1       | Integration |
| FLASH-004    | Create flashcard with invalid deckId returns 400          | P1       | Integration |
| FLASH-005    | List flashcards filtered by deckId                        | P0       | Integration |
| FLASH-006    | List flashcards with reviewDue=now filter                 | P0       | Integration |
| FLASH-007    | List flashcards with full-text search                     | P1       | Integration |
| FLASH-008    | Get flashcard by ID returns full details                  | P0       | Integration |
| FLASH-009    | Get another user's flashcard returns 403/404              | P0       | Security    |
| FLASH-010    | Update flashcard front/back text                          | P0       | Integration |
| FLASH-011    | Update flashcard source to 'ai_edited'                    | P0       | Integration |
| FLASH-012    | Move flashcard to different deck                          | P1       | Integration |
| FLASH-013    | Soft delete flashcard sets deleted_at                     | P0       | Integration |
| FLASH-014    | Soft deleted flashcards excluded from lists               | P0       | Integration |

### 4.4 AI Flashcard Generation

| Test Case ID | Description                                                  | Priority | Type        |
| ------------ | ------------------------------------------------------------ | -------- | ----------- |
| AI-001       | Generate flashcards with valid text (5000 chars) returns 202 | P0       | E2E         |
| AI-002       | Generate with text < 1000 chars returns 400                  | P1       | Integration |
| AI-003       | Generate with text > 10000 chars returns 400                 | P1       | Integration |
| AI-004       | Poll generation batch status until complete                  | P0       | E2E         |
| AI-005       | OpenRouter API timeout handled gracefully                    | P0       | Integration |
| AI-006       | OpenRouter API error returns status 'ERROR'                  | P0       | Integration |
| AI-007       | Retry failed generation creates new job                      | P1       | Integration |
| AI-008       | Generated flashcards have source='ai'                        | P0       | Integration |
| AI-009       | Generated flashcards linked via card_generations             | P0       | Database    |
| AI-010       | Rate limit enforced for generation requests                  | P1       | Integration |
| AI-011       | Token usage recorded in ai_generations table                 | P2       | Integration |
| AI-012       | Malformed AI response handled gracefully                     | P0       | Integration |

### 4.5 Review System (SM-2 Algorithm)

| Test Case ID | Description                                                 | Priority | Type        |
| ------------ | ----------------------------------------------------------- | -------- | ----------- |
| REV-001      | Get review queue returns cards with next_review_at <= now   | P0       | Integration |
| REV-002      | Review queue ordered by next_review_at ascending            | P0       | Integration |
| REV-003      | Submit review with quality=5 increases ease_factor          | P0       | Unit        |
| REV-004      | Submit review with quality=0 resets interval to 0           | P0       | Unit        |
| REV-005      | Submit review with quality=3 maintains interval             | P0       | Unit        |
| REV-006      | SM-2 calculation: first review (quality=4) sets interval=1  | P0       | Unit        |
| REV-007      | SM-2 calculation: second review (quality=4) sets interval=6 | P0       | Unit        |
| REV-008      | Submit review updates next_review_at correctly              | P0       | Integration |
| REV-009      | Submit review for another user's card returns 403           | P0       | Security    |
| REV-010      | Latency tracking recorded in reviews table                  | P2       | Integration |
| REV-011      | Review history partitioned correctly by month               | P1       | Database    |

### 4.6 Middleware & Authorization

| Test Case ID | Description                                                | Priority | Type        |
| ------------ | ---------------------------------------------------------- | -------- | ----------- |
| MIDW-001     | Unauthenticated request to /decks redirects to /auth/login | P0       | Integration |
| MIDW-002     | Authenticated request to /decks allows access              | P0       | Integration |
| MIDW-003     | Public paths (/, /auth/login) accessible without auth      | P0       | Integration |
| MIDW-004     | Invalid JWT token results in redirect to login             | P0       | Integration |
| MIDW-005     | Expired JWT token results in redirect to login             | P0       | Integration |
| MIDW-006     | Theme preference loaded from cookie                        | P2       | Integration |
| MIDW-007     | Language preference loaded from cookie                     | P2       | Integration |
| MIDW-008     | Supabase client available in context.locals                | P0       | Integration |

### 4.7 Frontend Components

| Test Case ID | Description                                  | Priority | Type |
| ------------ | -------------------------------------------- | -------- | ---- |
| FE-001       | DecksApp displays loading skeleton initially | P1       | Unit |
| FE-002       | DecksApp displays error state on API failure | P1       | Unit |
| FE-003       | DecksApp displays empty state when no decks  | P1       | Unit |
| FE-004       | DeckCard navigates to deck detail on click   | P0       | E2E  |
| FE-005       | CreateDeckModal validates empty input        | P1       | Unit |
| FE-006       | SortDropdown changes sort order correctly    | P1       | Unit |
| FE-007       | FlashcardItem displays front/back text       | P0       | Unit |
| FE-008       | EditFlashcardDialog saves changes on submit  | P0       | E2E  |
| FE-009       | DeleteDeckDialog requires confirmation       | P1       | E2E  |
| FE-010       | Error boundary catches and displays errors   | P1       | Unit |

### 4.8 Database Integrity

| Test Case ID | Description                                         | Priority | Type     |
| ------------ | --------------------------------------------------- | -------- | -------- |
| DB-001       | flashcards.deck_id foreign key ON DELETE SET NULL   | P0       | Database |
| DB-002       | Soft deleted decks cascade to flashcards (logical)  | P0       | Database |
| DB-003       | RLS policy prevents cross-user access to decks      | P0       | Database |
| DB-004       | RLS policy prevents cross-user access to flashcards | P0       | Database |
| DB-005       | Service role bypasses RLS policies                  | P1       | Database |
| DB-006       | flashcards.updated_at trigger fires on update       | P1       | Database |
| DB-007       | check constraint: ease_factor >= 1.30               | P1       | Database |
| DB-008       | check constraint: quality between 0 and 5           | P1       | Database |
| DB-009       | Full-text search index returns relevant results     | P1       | Database |
| DB-010       | Partition for new month created automatically       | P2       | Database |

### 4.9 Internationalization

| Test Case ID | Description                                  | Priority | Type        |
| ------------ | -------------------------------------------- | -------- | ----------- |
| I18N-001     | English translations loaded by default       | P2       | Integration |
| I18N-002     | Polish translations loaded when lang=pl      | P2       | Integration |
| I18N-003     | Language switcher changes language correctly | P2       | E2E         |
| I18N-004     | Language preference persisted in cookie      | P2       | Integration |
| I18N-005     | Missing translation key falls back to key    | P2       | Unit        |

### 4.10 Accessibility

| Test Case ID | Description                                          | Priority | Type          |
| ------------ | ---------------------------------------------------- | -------- | ------------- |
| A11Y-001     | All form inputs have associated labels               | P2       | Accessibility |
| A11Y-002     | Keyboard navigation through deck list                | P2       | Accessibility |
| A11Y-003     | Focus indicators visible on all interactive elements | P2       | Accessibility |
| A11Y-004     | Error messages announced by screen reader            | P2       | Accessibility |
| A11Y-005     | Color contrast meets WCAG AA (4.5:1)                 | P2       | Accessibility |
| A11Y-006     | Heading structure is semantic (h1 → h2 → h3)         | P2       | Accessibility |
| A11Y-007     | ARIA labels present on icon-only buttons             | P2       | Accessibility |
| A11Y-008     | Modal dialogs trap focus correctly                   | P2       | Accessibility |

---

## 5. Test Environment

### 5.1 Development Environment

- **Local Development**: `npm run dev` on `http://localhost:3000`
- **Database**: Supabase local instance via `supabase start`
- **OpenRouter**: Mock service or test API key with low rate limits
- **Browser**: Chrome DevTools, React DevTools

### 5.2 Test Environment

- **Staging Server**: Deployed to isolated DigitalOcean droplet
- **Database**: Supabase staging project with test data
- **OpenRouter**: Test API key with rate limiting
- **Browser**: BrowserStack or similar for cross-browser testing

### 5.3 Production Environment

- **Live Application**: Production URL on DigitalOcean
- **Database**: Supabase production project (EU region)
- **OpenRouter**: Production API key with financial limits
- **Monitoring**: Error tracking (Sentry), analytics (PostHog or similar)

### 5.4 Test Data Management

- **Seed Data**: SQL scripts to populate test users, decks, flashcards
- **Isolation**: Each test suite runs with isolated user accounts
- **Cleanup**: Automated teardown after test runs
- **GDPR Compliance**: Test data does not include real PII

---

## 6. Testing Tools

### 6.1 Unit & Integration Testing

- **Framework**: Vitest
- **React Testing**: React Testing Library, Testing Library hooks
- **Assertions**: Expect API from Vitest
- **Mocking**: Vitest mocks, MSW (Mock Service Worker) for API mocking

### 6.2 End-to-End Testing

- **Framework**: Playwright or Cypress
- **Configuration**: Headless mode for CI, headed for debugging
- **Test Organization**: Page Object Model pattern

### 6.3 Database Testing

- **Supabase CLI**: Local Supabase instance for schema testing
- **SQL Scripts**: Custom SQL for RLS policy validation
- **pgTAP (Optional)**: PostgreSQL unit testing framework

### 6.4 Performance Testing

- **Load Testing**: k6 for API load testing
- **Frontend Performance**: Lighthouse CLI, Web Vitals
- **Profiling**: Chrome DevTools Performance tab

### 6.5 Accessibility Testing

- **Automated**: axe-core, Pa11y CI
- **Manual**: NVDA/JAWS screen readers, keyboard-only navigation
- **Lighthouse**: Accessibility audit score

### 6.6 Security Testing

- **Static Analysis**: ESLint security plugins
- **Dynamic Testing**: Manual testing, OWASP ZAP (optional)
- **Dependency Scanning**: npm audit, Snyk

### 6.7 CI/CD Integration

- **GitHub Actions**: Automated test runs on every PR
- **Stages**: Lint → Unit Tests → Integration Tests → E2E Tests → Build
- **Reporting**: Test coverage reports, failed test notifications

---

## 7. Test Schedule

### 7.1 Development Phase (Ongoing)

- **Frequency**: Continuous during development
- **Scope**: Unit tests and integration tests for new features
- **Ownership**: Developers write tests alongside feature code
- **Goal**: 80%+ code coverage for critical paths

### 7.2 Sprint Testing

- **Frequency**: End of each 2-week sprint
- **Scope**: Regression tests (automated), exploratory testing (manual)
- **Ownership**: QA team + developers
- **Goal**: All P0 and P1 test cases pass

### 7.3 Pre-Release Testing

- **Frequency**: Before each release (MVP, v1.1, etc.)
- **Scope**: Full test suite (unit + integration + E2E + accessibility + performance)
- **Ownership**: QA team leads, developers support
- **Goal**: Zero critical bugs, 100% P0 test pass rate

### 7.4 Production Testing

- **Frequency**: Post-deployment smoke tests
- **Scope**: Critical paths (login, create deck, generate flashcards, review)
- **Ownership**: DevOps + QA
- **Goal**: Verify production deployment success

### 7.5 Regression Testing

- **Frequency**: Nightly builds (automated)
- **Scope**: Full automated test suite
- **Ownership**: CI/CD pipeline
- **Goal**: Early detection of regressions

---

## 8. Test Acceptance Criteria

### 8.1 Unit Tests

- ✅ Code coverage ≥ 80% for services, utilities, and hooks
- ✅ All critical business logic has unit tests
- ✅ Tests run in < 30 seconds
- ✅ Zero flaky tests (pass rate ≥ 99%)

### 8.2 Integration Tests

- ✅ All API endpoints have integration tests
- ✅ RLS policies validated for all tables
- ✅ Authentication flows fully tested
- ✅ Tests run in < 2 minutes

### 8.3 End-to-End Tests

- ✅ All user stories (US-001 to US-011) covered
- ✅ Critical paths tested across browsers
- ✅ Tests run in < 10 minutes
- ✅ Zero false positives

### 8.4 Performance Tests

- ✅ API response times: P95 < 500ms
- ✅ AI generation: P95 < 10s
- ✅ Lighthouse Performance score ≥ 90
- ✅ No N+1 query problems

### 8.5 Accessibility Tests

- ✅ Lighthouse Accessibility score ≥ 95
- ✅ Zero critical axe violations
- ✅ Manual keyboard navigation successful
- ✅ Screen reader testing passes

### 8.6 Security Tests

- ✅ No SQL injection vulnerabilities
- ✅ No XSS vulnerabilities
- ✅ RLS policies prevent unauthorized access
- ✅ Rate limiting enforced on sensitive endpoints

### 8.7 Regression Tests

- ✅ 100% of P0 test cases pass
- ✅ ≥ 95% of P1 test cases pass
- ✅ All previously fixed bugs remain fixed

---

## 9. Roles and Responsibilities

### 9.1 Test Manager / QA Lead

- **Responsibilities**:
  - Define test strategy and scope
  - Prioritize test cases
  - Coordinate test execution
  - Report test results to stakeholders
  - Manage test environment
  - Review and approve test plans

### 9.2 QA Engineers / Testers

- **Responsibilities**:
  - Write and execute test cases
  - Perform exploratory testing
  - Log and track defects
  - Execute regression testing
  - Perform accessibility and usability testing
  - Document test results

### 9.3 Developers

- **Responsibilities**:
  - Write unit tests for new code
  - Fix defects identified by QA
  - Support integration testing
  - Review and improve test coverage
  - Participate in bug triage

### 9.4 DevOps Engineer

- **Responsibilities**:
  - Set up CI/CD pipeline for automated testing
  - Maintain test environments
  - Monitor test execution in CI
  - Provide deployment support for test environments
  - Manage test data provisioning

### 9.5 Product Owner

- **Responsibilities**:
  - Define acceptance criteria for features
  - Prioritize bug fixes
  - Approve release based on test results
  - Provide business context for test cases

---

## 10. Bug Reporting Procedures

### 10.1 Bug Lifecycle

1. **Discovery**: Tester identifies defect during test execution
2. **Logging**: Create issue in GitHub Issues or project management tool
3. **Triage**: Team reviews and assigns priority/severity
4. **Assignment**: Developer assigned to investigate and fix
5. **Fix**: Developer implements fix and adds regression test
6. **Verification**: QA verifies fix in test environment
7. **Closure**: Issue closed if verified; reopened if not fixed

### 10.2 Bug Severity Levels

| Severity          | Description                                 | Example                                    | Response Time |
| ----------------- | ------------------------------------------- | ------------------------------------------ | ------------- |
| **S1 - Critical** | System crash, data loss, security breach    | Database corruption, authentication bypass | Immediate     |
| **S2 - High**     | Major feature broken, no workaround         | Cannot create decks, AI generation fails   | 24 hours      |
| **S3 - Medium**   | Feature partially broken, workaround exists | Sort not working, pagination issue         | 3 days        |
| **S4 - Low**      | Minor issue, cosmetic                       | Typo in error message, UI misalignment     | Next sprint   |

### 10.3 Bug Priority Levels

| Priority | Description             | Criteria                                                        |
| -------- | ----------------------- | --------------------------------------------------------------- |
| **P0**   | Blocker for release     | Affects critical path, no workaround, impacts majority of users |
| **P1**   | Must fix before release | Impacts important feature, workaround exists                    |
| **P2**   | Should fix              | Minor issue, affects small user subset                          |
| **P3**   | Nice to have            | Cosmetic, enhancement, edge case                                |

### 10.4 Bug Report Template

```markdown
## Bug Title

Clear, descriptive title (e.g., "Deck creation fails with 500 error when name is empty")

## Severity

[S1 / S2 / S3 / S4]

## Priority

[P0 / P1 / P2 / P3]

## Environment

- **Browser**: Chrome 120.0.6099.109
- **OS**: Windows 11
- **Environment**: Staging
- **User Account**: test-user@example.com

## Steps to Reproduce

1. Navigate to /decks
2. Click "Create Deck" button
3. Leave name field empty
4. Click "Save"

## Expected Result

Form validation error: "Deck name is required"

## Actual Result

500 Internal Server Error displayed

## Screenshots/Videos

[Attach screenshot or recording]

## Console Errors
```

TypeError: Cannot read property 'name' of undefined
at DeckService.createDeck (deckService.ts:62)

```

## Additional Context
- Issue started after PR #123 merged
- Does not occur in production
```

### 10.5 Bug Triage Meetings

- **Frequency**: Daily during active development, weekly during maintenance
- **Attendees**: QA Lead, Tech Lead, Product Owner
- **Agenda**:
  1. Review new bugs
  2. Assign priority/severity
  3. Assign to developers
  4. Identify blockers

### 10.6 Defect Metrics

- **Defect Density**: Bugs per 1000 lines of code
- **Defect Leakage**: Bugs found in production vs. test environments
- **Mean Time to Resolve (MTTR)**: Average time from bug report to closure
- **Reopened Bugs**: Percentage of bugs reopened after fix
- **Target**: < 5% reopened bugs, MTTR < 2 days for P1 issues

---

## 11. Risk Mitigation

### 11.1 Identified Risks and Mitigation Strategies

| Risk                              | Impact   | Likelihood | Mitigation Strategy                                                           |
| --------------------------------- | -------- | ---------- | ----------------------------------------------------------------------------- |
| **RLS Policy Bypass**             | Critical | Low        | Extensive database testing, security audit, automated RLS tests               |
| **OpenRouter API Failure**        | High     | Medium     | Retry logic, error handling, fallback mock service for testing                |
| **SM-2 Algorithm Bug**            | High     | Low        | Unit tests for all edge cases, manual verification with sample data           |
| **Partition Management Failure**  | Medium   | Medium     | Automated monthly partition creation script, monitoring alerts                |
| **Flaky E2E Tests**               | Medium   | High       | Stabilize tests with explicit waits, retry failed tests once, use data-testid |
| **Test Data Corruption**          | Medium   | Low        | Isolated test databases, automated cleanup, seed scripts                      |
| **Performance Degradation**       | High     | Medium     | Regular performance testing, database query optimization, caching             |
| **Accessibility Compliance Gap**  | Medium   | Medium     | Automated axe scans, manual screen reader testing, training for developers    |
| **Third-Party Dependency Issues** | High     | Medium     | Dependency scanning, version pinning, regular updates, vendor monitoring      |

---

## 12. Test Metrics and Reporting

### 12.1 Key Metrics

| Metric                            | Target                     | Measurement Method                   |
| --------------------------------- | -------------------------- | ------------------------------------ |
| **Test Coverage**                 | ≥ 80%                      | Code coverage tool (Istanbul/Vitest) |
| **Test Pass Rate**                | ≥ 95%                      | CI/CD pipeline report                |
| **Defect Detection Rate**         | ≥ 90% found pre-production | Defect log analysis                  |
| **Automated Test Execution Time** | < 15 minutes               | CI/CD pipeline timing                |
| **Mean Time to Fix (MTTF)**       | < 48 hours for P1 bugs     | Bug tracking system                  |
| **Accessibility Score**           | ≥ 95 (Lighthouse)          | Automated audit                      |
| **Performance Score**             | ≥ 90 (Lighthouse)          | Automated audit                      |

### 12.2 Reporting Cadence

- **Daily**: Test execution results in CI/CD pipeline (Slack/email notifications)
- **Weekly**: Test summary report (pass/fail rates, new bugs, blockers)
- **Sprint End**: Comprehensive test report (coverage, metrics, quality trends)
- **Pre-Release**: Full test report with sign-off checklist

### 12.3 Test Report Template

```markdown
# Test Report – Sprint [X] / Release [vX.X]

## Executive Summary

- **Test Period**: [Start Date] - [End Date]
- **Test Environment**: Staging
- **Tested Features**: [List of features]
- **Overall Status**: ✅ PASS / ⚠️ PASS WITH ISSUES / ❌ FAIL

## Test Execution Summary

| Test Type     | Total   | Pass    | Fail  | Skipped | Pass Rate |
| ------------- | ------- | ------- | ----- | ------- | --------- |
| Unit          | 120     | 118     | 2     | 0       | 98.3%     |
| Integration   | 45      | 44      | 1     | 0       | 97.8%     |
| E2E           | 30      | 28      | 2     | 0       | 93.3%     |
| Accessibility | 15      | 15      | 0     | 0       | 100%      |
| **Total**     | **210** | **205** | **5** | **0**   | **97.6%** |

## Coverage

- **Code Coverage**: 82.4% (Target: 80%)
- **P0 Test Cases**: 100% executed
- **P1 Test Cases**: 95% executed

## Defects Summary

- **Total Defects Found**: 8
  - S1 (Critical): 0
  - S2 (High): 2
  - S3 (Medium): 4
  - S4 (Low): 2
- **Open Defects**: 3 (P1: 1, P2: 2)
- **Closed Defects**: 5

## Blockers

- [DECK-003] Deck creation fails with 500 error (P1, assigned to @dev1)

## Recommendations

- Fix DECK-003 before release
- Improve E2E test stability (2 flaky tests)
- Add unit tests for edge case in SM-2 algorithm

## Sign-Off

- [ ] QA Lead: [Name]
- [ ] Tech Lead: [Name]
- [ ] Product Owner: [Name]
```

---

## 13. Continuous Improvement

### 13.1 Test Process Review

- **Frequency**: Quarterly
- **Participants**: QA team, developers, product owner
- **Topics**:
  - Test effectiveness (bugs caught vs. escaped)
  - Test efficiency (execution time, automation gaps)
  - Tool evaluation (new testing tools, framework updates)
  - Team skill development (training needs)

### 13.2 Lessons Learned Log

- Document issues encountered during testing (e.g., environment setup challenges, tool limitations)
- Share learnings across team
- Update test plan based on insights

### 13.3 Automation Backlog

- Identify manual tests that should be automated
- Prioritize based on frequency, criticality, and effort
- Track automation progress (current: X% automated, target: Y%)

---

## 14. Appendix

### 14.1 Glossary

- **RLS**: Row-Level Security – PostgreSQL feature restricting database access based on policies
- **SM-2**: SuperMemo 2 – Spaced repetition algorithm for flashcard scheduling
- **SSR**: Server-Side Rendering – Rendering pages on the server before sending to client
- **JWT**: JSON Web Token – Encoded token for authentication
- **WCAG AA**: Web Content Accessibility Guidelines Level AA – Accessibility compliance standard
- **P95**: 95th percentile – Performance metric indicating 95% of requests complete within threshold

### 14.2 References

- [Product Requirements Document (PRD)](./.ai/prd.md)
- [API Plan](./.ai/api/api-plan.md)
- [Database Plan](./.ai/db-plan.md)
- [Tech Stack](./.ai/tech-stack.md)
- [Astro Documentation](https://docs.astro.build/)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### 14.3 Change Log

| Version | Date       | Author  | Changes                   |
| ------- | ---------- | ------- | ------------------------- |
| 1.0     | 2025-10-23 | QA Team | Initial test plan created |

---

**Document Status**: ✅ Approved  
**Last Updated**: 2025-10-23  
**Next Review**: 2026-01-23
