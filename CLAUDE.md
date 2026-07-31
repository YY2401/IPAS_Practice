# IPAS Practice — 個人證照刷題系統

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
```

## Tech Stack

- **React 19** + TypeScript, Vite 6
- **Tailwind CSS 4** (via `@tailwindcss/vite`, no config file — theme in CSS)
- **Dexie.js** → IndexedDB (questions, attempts, FSRS cards)
- **ts-fsrs** — spaced repetition scheduling
- **vite-plugin-pwa** — Service Worker + manifest for offline use
- **react-router-dom 6** with `HashRouter` (GitHub Pages compatible)

## Architecture

Static PWA — all data lives in browser IndexedDB, no backend.

```
public/data/questions.json  → bundled question bank (fetched + upserted on load)
src/db/index.ts             → Dexie schema (questions, attempts, cards)
src/fsrs/scheduler.ts       → FSRS wrapper (processAnswer, getDueQuestionIds, …)
src/components/             → React UI
```

## FSRS Rating Mapping

Every answer creates/updates a card — not just wrong ones:

| Result             | FSRS Rating |
|--------------------|-------------|
| Wrong              | Again       |
| Correct but guessed| Hard        |
| Correct            | Good        |

## Conventions

- All UI text in **Traditional Chinese (zh-Hant)**
- Mobile-first (target: iPhone Safari PWA, 375px)
- Question ID format: `{cert}-{year}{session}-{subject code}-{number}`
  - e.g. `ISE-1141-M-013` = iPAS 資安, 114年第1梯, 管理概論, 第13題
- Subject codes: `M` = 管理概論, `T` = 技術概論
- Cert codes: `ISE` = 資安工程師, `BK` = 記帳士 (future)

## Key Files

- `src/types/index.ts` — all TypeScript interfaces
- `src/db/index.ts` — Dexie DB + seedQuestions()
- `src/fsrs/scheduler.ts` — FSRS card lifecycle
- `src/components/Home.tsx` — dashboard with mode selection
- `src/components/QuizSession.tsx` — quiz flow controller
- `src/components/QuizCard.tsx` — single question UI
- `src/components/WrongBook.tsx` — wrong answer review

## Deployment

For GitHub Pages, build with base path:

```bash
npx vite build --base=/IPAS_Practice/
```

Then deploy `dist/` to the `gh-pages` branch.
