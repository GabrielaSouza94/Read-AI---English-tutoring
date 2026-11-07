# Plan: current work

> Claude works through these one at a time (`/next`). Task ids, acceptance criteria and tests come from
> `Product materials/task-breakdown.md`. Tick a task only when its acceptance criteria are met.

## Sprint 3: Scoring pipeline (weeks 5-6)

Goal: every attempt is scored by Deepgram and Azure, gets Gemini feedback, is saved in D1, and a
finished test shows its result. Ends with a full test on staging with the real scorers
(`STUB_SCORER` off on staging; the stub stays for CI). Gate B follows Sprint 4.
Reuse the T0.5 spike code: `app/lib/deepgram.ts`, `azure.ts`, `azure-chunks.ts`, `align.ts`.

- [x] **T3.8 Audio fixture library** (first: the other tasks test against it)
  - [x] Manifest and loader in `test/fixtures/fixtures.ts`; `test/fixtures.test.ts` checks every file is 16 kHz mono WAV, reference texts match the steps, responses are current
  - [x] 20 synthetic fixtures (`npm run fixtures`, Azure neural voice): all 8 kinds for tests 1 and 4, clean + slow for tests 2 and 3; noise and silence made in code
  - [x] Raw Deepgram response and one raw Azure response per chunk saved per fixture (`test/fixtures/responses/`)
  - [x] Findings in `test/fixtures/README.md`: Azure REST stops at long pauses (check with recorded slow reads in T3.3); Deepgram homophones ("Four centuries")
  - [ ] Recorded fixtures by consenting adults: the 8 for tests 1 and 4, clean + slow for tests 2 and 3 (owner)
- [ ] **T3.2 Deepgram client and metrics**
  - [ ] `nova-3`, `en-US`, `smart_format`; accuracy, WCPM (confidence ≥ 0.75 per minute of speech), fluency with similarity
  - [ ] `provider_error` after one retry; `recordProviderCall()`
  - [ ] Decide Deepgram `mip_opt_out` (privacy notice review) and record it
  - [ ] Tests: metrics on a fixture response; similarity (1, 0.9, 0); timeout then success; two failures
- [ ] **T3.3 Azure pronunciation client, chunking and metrics**
  - [ ] Accuracy, fluency, completeness, prosody; miscues; WCPM from ErrorType None
  - [ ] Chunk over 25 s at sentence pauses (T0.5), in parallel, weighted average; one chunk failing twice → `provider_error: azure`
  - [ ] Tests: header, 90 s chunk plan, weighted average and WCPM on a fixture; chunk failure
- [ ] **T3.4 Text alignment and problem-word candidates**
  - [ ] Skipped and added words per scorer; candidates = Deepgram confidence < 0.75 ∪ Azure mispronunciation/omission or word accuracy < 70, in text order
  - [ ] Tests: skipped, added, repeated, reordered; union and order
- [ ] **T3.5 Gemini feedback via LangSmith**
  - [ ] Prompt from Hub (5-minute cache, last copy in KV); two Gemini 2.5 Flash Lite calls in parallel; schema check; fallback to the T3.4 candidates and a generic message
  - [ ] LangSmith traces with ids only, never the display name
  - [ ] Tests: schema validator; timeout → fallback; trace payload has no name
- [ ] **T3.6 Pass rule, step mismatch flags and persistence**
  - [ ] Best-of WCPM, accuracy, fluency against the test thresholds; flags `accuracy_gap`, `wcpm_gap`, `verdict_split`, `unreliable_input`; provider error raises none
  - [ ] `attempts`, `attempt_step`, `attempt_stt` in one transaction
  - [ ] Tests: pass rule table for all 4 tests; each flag at its limit; forced D1 failure leaves no rows
- [ ] **T3.1 Attempt endpoint and orchestration** (replaces the stub in `POST /api/attempts`)
  - [ ] Speech minutes into `usage_daily`; Deepgram and Azure in parallel, then feedback, then T3.6; response with `attemptId`, feedback, metrics, `providerError`
  - [ ] Audio in memory only; P95 under 12 s for a 30 s recording
  - [ ] Tests: happy path schema; 400/413 cases; no binary in D1, KV or logs; usage minutes
- [ ] **T3.7 Idempotent finalize and final mismatch check**
  - [ ] `POST /api/results/:id/finalize`: `test_step_result` averages, best-of scores, flags, `agreement_score`, `review_status`; group code from the `group_code` cookie (T1.3)
  - [ ] Tests: aggregation (50 and 100 → 75); agreement 100; concurrent finalize → one row; flags → `needs_review`
- [ ] **T2.5 Completion page**
  - [ ] `/assessment/completed`: scores, feedback, "Ana S. · K7Q2", portal link (portal in T4.x); reload shows the same result
  - [ ] Tests: E2E with mocked scorers, reload 5 times; portal link target
- [ ] **Sprint check:** full test on staging with the real scorers; costs within the TRD estimate

## MVP2: Own domain (after Gate C, or earlier -- see `task-breakdown.md` §14)

- [ ] T7.1 Domain, DNS and custom domains (`APP_ORIGIN`)
- [ ] T7.2 Redirects and browser-id hand-over (skip the hand-over if done before launch)
- [ ] T7.3 Email on the domain (Resend sender, `privacy@` through Email Routing)
- [ ] T7.4 Edge security on the zone (WAF rule, Access on staging, HSTS, Turnstile hostnames)
- [ ] T7.5 Cutover and documentation

## Done

### Sprint 2: Participant flow (weeks 3-4) -- done 2026-11-07

Goal: **Gate A** -- a participant finishes a full test on staging, with the stub scorer.
Build every MVP task domain-ready (`task-breakdown.md` §14.1): no host names, relative URLs, host-only cookies.

- [x] **T1.1 Landing page, layout and demo banner**
  - [x] `/` with "Take a test" and "Open the portal"; header, footer (privacy link) and demo banner on every page, error pages included
  - [x] Design tokens from `HiFi-Design.md` in the Tailwind theme, colours rechecked for WCAG AA contrast (`test/theme.test.ts`)
  - [x] Tests: E2E banner on `/`, `/start`, `/portal`, `/privacy`; works at 1366 × 768 and 1024 × 768; keyboard reachable, skip link
- [x] **T1.3 Start page and session start** (includes Turnstile verification)
  - [x] `/start` form: name, consent, optional group code, Turnstile widget; field errors announced; returning browser greeted
  - [x] `POST /api/session/start`: Turnstile verified server-side (5 s, fail closed), consent required, name rules and blocked words; `guardSessionStart()` last
  - [x] Display name and unique 4-character code; `browser_id` (host-only cookie + local storage, in `app/lib/browser-id.ts`); `consent_at`, `ip_hash`, `delete_after`; `group_code` session cookie for T2.3
  - [x] Tests: display name and code units; 403 `CONSENT_REQUIRED` / `CAPTCHA_FAILED`; same browser keeps its participant; E2E consent link opens `/privacy`; full flow lands on `/tests` (Turnstile test keys)
  - [x] Staging: Turnstile widget hostnames match the `workers.dev` addresses (owner, Cloudflare dashboard)
- [x] **T2.1 Test picker**
  - [x] `/tests`: 4 cards (level, title, sentences, time); without a participant for this browser, redirect to `/start`
  - [x] Estimated time: 45 s per step + 1 min microphone check (6, 7, 7 and 8 minutes; `app/lib/catalog.ts`)
  - [x] Tests: E2E each card opens the right test; direct visit without a session redirects; catalogue unit and D1 tests
  - [x] CI seeds the local database before the E2E run
- [x] **T2.2 Audio capture (WAV) and microphone check**
  - [x] AudioWorklet → 16 kHz mono PCM → WAV; record, stop, play back, re-record; stop at 120 s; level meter with text status
  - [x] Microphone check before the first recording (3 s, 300 ms above -40 dBFS); permission-denied, no-device, busy and unsupported states
  - [x] On `/assessment?testId=`: participant required, unknown test 404 (the steps arrive in T2.3)
  - [x] Tests: WAV header and length; state machine and 120 s stop; downsampling and mic check; E2E fake microphone records 5 s (Chromium, Firefox)
  - [ ] Manual: Chrome, Edge, Firefox, Safari and a Chromebook: permission prompt, denied state, re-record (owner)
- [x] **T2.3 Progressive step engine and session state**
  - [x] n progressive steps + 2 full reads; progress bar ("Step 3 of 7"); retry limit and auto-progress with an encouraging message
  - [x] Session state in KV (`session:{participantId}:{testId}`, 1-hour TTL); reload resumes
  - [x] Stub scorer behind `STUB_SCORER` (always passes; local and staging, never production)
  - [x] `POST /api/assessment/begin` (uses one of the 3 daily tests) and `POST /api/attempts` (WAV checks, then the scorer)
  - [x] Tests: step builder (7 and 9 steps); retry logic; begin and submit against D1/KV; E2E test 1 end to end (Gate A); reload resumes step 3
- [x] **T2.4 Word highlighting and acknowledgment**
  - [x] Highlight words by position (`app/lib/highlight.ts`); each word a toggle button (`aria-pressed`); Record disabled with a written reason until all are reviewed; "3 words to review" announced
  - [x] Scorer may return `highlightedWords`; kept on the KV session for the retry and returned with the attempt
  - [x] Instruction audio `public/audio/word-review-instruction.mp3` (Azure neural voice, `npm run audio:instructions`) plays once, with replay
  - [x] Tests: word matching (repeats, capitals, punctuation, "farmers'"); D1/KV keeps and clears the words; E2E Record disabled until 3 words clicked (mouse and keyboard)
  - [ ] Manual: keyboard-only and screen-reader pass (NVDA or VoiceOver) (owner)
- [x] **T2.6 Participant error, empty and edge states**
  - [x] Microphone denied, upload failed ("Connection lost", recording kept, "Send again"), provider error (kept and resendable; "One scorer is unavailable; your attempt was saved"), demo paused, rate limited, bad `testId` (404 with "Choose a test"), expired session ("Restart the test"), unsupported browser (shown up front)
  - [x] `app/lib/api-client.ts`: every failure becomes a plain message and a retryable flag; no raw browser error text
  - [x] Tests: E2E each state through mocked 403, 429, 503, 502, network abort and 404; Send again succeeds without re-recording
  - [ ] Manual: disconnect the network during an upload; Send again succeeds (owner)
- [x] **Gate A:** full test on staging with the stub scorer (owner, 2026-11-07)

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
