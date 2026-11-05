# Plan: current work

> Claude works through these one at a time (`/next`). Task ids, acceptance criteria and tests come from
> `Product materials/task-breakdown.md`. Tick a task only when its acceptance criteria are met.

## Sprint 2: Participant flow (weeks 3-4)

Goal: **Gate A** -- a participant finishes a full test on staging, with the stub scorer.
Build every MVP task domain-ready (`task-breakdown.md` §14.1): no host names, relative URLs, host-only cookies.

- [x] **T1.1 Landing page, layout and demo banner**
  - [x] `/` with "Take a test" and "Open the portal"; header, footer (privacy link) and demo banner on every page, error pages included
  - [x] Design tokens from `HiFi-Design.md` in the Tailwind theme, colours rechecked for WCAG AA contrast (`test/theme.test.ts`)
  - [x] Tests: E2E banner on `/`, `/start`, `/portal`, `/privacy`; works at 1366 × 768 and 1024 × 768; keyboard reachable, skip link
- [ ] **T1.3 Start page and session start** (includes Turnstile verification)
  - [ ] `/start` form: name, consent, optional group code, Turnstile widget
  - [ ] `POST /api/session/start`: Turnstile verified server-side, consent required, name rules and blocked words; `guardSessionStart()` last
  - [ ] Display name and unique 4-character code; `browser_id` (host-only cookie + local storage, in one module); `consent_at`, `ip_hash`, `delete_after`
  - [ ] Tests: display name and code units; 403 `CONSENT_REQUIRED` / `CAPTCHA_FAILED`; same browser keeps its participant; E2E consent link opens `/privacy`
- [ ] **T2.1 Test picker**
  - [ ] `/tests`: 4 cards (level, title, sentences, time); without a session, redirect to `/start`
  - [ ] Tests: E2E each card opens the right test; direct visit without a session redirects
- [ ] **T2.2 Audio capture (WAV) and microphone check**
  - [ ] AudioWorklet 16 kHz mono PCM → WAV; record, stop, play back, re-record; stop at 120 s; level meter with text status
  - [ ] Microphone check before the first recording; permission-denied and no-device states
  - [ ] Tests: WAV header and length; state machine; E2E fake audio device records 5 s
- [ ] **T2.3 Progressive step engine and session state**
  - [ ] n progressive steps + 2 full reads; progress bar ("Step 3 of 7"); retry limit and auto-progress
  - [ ] Session state in KV (`session:{participantId}:{testId}`, 1-hour TTL); reload resumes
  - [ ] Stub scorer behind a flag (always passes)
  - [ ] Tests: step builder (7 and 9 steps); retry logic; E2E test 1 end to end (Gate A); reload resumes step 3
- [ ] **T2.4 Word highlighting and acknowledgment**
  - [ ] Highlight words by position; each word a toggle button (`aria-pressed`); record disabled until all are reviewed
  - [ ] Instruction audio plays once, with replay
  - [ ] Tests: word matching (repeats, capitals, punctuation); E2E record disabled until 3 words clicked
- [ ] **T2.6 Participant error, empty and edge states**
  - [ ] Microphone denied, upload failed, provider error, demo paused, rate limited, bad `testId`, expired session, unsupported browser
  - [ ] Tests: E2E each state through mocked 403, 429, 503, 502, network abort and 404
- [ ] **Gate A:** full test on staging with the stub scorer

## MVP2: Own domain (after Gate C, or earlier -- see `task-breakdown.md` §14)

- [ ] T7.1 Domain, DNS and custom domains (`APP_ORIGIN`)
- [ ] T7.2 Redirects and browser-id hand-over (skip the hand-over if done before launch)
- [ ] T7.3 Email on the domain (Resend sender, `privacy@` through Email Routing)
- [ ] T7.4 Edge security on the zone (WAF rule, Access on staging, HSTS, Turnstile hostnames)
- [ ] T7.5 Cutover and documentation

## Done

### Sprint 1: Setup and data model (weeks 1-2) -- done 2026-11-04

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
- [x] **T0.3 Database schema, migrations and seed**
  - [x] Drizzle schema for all 11 tables, required indexes, cascades from `participants`
  - [x] Migration `0000_init` with its down script; `db:migrate:*` and `db:seed:*` scripts
  - [x] Idempotent seed: 4 tests, 24 sentences; admin via `-- --admin` (PBKDF2 hash)
  - [x] Tests: seed values match the TRD; migrate + seed twice; cascade delete leaves no orphans
  - [x] CI migrates and seeds before each deploy
  - [x] Migrations and seed applied to staging and production by CI
  - [x] Admin account seeded in staging and production
- [x] **T0.4 Logging, monitoring and alerts**
  - [x] JSON logger with redaction; request id, route, status and latency on every request; `x-request-id` header
  - [x] Unhandled errors logged with the request id (`handleError`); S-1 `INTERNAL` JSON for API 500s
  - [x] `metrics_hourly` counters; hourly cron with speech-budget, provider-error and 5xx alerts; KV dedupe
  - [x] Alert email through Resend (`RESEND_API_KEY`, `ALERT_EMAIL`)
  - [x] `admin_audit` table and `recordAdminAction()` (used from T5.1)
  - [x] Tests: redaction, alert rules, email retry, request finalising, D1 counters and audit, E2E forced error
  - [x] `RESEND_API_KEY` set in staging and production; `RESEND_API_KEY=` added to `.dev.vars.example`
  - [x] Forced error found in staging logs by request id; test alert reaches the owner's inbox
- [x] **T0.5 Azure long-audio technical spike** (`docs/spikes/T0.5-azure-long-audio.md`)
  - [x] REST limit confirmed from a Worker: over 30 s returns 200 but scores only the start; client now refuses it
  - [x] Sentence-boundary chunking with Deepgram timings; 97 s read scored in 7.0 s on staging (target 15 s)
  - [x] Whole vs chunked on short reads: every score within 5 points (two chunks)
  - [x] WebSocket continuous mode works from Workers but takes about 20 s for 100 s; rejected
  - [x] Latency for 20, 33, 69 and 97 s reads; cost about $0.026 per audio minute
  - [x] Decision recorded in TRD §6.2, BRD R8, product docs and T3.3
- [x] **T0.6 LangSmith project and first prompt** (open-model bake-off moved to T3.5)
  - [x] Feedback prompt in `app/lib/prompts.ts`: tone rules, mustache variables, output schema (`StructuredPrompt`)
  - [x] Prompt Hub client (`pullPrompt`), mustache renderer, `LANGSMITH_PROJECT` and `LANGSMITH_FEEDBACK_PROMPT_ID` per environment
  - [x] `npm run prompt:push` (projects, prompt, `staging`/`production` tags); `GET /api/debug/prompt`
  - [x] Tests: render fills every placeholder; manifest round-trip; pull with a stubbed Hub (live test when a key is set)
  - [x] Prompt pushed (commit `7dc45541`, tagged `staging` and `production`); projects created; keys replaced in all 3 environments
  - [x] `/api/debug/prompt` on staging pulls `read-ai-feedback:staging` in 253 ms, every placeholder filled
  - [x] Sample call in the Playground returns valid JSON (Gemini 2.5 Flash Lite)
- [x] **T1.2 Privacy notice and LGPD basics**
  - [x] `/privacy`: controller, contact email and retention from settings (`loadPrivacyConfig`), data stored, purposes and legal basis, third parties, no audio, deletion, rights, age
  - [x] Footer link on every page (minimal footer; full layout shell in T1.1)
  - [x] Tests: E2E footer link and notice content; unit `loadPrivacyConfig`
  - [x] Content checked against BRD §7 privacy rows
  - [x] Consent-box link test moved to T1.3 (the consent box does not exist yet)
- [x] **T1.4 Rate limits, budget guard and kill-switch check** (captcha verification is part of T1.3)
  - [x] `app/lib/limits.ts`: KV counters (3 tests, 20 reviews per IP per UTC day), `guardSessionStart`, `guardReviewSave`
  - [x] Speech budget and kill switch from D1 `usage_daily`; the switch carries over midnight; running attempts never refused
  - [x] `app/lib/ip.ts`: client IP and salted SHA-256 hash
  - [x] `API_RATE_LIMITER` binding: 60 requests a minute per IP on `/api/*` (instead of a WAF rule)
  - [x] Tests: counters and UTC reset; 4th start 429; budget 503 while an attempt finishes; kill switch within one request
