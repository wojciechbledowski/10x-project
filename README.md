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

| Layer    | Technology                                                     |
| -------- | -------------------------------------------------------------- |
| Frontend | Astro 5 · React 19 · TypeScript 5 · Tailwind CSS 4 · Shadcn/ui |
| Backend  | Supabase (PostgreSQL, Auth)                                    |
| AI       | Openrouter.ai (access to OpenAI, Anthropic, Google Gemini, …)  |
| CI/CD    | GitHub Actions (lint → build → test)                           |
| Hosting  | DigitalOcean (Docker image)                                    |

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
SUPABASE_ANON_KEY=public-anon-key
OPENROUTER_API_KEY=xxxxxxxxxxxxxxxx
```

### 3 • Launch dev server

```bash
npm run dev # http://localhost:3000
```

### 4 • Production build

```bash
npm run build
npm run preview # Serve built site locally
```

---

## Available Scripts

| Script             | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Start Astro in development mode with HMR |
| `npm run build`    | Build the production site                |
| `npm run preview`  | Preview the built site locally           |
| `npm run astro`    | Run arbitrary Astro CLI commands         |
| `npm run lint`     | Lint the codebase                        |
| `npm run lint:fix` | Lint and automatically fix issues        |
| `npm run format`   | Format files with Prettier               |

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
