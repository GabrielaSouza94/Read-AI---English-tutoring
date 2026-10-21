# Plan: current work

> Claude works through these one at a time (`/next`). Task ids, acceptance criteria and tests come from
> `Product materials/task-breakdown.md`. Tick a task only when its acceptance criteria are met.

## Sprint 1: Setup and data model (weeks 1-2)

- [ ] **T0.1 Repository, tooling and CI/CD**
  - [x] React Router + Tailwind CSS 4 app on Cloudflare Workers, TypeScript strict
  - [x] ESLint, Prettier, Vitest, Playwright, Drizzle Kit
  - [x] GitHub Actions: lint → tests → staging on `main` → production after approval
  - [x] Rollback and forward-only migration policy documented (`docs/DEPLOYMENT.md`)
  - [ ] Push to GitHub, add Cloudflare secrets and environments; "hello" page deploys to staging from CI
  - [ ] Push a deliberately failing test and confirm CI blocks the deploy
  - [ ] Deploy twice, then `wrangler rollback --env staging` once
- [ ] T0.2 Cloudflare environments and secrets
- [ ] T0.3 Database schema, migrations and seed
- [ ] T0.4 Logging, monitoring and alerts
- [ ] T0.5 Azure long-audio technical spike
- [ ] T0.6 LangSmith project and first prompt
- [ ] T1.2 Privacy notice and LGPD basics
- [ ] T1.4 Captcha and rate limits

## Done

<!-- Move completed sprints here -->
