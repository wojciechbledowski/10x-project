# Product Requirements Document (PRD) – AI Flashcard Generator

## 1. Product Overview

A web-based application that automatically creates study flashcards from user-supplied text (1,000–10,000 characters) and schedules reviews using the open-source SM-2 spaced-repetition algorithm. Users can sign up with email and password, generate cards, edit front/back text, and study via a responsive, mobile-first interface. All data is stored on EU servers and encrypted in transit and at rest.

## 2. User Problem

Creating quality flashcards manually is time-consuming and discourages learners from using spaced repetition, an evidence-based study technique. Users need a quick, trustworthy way to transform their study material into flashcards and manage review sessions — without complex setup or proprietary tools.

## 3. Functional Requirements

- **FR-01**: Generate flashcards from pasted text (1,000–10,000 characters).
- **FR-02**: Allow manual creation of individual flashcards.
- **FR-03**: Display generated flashcards for review with accept, edit, or delete actions.
- **FR-04**: Provide inline edit (front/back) via tap-to-edit modal.
- **FR-05**: Store flashcards and user accounts in a database hosted within the EU.
- **FR-06**: Apply SM-2 algorithm in real time to schedule next review for each card.
- **FR-07**: Show a daily review queue and record user self-assessment (e.g., 0–5 score).
- **FR-08**: Authenticate users with email/password; enforce password complexity and bcrypt hashing.
- **FR-09**: Log accept/edit/delete events with `user_id`, `card_id`, `action`, `timestamp`, `source`.
- **FR-10**: Present non-blocking toast on AI generation failure with retry/report options.
- **FR-11**: Support account deletion that removes user data (GDPR right to be forgotten).
- **FR-12**: Ensure mobile-first, responsive UI that meets WCAG AA accessibility.
- **FR-13**: Collect metrics from logs to calculate KPI targets (75% acceptance, 75% AI usage).

## 4. Product Boundaries

### In Scope

- Web application (desktop & mobile browsers)
- Text input only (no PDF/DOCX import)
- SM-2 open-source scheduling (not proprietary algorithms)
- Individual user storage (no flashcard sharing between users)
- Basic analytics via internal logs and SQL views

### Out of Scope

- Native mobile apps
- Integrations with external educational platforms
- Advanced AI transparency (source citation, confidence scores)
- Complex bulk editing, tagging, or deck collaboration
- Rate-limiting or credit systems beyond provider-side caps (for MVP)

## 5. User Stories

| ID     | Title                        | Description                                                                                     | Acceptance Criteria                                                                                                              |
| ------ | ---------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| US-001 | Sign up                      | As a visitor, I want to create an account using email and password so my flashcards are saved.  | - Email format is validated<br>- Password meets complexity rules<br>- Confirmation email sent<br>- Confirmed user is logged in   |
| US-002 | Log in                       | As a registered user, I want to log in so I can access my decks.                                | - Valid credentials start a session<br>- Invalid credentials show an error                                                       |
| US-003 | Paste text to generate cards | As a user, I want to paste study text (1,000–10,000 chars) and receive AI-generated flashcards. | - Input length is validated<br>- Generation completes or fails gracefully<br>- Cards are displayed for review                    |
| US-004 | Review generated cards       | As a user, I want to accept, edit, or delete each generated card.                               | - "Accept" adds card to deck<br>- "Edit" opens modal with front/back fields<br>- "Delete" removes card permanently               |
| US-005 | Manual card creation         | As a user, I want to manually add a flashcard when AI misses a concept.                         | - A form with front/back fields saves the card to the deck                                                                       |
| US-006 | Inline edit                  | As a user, I can tap a card’s front/back text to edit it.                                       | - Modal opens on tap<br>- Changes auto-save on blur or when the save button is clicked                                           |
| US-007 | Review                       | As a user, I want to study cards.                                                               | - User sees front of flashcard<br>- Back is revealed on interaction<br>- User selects quality score<br>- Next flashcard is shown |
| US-008 | AI failure retry             | As a user, I want an option to retry generation if it fails.                                    | - Toast appears on failure<br>- Retry re-calls generation endpoint                                                               |
| US-009 | Delete account               | As a user, I want to delete my account and all data.                                            | - "Delete account" requires confirmation<br>- All user records are erased within 24 hours                                        |
| US-010 | Accessibility                | As a visually impaired user, I need high-contrast UI and keyboard navigation.                   | - Pages pass WCAG AA contrast tests<br>- All controls are reachable via keyboard with visible focus indicators                   |
| US-011 | Data security                | As a user, I want my data encrypted and private.                                                | - TLS 1.3 is enforced<br>- Database encryption is enabled<br>- Flashcards accessible only to the logged-in creator               |

## 6. Success Metrics

- **75%** of AI-generated cards are accepted by users
- **75%** of all created cards originate from AI generation
- **100%** of accessibility audits pass WCAG AA
