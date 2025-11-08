# AI Flashcard Generator

[![Node Version](https://img.shields.io/badge/node-22.14.0-green)](https://nodejs.org)
[![License](https://img.shields.io/github/license/wojciechbledowski/10x-project)](LICENSE)

A web-based application that instantly converts study material into spaced-repetition flashcards.
Paste up to **10 000 characters** of text, let the AI create question–answer cards, edit or delete them, and start reviewing with the open-source spaced repetition algorithm. All data is encrypted, and accessible through a responsive, mobile-first interface.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Getting Started Locally](#getting-started-locally)
3. [Available Scripts](#available-scripts)
4. [Project Scope](#project-scope)
5. [Project Status](#project-status)
6. [License](#license)

---

## Tech Stack

| Layer    | Technology                                                               |
| -------- | ------------------------------------------------------------------------ |
| Frontend | Astro 5 · React 19 · TypeScript 5 · Tailwind CSS 4 · Shadcn/ui           |
| Backend  | Supabase (PostgreSQL, Auth)                                              |
| AI       | Openrouter.ai (access to OpenAI, Anthropic, Google Gemini, …)            |
| Testing  | Vitest · React Testing Library · Playwright · k6 · axe-core · Lighthouse |
| CI/CD    | GitHub Actions (lint → unit → integration → e2e → build)                 |
| Hosting  | Cloudflare Pages                                                         |

---

## Deployments & Releases

The project utilizes GitHub Actions for its CI/CD pipeline, ensuring code quality and streamlined deployments.

### Pull Request Checks

Upon every pull request to the `master` branch, the following checks are automatically performed:

1.  **Lint Code:** Runs ESLint to enforce code style and identify potential issues.
2.  **Unit Tests:** Executes Vitest unit tests with coverage reporting.
3.  **E2E Tests:** Runs Playwright end-to-end tests against a dedicated integration environment, ensuring core functionalities work as expected. These tests require Supabase environment variables to be securely configured as GitHub Secrets.
4.  **Status Comment:** Posts a comment on the pull request summarizing the results of all checks. If all checks pass, the PR is marked as ready for review; otherwise, it indicates failures that need to be addressed.

### Master Branch CI

After merging to the `master` branch, the same linting, unit testing, and E2E testing pipeline runs automatically to ensure the merged code maintains quality standards.

### Manual Deployment

Deployment is triggered manually via workflow dispatch, allowing selection of target environment (production, staging, etc.). The deployment process includes:

- All quality checks (linting and unit tests)
- Production build
- Deployment to Cloudflare Pages

---

## Getting Started Locally

### Prerequisites

- Node **22.14.0** – `nvm use` or install the correct version.
- npm ≥ 10 (bundled with Node)
- Supabase project & API keys
- Openrouter.ai API key

### 1 • Clone & install

```bash
git clone https://github.com/wojciechbledowski/10x-project.git
cd 10x-project
npm install
```

### 2 • Configure environment

Create a `.env` file and add the following variables:

```dotenv
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENROUTER_API_KEY=xxxxxxxxxxxxxxxx
```

**Note:** These environment variables are managed through Astro's type-safe `astro:env` system, which ensures proper handling in serverless environments like Cloudflare Pages.

**⚠️ Important for `@astrojs/cloudflare` adapter:** Unlike `@astrojs/node`, the Cloudflare adapter loads ALL `.env*` files without filtering by mode. This means `.env.test` won't automatically override `.env` when using `--mode test`. To work with a local Supabase instance, create a `.env.localdev` file with local credentials and use `npm run dev:local`.

### 3 • Launch dev server

```bash
npm run dev:local # Use local Supabase (requires .env.local)
npm run dev:e2e # For E2E tests (uses .env.test)
```

### 4 • Production build

```bash
npm run build
npm run preview # Serve built site locally
```

---

## Available Scripts

| Script                    | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `npm run dev`             | Start Astro in development mode with HMR |
| `npm run build`           | Build the production site                |
| `npm run preview`         | Preview the built site locally           |
| `npm run astro`           | Run arbitrary Astro CLI commands         |
| `npm run lint`            | Lint the codebase                        |
| `npm run lint:fix`        | Lint and automatically fix issues        |
| `npm run format`          | Format files with Prettier               |
| `npm run test`            | Run unit tests in watch mode             |
| `npm run test:run`        | Run unit tests once                      |
| `npm run test:watch`      | Run unit tests in watch mode             |
| `npm run test:ui`         | Run unit tests with UI                   |
| `npm run test:coverage`   | Run unit tests with coverage             |
| `npm run test:e2e`        | Run end-to-end tests                     |
| `npm run test:e2e:ui`     | Run e2e tests with UI                    |
| `npm run test:e2e:debug`  | Run e2e tests in debug mode              |
| `npm run test:e2e:headed` | Run e2e tests in headed mode             |

### Testing Setup

**Unit Tests (Vitest + React Testing Library)**

- Run `npm run test:run` for a single test run
- Run `npm run test:watch` for continuous testing during development
- Run `npm run test:coverage` to generate coverage reports

**End-to-End Tests (Playwright)**

- Requires a running dev server: `npm run dev`
- Run `npm run test:e2e` for headless testing
- Run `npm run test:e2e:headed` to see browser interactions
- Run `npm run test:e2e:ui` for interactive test debugging

**Note:** E2E tests require Supabase environment variables to be configured. Make sure your `.env` file contains valid Supabase credentials before running E2E tests.

---

## Project Scope

**In scope**

- Web app (desktop & mobile browsers)
- Text input (1 000–10 000 chars) → AI flashcard generation
- spaced repetition algorithm, per-user storage, inline edit modal
- GDPR-compliant: EU data residency, encryption at rest & transit
- Basic analytics via internal logs

**Out of scope**

- Native mobile apps
- PDF, DOCX, or image input
- Card sharing & collaboration features
- Rate-limiting / credit system beyond provider caps (MVP)

See [`prd.md`](./.ai/prd.md) for full functional requirements and user stories.

---

## Project Status

`🚧` **MVP in active development**

Target success metrics (v1):

- ≥ 75 % of AI-generated cards accepted by users
- ≥ 75 % of all cards originate from AI generation
- 100 % WCAG AA accessibility compliance

---

## License

This repository is released under the **MIT License**.
See the [LICENSE](LICENSE) file for details.

---
