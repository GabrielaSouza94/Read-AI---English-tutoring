# Read AI

A public web platform that assesses English reading fluency. A participant reads a short story aloud, two
speech engines (Deepgram and Azure) score each attempt, an LLM writes feedback, and a public professor
portal shows the results. The portal flags cases where the engines disagree, so a person can review them.

Portfolio project by Gabriela Souza. The specification is in `Product materials/` (start with `docs/SPEC.md`).

## Quick start

Requires Node 22+.

```bash
npm install
cp .dev.vars.example .dev.vars   # local secrets; not needed for the hello page
npm run dev                      # http://localhost:5173
```

## Commands

| Command                                        | What it does                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                                  | Dev server with hot reload, running in workerd                     |
| `npm run typecheck`                            | Generate Worker and route types, then `tsc -b`                     |
| `npm run lint` / `npm run format`              | ESLint / Prettier (write)                                          |
| `npm test`                                     | Vitest unit tests (`npx vitest run <file>` for one)                |
| `npm run test:e2e`                             | Playwright in Chromium, Firefox and WebKit, against `vite preview` |
| `npm run db:generate`                          | Drizzle Kit: generate SQL migrations                               |
| `npm run deploy:staging` / `deploy:production` | Build for that environment and deploy                              |

Before running E2E tests for the first time, install the browsers: `npx playwright install`.

Deployment, rollback and migration rules are in `docs/DEPLOYMENT.md`.

## Working with Claude Code

See **SETUP.md**. Key commands inside Claude: `/plan <task>`, `/next`, `/review`, `/fix-tests`.
