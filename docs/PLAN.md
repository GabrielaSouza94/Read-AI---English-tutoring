# Plan: current work

> Claude works through these one at a time (`/next`). Task ids, acceptance criteria and tests come from
> `Product materials/task-breakdown.md`. Tick a task only when its acceptance criteria are met.

## Sprint 1: Setup and data model (weeks 1-2)

- [x] **T0.1 Repository, tooling and CI/CD**
  - [x] React Router + Tailwind CSS 4 app on Cloudflare Workers, TypeScript strict
  - [x] ESLint, Prettier, Vitest, Playwright, Drizzle Kit
  - [x] GitHub Actions: lint → tests → staging on `main` → production after approval
  - [x] Rollback and forward-only migration policy documented (`docs/DEPLOYMENT.md`)
  - [x] Push to GitHub, add Cloudflare secrets and environments; "hello" page deploys to staging from CI
  - [x] Push a deliberately failing test and confirm CI blocks the deploy
  - [x] Deploy twice, then `wrangler rollback --env staging` once
- [x] **T0.2 Cloudflare environments and secrets** (Azure keys follow in T0.5)
  - [x] D1 `read-ai-staging-db` / `read-ai-production-db` and KV namespaces created, bound as `DB` and `KV`
  - [x] Vars `DAILY_STT_MINUTES_CAP`, `RETENTION_DAYS`, `PRIVACY_CONTACT_EMAIL` in each environment
  - [x] Config loader with a clear error for missing settings (unit-tested); `GET /api/health`
  - [x] Secrets list, owners and rotation notes (`docs/SECRETS.md`); Gitleaks in CI
  - [x] Set `PRIVACY_CONTACT_EMAIL` in `wrangler.jsonc`
  - [x] Staging and production deploy; `/api/health` shows database and storage "ok" in both
  - [x] Secret scan passes in CI
  - [x] Secrets set with separate staging and production keys (Azure key and region still to add, T0.5)
- [ ] **T0.3 Database schema, migrations and seed**
  - [x] Drizzle schema for all 11 tables, required indexes, cascades from `participants`
  - [x] Migration `0000_init` with its down script; `db:migrate:*` and `db:seed:*` scripts
  - [x] Idempotent seed: 4 tests, 24 sentences; admin via `-- --admin` (PBKDF2 hash)
  - [x] Tests: seed values match the TRD; migrate + seed twice; cascade delete leaves no orphans
  - [x] CI migrates and seeds before each deploy
  - [ ] Migrations and seed applied to staging and production by CI
  - [ ] Admin account seeded in staging and production
- [ ] T0.4 Logging, monitoring and alerts
- [ ] T0.5 Azure long-audio technical spike
- [ ] T0.6 LangSmith project and first prompt (also: open-model bake-off, see `docs/DECISIONS.md` 2026-11-02)
- [ ] T1.2 Privacy notice and LGPD basics
- [ ] T1.4 Captcha and rate limits

## Done

<!-- Move completed sprints here -->
