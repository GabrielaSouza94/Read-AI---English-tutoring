# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Read AI is a public web app that scores English reading fluency. This folder holds two things: the app itself, and its product specification in `Product materials/`. The folder is its own git repository, nested inside the `past-products` portfolio folder.

Work follows `Product materials/task-breakdown.md`: tasks `T0.1`…, each with acceptance criteria and tests. `docs/PLAN.md` tracks progress. Read the task's entry before implementing it.

## Commands

```bash
npm run dev                 # dev server (Vite + workerd), http://localhost:5173
npm run typecheck           # wrangler types + react-router typegen + tsc -b
npm run lint                # ESLint
npm run format              # Prettier write (format:check in CI)
npm test                    # Vitest unit tests; one file: npx vitest run app/lib/environment.test.ts
npm run test:e2e            # Playwright, 3 browsers, against `vite preview`; one browser: --project=chromium
npm run db:generate         # Drizzle Kit → drizzle/migrations
npm run deploy:staging      # build with CLOUDFLARE_ENV=staging, then wrangler deploy (asks first)
```

Run `npm run typecheck` after editing `wrangler.jsonc` or adding routes. It regenerates `worker-configuration.d.ts` (the `Env` type, git-ignored) and the `./+types/*` route types.

## App architecture

- **One Worker serves everything.** `workers/app.ts` passes each request to the React Router server build, using SSR in framework mode. Routes are declared in `app/routes.ts`. Pages and API endpoints are route modules, with `loader` and `action` functions.
- **Bindings** (vars, and later D1, KV and secrets) are read with `import { env } from "cloudflare:workers"`. `wrangler.jsonc` declares the local config at the top level, plus `env.staging` and `env.production`. `vars` are not inherited by environments, so repeat them in each one. The environment is chosen at **build** time through `CLOUDFLARE_ENV`, not with `wrangler deploy --env`. See `docs/DEPLOYMENT.md`.
- **Pure logic goes in `app/lib/`.** This covers metrics, mismatch rules and validation, and it keeps the code unit-testable in Node. Vitest runs `app/**/*.test.ts` in a Node environment, so code that imports `cloudflare:workers` can't be unit-tested there. Integration tests against D1/KV (Miniflare) arrive with T0.3.
- **The database schema** is in `app/db/schema.ts` (Drizzle, SQLite dialect for D1). Migrations are forward-only, and each one needs a down script. See `docs/DEPLOYMENT.md`.
- **CI** (`.github/workflows/ci.yml`) runs check → e2e → deploy-staging (on `main`) → deploy-production (manual approval). A failing check blocks every deploy.
- **The cross-cutting rules** in `task-breakdown.md` §3 apply to all code: the S-1 JSON error format, S-2 timeouts and retries for external calls, and the S-3 Definition of Done. Never put participant names in logs or LangSmith traces, never persist audio, and enforce every restriction server-side.
- The app uses React Router **8**; the TRD still says 7. See `docs/DECISIONS.md`.

## Product materials

### Two product generations live side by side

The documents describe two related products. Always check which one a file belongs to before editing or quoting it.

| Product                                                                                                                             | Files                                                                                                                                      | Status                 |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| **ReadAssist AI**: K-12 classroom PoC (COPPA, Basic Auth, SpeechAce, teacher dashboards, 3 passages)                                | `PRD.md`, `TRD.md`, `LoFi-Wireframes.md`, `HiFi-Design.md`, `INSPECTION-REPORT.md`                                                         | Legacy source material |
| **Read AI**: public adult MVP (LGPD, no login except a hidden admin, Deepgram + Azure, public professor portal, 4 CEFR A2–C1 tests) | `business-requirements.md` (BRD), `technical-requirements.md` (TRD), `product-documentation.md`, `app-walkthrough.md`, `task-breakdown.md` | Current                |

- When the two sets conflict, the **Read AI BRD and TRD win** (`task-breakdown.md` §13 says so).
- The design tokens and component specs in `HiFi-Design.md` are still meant to be reused for Read AI, once the colours are rechecked for contrast.
- `INSPECTION-REPORT.md` reviews the four ReadAssist documents. Its gaps were carried into `task-breakdown.md`, which marks new items as "(added)".
- `TRD.md` and `technical-requirements.md` are different documents: the ReadAssist TRD and the Read AI TRD.

### How the Read AI documents depend on each other

The documents are linked by ID, so a change to one usually means updating the others:

- **BRD** defines business requirements `BR-01`…`BR-18`, rules `BR-RULE-xx`, use cases `UC-1`…`UC-3`, restrictions, risks `R1`… and a decisions log.
- **TRD** (`technical-requirements.md`) maps each BR to a `TR-xx` in §4 and contains the full texts of the four stories (§4.6).
- **task-breakdown.md** turns BR/TR/UC into 7 epics (`E0`–`E6`) and 42 tasks (`T0.1`…). It also holds cross-cutting standards S-1 (API error codes), S-2 (timeouts and retries) and S-3 (Definition of Done), plus a traceability matrix (§11) and a test plan (§12). If you add or renumber a requirement or task, update the matrix and the epic/sprint tables.
- **product-documentation.md** is the developer-facing technical reference: architecture, ERD, metric formulas, mismatch rules, routes, env config.
- **app-walkthrough.md** is the user-facing guide (participant flow, professor portal, admin, CSV export, URLs). Its screenshots are placeholders until the MVP is built.

Several facts are repeated across files and must stay consistent when any one of them changes:

- Stack: React Router 7 SSR on Cloudflare Workers, D1 + Drizzle, KV, Turnstile, Deepgram Nova-3, Azure pronunciation assessment, Gemini 2.5 Flash Lite, LangSmith
- Per-test thresholds (WCPM, accuracy, fluency, retries), listed in BRD Appendix B
- Mismatch limits
- Retention period (90 days)
- Abuse caps (3 tests per IP per day, 2 min / 10 MB recordings, 80 speech-minutes daily budget)
- Cost figures
- The 12-week, 6-sprint roadmap with gates A–C

### Document conventions

- Each document opens with a cover or document-information table (version, date, author, status, "Based on") and ends with a revision-history table. Add a row to the revision history when you make a substantive change.
- Diagrams use Mermaid code blocks. Formulas and examples use TypeScript snippets.
- The current Read AI documents use plain, short sentences, British spellings such as "minimisation" and "behaviour", and `--` for dashes in tables. Match this style when editing them.
- Gabriela Souza is the owner, author and LGPD data controller for Read AI.
