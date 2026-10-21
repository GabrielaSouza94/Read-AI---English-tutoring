# Read AI - Development Task Breakdown

| Field | Details |
| ----- | ------- |
| **Project** | Read AI -- English Reading Fluency Assessment (Public MVP) |
| **Owner** | Gabriela |
| **Date** | October 20, 2026 |
| **Version** | 1.0 |
| **Sources** | Read AI BRD v1.0 (`business-requirements.md`), Read AI TRD v1.0 (`technical-requirements.md`), gaps from `INSPECTION-REPORT.md` |

---

## 1. How to Read This Document

The MVP breaks into **7 epics and 42 tasks**, about **60 developer-days** over the 12-week, 6-sprint roadmap. Each task lists:

- **Product requirements** -- the BRD requirements (BR-xx), business rules (BR-RULE-xx) and the behaviour a user sees.
- **Technical requirements** -- the TRD requirements (TR-xx) and the implementation details.
- **Use cases** -- BRD use cases, where the task is part of a user flow:
  - **UC-1** Participant takes a reading test
  - **UC-2** Visitor explores the portal and reviews a result
  - **UC-3** Admin moderates the site
- **Acceptance criteria** -- what must be true to close the task.
- **Tests** -- tagged **[Unit]** (Vitest), **[Int]** (integration, mocked external services), **[E2E]** (Playwright), **[Manual]**.

Estimates are in developer-days (d) for one full-stack developer. Priorities: **P0** blocks launch, **P1** needed for launch, **P2** improves launch quality.

Items marked **(added)** fill gaps the TRD leaves open (error formats, timeouts, observability). Fold them into the TRD when it is next revised.

---

## 2. Summary

### 2.1 Epics

| Epic | Name | Tasks | Estimate |
| ---- | ---- | ----- | -------- |
| E0 | Project foundations | 6 | 8.5 d |
| E1 | Access, consent and privacy | 5 | 6 d |
| E2 | Participant assessment flow | 6 | 9 d |
| E3 | Scoring pipeline | 8 | 11.5 d |
| E4 | Professor portal | 4 | 6 d |
| E5 | Review and moderation | 3 | 5.5 d |
| E6 | Quality, calibration and launch | 10 | 14 d |
| **Total** | | **42** | **60.5 d** |

### 2.2 Sprint Plan

| Sprint | Weeks | Tasks | Load |
| ------ | ----- | ----- | ---- |
| 1 · Setup and data model | 1-2 | T0.1-T0.6, T1.2, T1.4 | 10.5 d |
| 2 · Participant flow | 3-4 | T1.1, T1.3, T2.1-T2.4, T2.6 | 11 d |
| **Gate A** | | A participant finishes a full test on staging (stub scorer) | |
| 3 · Scoring pipeline | 5-6 | T3.1-T3.8, T2.5 | 12.5 d |
| 4 · Portal and review | 7-8 | T4.1-T4.4, T5.1-T5.3, T1.5 | 12.5 d |
| **Gate B** | | Feature complete; final 4 stories loaded | |
| 5 · QA and calibration | 9-10 | T6.1-T6.7 | 8.5 d |
| 6 · Launch and handover | 11-12 | T6.8-T6.10 | 5.5 d |
| **Gate C** | | MVP sign-off | |

A sprint holds 10 developer-days. Sprints 3 and 4 run about 2.5 days over each. With one developer, the lighter Sprints 5-6 (and the 3-day buffer in T6.10) absorb the overflow, which leaves almost no slack. A second developer for Sprints 3-4 removes the risk.

### 2.3 Critical Path

T0.3 schema → T1.3 session start → T2.3 step engine → T3.1 attempt endpoint → T3.3 Azure client → T3.7 finalize → T4.1/T4.2 portal → T5.1 review → T6.7 calibration → T6.8 launch.

The Azure long-audio spike (T0.5) is the biggest technical risk; its outcome can change T3.3's estimate.

---

## 3. Cross-Cutting Standards (apply to every task)

### S-1 API Error Format (added)

Every API error returns JSON with an HTTP status:

```json
{ "error": { "code": "RATE_LIMITED", "message": "Daily test limit reached", "retryable": false } }
```

| Code | HTTP | Meaning |
| ---- | ---- | ------- |
| `VALIDATION_FAILED` | 400 | Input failed validation (details in `fields`) |
| `CAPTCHA_FAILED` | 403 | Turnstile token missing or invalid |
| `CONSENT_REQUIRED` | 403 | Consent not given |
| `NOT_FOUND` | 404 | Unknown result, test or participant |
| `STALE_REVIEW` | 409 | Review form out of date |
| `AUDIO_TOO_LARGE` | 413 | Audio over 10 MB or 2 minutes |
| `RATE_LIMITED` | 429 | Per-IP limit reached |
| `DEMO_PAUSED` | 503 | Daily budget used or kill switch on |
| `PROVIDER_ERROR` | 502 | A scorer failed after retry (attempt still saved) |
| `INTERNAL` | 500 | Unexpected error (logged with request id) |

### S-2 External Call Policy (added)

| Service | Timeout | Retry |
| ------- | ------- | ----- |
| Deepgram | 20 s | Once, after 500 ms |
| Azure (per chunk) | 20 s | Once, after 500 ms |
| Gemini | 15 s | Once; then fallback feedback |
| LangSmith prompt pull | 5 s | Use cached prompt (5-minute cache, plus last-known copy in KV) |
| Turnstile verify | 5 s | No retry; fail closed |

### S-3 Definition of Done

- Code reviewed (self-review checklist when working solo), merged to `main`, deployed to staging.
- Unit and integration tests pass in CI; new E2E paths added to the Playwright suite.
- Error and empty states handled; keyboard accessible; no console errors.
- No participant name in logs or LangSmith traces.
- Docs updated where behaviour changed.

---

## 4. Epic E0 -- Project Foundations

### T0.1 Repository, tooling and CI/CD

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 1 | 2 d | P0 | -- |

**Product requirements:** Enables every BR; no user-facing behaviour.

**Technical requirements:** TRD 3.2, 9.1.

- React Router 7 + Tailwind CSS 4 app on Cloudflare Workers, TypeScript strict mode.
- ESLint, Prettier, Vitest, Playwright, Drizzle Kit.
- GitHub Actions: lint → unit/integration tests → deploy to staging on `main`; manual approval to production.
- Rollback (added): `wrangler rollback` to the previous Worker version; migrations written forward-only, with a documented down-migration script for each.

**Use cases:** n/a

**Acceptance criteria:** A "hello" page deploys to staging from CI; a failed test blocks deployment; rollback tested once.

**Tests:**

- [Int] CI pipeline fails on a deliberately failing test.
- [Manual] Deploy to staging, then roll back to the previous version.

### T0.2 Cloudflare environments and secrets

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 1 | 1 d | P0 | T0.1 |

**Product requirements:** BR-16 (cost control relies on correct configuration).

**Technical requirements:** Product documentation, "Environment Configuration".

- Local, staging and production Workers; D1 databases `read-ai-staging-db`, `read-ai-production-db`; KV namespaces per environment.
- Secrets via `wrangler secret`: Deepgram, Azure key and region, Gemini, LangSmith, Turnstile, `IP_HASH_SALT`.
- Variables: `DAILY_STT_MINUTES_CAP=80`, `RETENTION_DAYS=90`, `PRIVACY_CONTACT_EMAIL`.
- Key rotation (added): each key has a named owner and a rotation note; rotate on suspected leak and every 6 months.

**Use cases:** n/a

**Acceptance criteria:** All three environments run; no secret in the repository; staging and production use separate keys.

**Tests:**

- [Unit] Config loader throws a clear error when a required variable is missing.
- [Manual] Secret scan of the repository (for example `gitleaks`) passes.

### T0.3 Database schema, migrations and seed

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 1 | 2 d | P0 | T0.2 |

**Product requirements:** BR-04, BR-06, BR-10, BR-11, BR-15, BR-17.

**Technical requirements:** TRD 5.1-5.2.

- Drizzle schema for `tests`, `sentences`, `participants`, `attempts`, `attempt_step`, `attempt_stt`, `test_results`, `test_step_result`, `review_events`, `admins`, `usage_daily`.
- Indexes: `participants(display_name, code)` unique; `test_results(review_status, finalized_at)`; `attempts(participant_id, test_id, step_number)`; `participants(delete_after)`.
- Foreign keys with `ON DELETE CASCADE` from `participants` (supports retention and erasure).
- Seed: 4 tests with thresholds, retry limits and mismatch limits (TRD 4.6, 4.9); sentences; one admin account.

**Use cases:** n/a

**Acceptance criteria:** Migrations run on local, staging and production; seed is repeatable (idempotent); deleting a participant removes all their rows.

**Tests:**

- [Int] Migrate an empty database, seed twice, assert 4 tests and 24 sentences.
- [Int] Insert a participant with attempts, results and reviews; delete the participant; assert no orphan rows.
- [Unit] Seed values match the TRD table (thresholds, retries, sentence counts).

### T0.4 Logging, monitoring and alerts (added)

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 1 | 1 d | P1 | T0.2 |

**Product requirements:** BR-12 (admin needs visibility), BR-16 (cost), BR-15 (no personal data in logs).

**Technical requirements:** TRD 8.3.

- Structured JSON logs with request id, route, status and latency; never names or raw IPs.
- Workers Logs or Logpush enabled; error tracking for unhandled exceptions.
- Alerts by email: daily speech minutes over 80% of cap; provider error rate over 10% in an hour; 5xx rate over 5%.
- Admin audit log: every admin action (login, hide, delete, revert, trust, kill switch) written to a `admin_audit` table or log stream.

**Use cases:** UC-3 (audit of admin actions).

**Acceptance criteria:** A forced error appears in logs with a request id; a test alert reaches the owner's email.

**Tests:**

- [Unit] Log redaction removes `name`, `reviewerName` and IP fields.
- [Manual] Trigger each alert on staging.

### T0.5 Azure long-audio technical spike

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 1 | 2 d | P0 | T0.2 |

**Product requirements:** BR-01 (both scorers on every attempt).

**Technical requirements:** TRD 6.2; BRD risk R8.

- Confirm the REST short-audio limit (30 seconds) and response fields from a Worker.
- Prototype splitting a 90-second WAV at sentence boundaries using Deepgram word timings, scoring each chunk with its reference sentences, and averaging by word count.
- Check whether a WebSocket route to Azure works from Workers as an alternative.
- Write a one-page decision note with latency and cost per minute.

**Use cases:** UC-1 (long steps and full-story reads).

**Acceptance criteria:** A chosen approach that scores a 100-second read from a Worker within 15 seconds end to end; decision recorded in the TRD.

**Tests:**

- [Manual] Score the same recording whole (under 30 seconds) and chunked; scores differ by 5 points or less.
- [Manual] Measure latency for 30, 60 and 100-second reads.

### T0.6 LangSmith project and first prompt

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 1 | 0.5 d | P1 | T0.2 |

**Product requirements:** BR-14, BR-RULE-14, BR-RULE-15.

**Technical requirements:** TR-13.

- LangSmith project per environment; feedback prompt in Prompt Hub with mustache variables (scorer result, reference text, thresholds).
- Output schema: `listOfWordsToHighlight`, `feedback`, `wordsSkipped`, `wordsAdded`.
- Tone rules in the prompt: encouraging, specific, for adult English learners, at most 3 sentences.

**Use cases:** n/a

**Acceptance criteria:** Prompt pulls from a Worker; a sample call in the Playground returns valid JSON.

**Tests:**

- [Int] Pull prompt and render it with fixture variables; assert all placeholders are filled.

---

## 5. Epic E1 -- Access, Consent and Privacy

### T1.1 Landing page, layout and demo banner

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 2 | 1 d | P1 | T0.1 |

**Product requirements:** BR-03, BR-18. Visitors understand what Read AI is and that it is a public demo.

**Technical requirements:** TR-03, TR-17; TRD 7.1-7.2.

- Route `/` with two calls to action: "Take a test" and "Open the portal".
- Layout shell with header, footer (privacy link) and the banner "Public demo — names and scores are visible to everyone" on every page.
- Design tokens (colours, type scale, spacing, radius) adapted from `HiFi-Design.md` into Tailwind theme.

**Use cases:** UC-1 step 1; UC-2 step 1.

**Acceptance criteria:** Banner visible on every route; works at 1366 × 768 and 1024 × 768; keyboard reachable.

**Tests:**

- [E2E] Banner present on `/`, `/start`, `/portal`, `/privacy`.
- [Manual] Contrast check of tokens (WCAG AA 4.5:1 for text).

### T1.2 Privacy notice page

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 1 | 0.5 d | P0 | T0.1 |

**Product requirements:** BR-15; restriction "Privacy notice naming Gabriela as responsible".

**Technical requirements:** TR-14.

- `/privacy`: responsible person (Gabriela) and contact email from `PRIVACY_CONTACT_EMAIL`; data stored; purposes; 90-day retention; third parties (Deepgram, Azure, Google, LangSmith, Cloudflare); no audio storage; how to delete.

**Use cases:** UC-1 step 2 (linked from consent).

**Acceptance criteria:** Page reachable from footer and consent box; contact email correct per environment.

**Tests:**

- [E2E] Consent link opens `/privacy`.
- [Manual] Content review against BRD section 7 privacy rows.

### T1.3 Start page and session start (name, consent, code)

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 2 | 2 d | P0 | T0.3, T1.4 |

**Product requirements:** BR-04, BR-05; BR-RULE-01, 02, 03. A participant enters a name or nickname, ticks consent, passes a captcha and gets a public identity like "Ana S. · K7Q2".

**Technical requirements:** TR-04, TR-05.

- `/start` form: name, consent checkbox, optional group code, Turnstile widget.
- `POST /api/session/start`: verify Turnstile server-side; reject without `consent=true`; validate name (2-40 characters; letters, spaces, hyphens, apostrophes; blocked-word list).
- Display name = first word + initial of last word; store only the display name.
- Code = 4 characters from an unambiguous alphabet (no 0, O, 1, I, L), unique per display name; retry on collision.
- `browser_id` cookie + localStorage; a returning browser resumes the same participant.
- Store `consent_at`, salted `ip_hash`, `delete_after = now + 90 days`.

**Use cases:** UC-1 steps 1-3.

**Acceptance criteria:** Valid input creates one participant and redirects to `/tests`; returning browser keeps the same code; invalid input shows field errors announced to screen readers.

**Tests:**

- [Unit] Display name: "Ana Silva" → "Ana S."; "Maria" → "Maria"; "José da Costa" → "José C."; extra spaces trimmed.
- [Unit] Code generator uses only the allowed alphabet; 10,000 codes for the same name have no duplicates.
- [Unit] Name validation rejects 1 character, 41 characters, digits, HTML (`<script>`), and blocked words.
- [Int] Missing consent → 403 `CONSENT_REQUIRED`; bad captcha → 403 `CAPTCHA_FAILED`.
- [Int] Two requests with the same `browser_id` return the same participant.
- [E2E] Full start flow with Turnstile test keys lands on `/tests`.

### T1.4 Rate limits, budget guard and kill-switch check

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 1 | 1.5 d | P0 | T0.2, T0.3 |

**Product requirements:** BR-16; BR-RULE-13. The demo stays affordable and resists abuse.

**Technical requirements:** TR-15.

- KV counters: `tests:{ipHash}:{date}` (max 3), `reviews:{ipHash}:{date}` (max 20), 24-hour TTL.
- Budget guard: refuse new sessions when `usage_daily.stt_minutes` ≥ `DAILY_STT_MINUTES_CAP` or `paused` is true → 503 `DEMO_PAUSED`.
- Cloudflare WAF rate-limiting rule on `/api/*` (for example 60 requests per minute per IP).
- Middleware reusable by T1.3, T3.1 and T5.1.

**Use cases:** UC-1 (limits); UC-2 (review limit); UC-3 (kill switch).

**Acceptance criteria:** Fourth test from one IP in a day is refused with a friendly message; budget reached pauses new tests but lets running tests finish.

**Tests:**

- [Unit] Counter increments and resets by date (UTC).
- [Int] 3 session starts succeed, the 4th returns 429 `RATE_LIMITED`.
- [Int] Budget at cap → 503 `DEMO_PAUSED` on start; an in-progress attempt still succeeds.
- [Int] Kill switch on → start refused within one request.

### T1.5 Retention job and "Delete my result"

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 4 | 1 d | P0 | T0.3, T3.7 |

**Product requirements:** BR-15; BR-RULE-10, BR-RULE-11.

**Technical requirements:** TR-14.

- Scheduled Worker (daily, 03:00 UTC) deletes participants with `delete_after < now` (cascade).
- `DELETE /api/results/:id`: allowed when the request's `browser_id` matches the participant; otherwise 403.
- "Delete my result" button on the completion page and on the participant's own portal entry (shown only to the matching browser), with a confirmation dialog.

**Use cases:** UC-1 (erasure); UC-3 step 4 (admin deletion uses T5.3).

**Acceptance criteria:** Expired data disappears within 24 hours; a participant can delete their own result and no one else's.

**Tests:**

- [Int] Participant with `delete_after` in the past is removed with all rows; one in the future is kept.
- [Int] Delete with wrong `browser_id` → 403; with the right one → 204 and rows gone.
- [E2E] Delete from the completion page; result no longer in portal search.

---

## 6. Epic E2 -- Participant Assessment Flow

### T2.1 Test picker

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 2 | 0.5 d | P0 | T0.3, T1.3 |

**Product requirements:** BR-06. The participant chooses one of 4 tests, easiest to hardest.

**Technical requirements:** TR-06.

- `/tests` lists the 4 tests with level (A2-C1), title, sentence count and estimated time; requires a participant session (else redirect to `/start`).

**Use cases:** UC-1 step 4.

**Acceptance criteria:** Selecting a test opens `/assessment?testId={id}`; without a session the user is sent to `/start`.

**Tests:**

- [E2E] Each of the 4 cards opens the right test.
- [E2E] Direct visit to `/tests` without a session redirects to `/start`.

### T2.2 Audio capture (WAV) and microphone check

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 2 | 2.5 d | P0 | T0.1 |

**Product requirements:** BR-01; restriction "recording max 2 minutes and 10 MB".

**Technical requirements:** TRD 3.3 (audio format), product documentation "Audio Recording".

- AudioWorklet capture, 16 kHz mono PCM, encoded to WAV in the browser; echo cancellation and noise suppression on.
- Record, stop, play back, re-record; automatic stop at 120 seconds; live level meter with a text status ("Recording 0:12").
- Microphone check before the first recording (speak for 3 seconds, level must pass).
- States: idle, requesting permission, recording, encoding, ready, uploading, error (permission denied, no device).

**Use cases:** UC-1 step 5.

**Acceptance criteria:** Produces valid 16 kHz mono WAV under 10 MB for 2 minutes; permission denied shows instructions to re-enable the microphone.

**Tests:**

- [Unit] WAV encoder writes a correct header (sample rate 16,000, 1 channel, 16-bit) and length.
- [Unit] State machine transitions match the diagram; stop at 120 seconds.
- [E2E] With Chromium's fake audio device, record 5 seconds and assert a WAV blob of the expected size.
- [Manual] Chrome, Edge, Firefox, Safari and a Chromebook: permission prompt, denied state, re-record.

### T2.3 Progressive step engine and session state

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 2 | 2 d | P0 | T0.3, T2.2 |

**Product requirements:** BR-02; BR-RULE-04. Sentence 1, then 1+2, until the full story, then two full-story reads; retries up to the test's limit, then auto-progress.

**Technical requirements:** TR-02.

- Step list for n sentences: n progressive steps + 2 full-story reads.
- Text panel shows the sentences for the current step; progress bar with one segment per step and a text label ("Step 3 of 7").
- Attempt counter per step from `tests.max_attempts_per_step`; auto-progress message after the limit.
- Session state in KV (`session:{participantId}:{testId}`, 1-hour TTL); reload resumes the current step.
- Stub scorer behind a feature flag (always passes) so Gate A can be reached before Sprint 3.

**Use cases:** UC-1 steps 5-7.

**Acceptance criteria:** Test 1 shows 7 steps, test 4 shows 9; after the retry limit the next step loads with an encouraging message; reload mid-test resumes.

**Tests:**

- [Unit] Step builder: 5 sentences → 7 steps with correct sentence ranges; 7 sentences → 9 steps.
- [Unit] Retry logic: fail on attempt 1 and 2 → retry; fail at limit → auto-progress.
- [E2E] With the stub scorer, complete test 1 end to end (Gate A).
- [E2E] Reload on step 3 resumes step 3.

### T2.4 Word highlighting and acknowledgment

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 2 | 1.5 d | P0 | T2.3 |

**Product requirements:** BR-07. Problem words are highlighted; the participant must acknowledge each before retrying.

**Technical requirements:** TR-07.

- Highlight words returned in `highlightedWords` (match by position, case-insensitive, punctuation stripped).
- Audio instruction plays once automatically, with a replay button; asset `word-review-instruction.mp3` (adult tone).
- Each highlighted word is a button; clicking marks it reviewed (style + `aria-pressed`); record button disabled until all are reviewed, with a text reason.

**Use cases:** UC-1 step 6.

**Acceptance criteria:** Record button enables only after every word is acknowledged; works with keyboard only; screen reader announces "3 words to review".

**Tests:**

- [Unit] Word matching handles repeated words, capitals and punctuation ("farmers'" vs "farmers").
- [E2E] Mocked failed attempt with 3 words: record disabled until all 3 clicked.
- [Manual] Keyboard-only and screen-reader pass (NVDA or VoiceOver).

### T2.5 Completion page

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 3 | 1 d | P0 | T3.7 |

**Product requirements:** BR-04, BR-15. The participant sees scores, feedback, their public identity and can delete the result.

**Technical requirements:** TR-02 (idempotent finalize), TR-04.

- `/assessment/completed`: best WCPM, accuracy, fluency; AI feedback; "Ana S. · K7Q2"; link to the portal entry; "Delete my result" (T1.5).
- Calls finalize; reload shows the same saved result (fixes the ReadAssist reload bug).

**Use cases:** UC-1 step 8.

**Acceptance criteria:** Reloading 5 times shows the same result with no error; portal link opens the right result.

**Tests:**

- [E2E] Complete a test with mocked scorers; reload the completion page; same values shown.
- [E2E] Portal link resolves to the participant's details page.

### T2.6 Participant error, empty and edge states (added)

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 2 | 1.5 d | P1 | T2.2, T2.3 |

**Product requirements:** BR-03, BR-16; inspection report "missing error states".

**Technical requirements:** S-1 error format; TR-15.

States with clear text and a next action:

| State | Message and action |
| ----- | ------------------ |
| Microphone denied | How to allow it in the browser; retry button |
| Upload failed (network) | "Connection lost" with retry; recording kept in memory |
| Provider error | "One scorer is unavailable; your attempt was saved" |
| Demo paused | "Demo paused until tomorrow" |
| Rate limited | "You've reached today's 3 tests" |
| Invalid `testId` | 404 page with link to `/tests` |
| Session expired (over 1 hour idle) | Restart the test |
| Unsupported browser (no AudioWorklet) | Supported browsers list |

**Use cases:** UC-1 alternative flows.

**Acceptance criteria:** Every row above reachable and shown correctly; no raw error text shown to users.

**Tests:**

- [E2E] Each state forced via mocked API responses (403, 429, 503, 502, network abort, 404).
- [Manual] Disconnect network during upload; retry succeeds without re-recording.

---

## 7. Epic E3 -- Scoring Pipeline

### T3.1 Attempt endpoint and orchestration

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 3 | 1.5 d | P0 | T1.4, T2.3 |

**Product requirements:** BR-01, BR-RULE-05, BR-RULE-06.

**Technical requirements:** TR-01; S-1, S-2.

- `POST /api/attempts` (multipart: audio WAV, `testId`, `stepNumber`, `attemptNumber`).
- Validate session, step order, WAV header, size ≤ 10 MB, duration ≤ 2 minutes.
- Add audio minutes to `usage_daily`; call Deepgram and Azure in parallel (T3.2, T3.3); then feedback (T3.5); then pass rule, flags and persistence (T3.6).
- Audio held in memory only; never written to D1, KV or logs.
- Response: `{ attemptId, passed, highlightedWords, feedback: { deepgram, azure }, metrics, providerError? }`.

**Use cases:** UC-1 step 5.

**Acceptance criteria:** P95 response time under 12 seconds for a 30-second recording; audio never persisted.

**Tests:**

- [Int] Happy path with mocked providers returns the documented schema.
- [Int] Out-of-order step → 400; 11 MB file → 413; non-WAV → 400.
- [Int] Assert no binary data in D1, KV writes or log output.
- [Int] Usage minutes increase by the recording length.

### T3.2 Deepgram client and metrics

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 3 | 1.5 d | P0 | T0.2 |

**Product requirements:** BR-01, BR-17.

**Technical requirements:** TRD 6.1; S-2.

- `nova-3`, `en-US`, `smart_format=true`; word confidence and timings.
- Accuracy = mean confidence × 100; WCPM = words with confidence ≥ 0.75 per minute of speech (first to last word timing).
- Fluency = (accuracy / 100) × mean confidence × similarity × 100, where similarity (added) = 1 − (word-level edit distance ÷ reference word count), floored at 0.
- Timeout 20 seconds, one retry; return `provider_error` on failure.

**Use cases:** UC-1 step 5.

**Acceptance criteria:** Metrics match hand-calculated values on fixtures.

**Tests:**

- [Unit] Metric functions on a fixture response with known values.
- [Unit] Similarity: identical text → 1; one skipped word of 10 → 0.9; empty transcript → 0.
- [Int] Timeout then success → one retry; two failures → `provider_error`.
- [Int] Live call on staging with fixture audio (nightly, not on every commit).

### T3.3 Azure pronunciation client, chunking and metrics

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 3 | 2.5 d | P0 | T0.5, T3.2 |

**Product requirements:** BR-01, BR-17.

**Technical requirements:** TRD 6.2; S-2.

- REST call with `Pronunciation-Assessment` header: reference text, `HundredMark`, `Word`, `Comprehensive`, `EnableMiscue: true`.
- Chunking per T0.5 decision: split at sentence boundaries using Deepgram timings when audio > 30 seconds; score each chunk; weighted average by word count.
- Metrics: AccuracyScore, FluencyScore, CompletenessScore, prosody where returned; miscues (Omission, Insertion, Mispronunciation); WCPM = words with ErrorType None ÷ speech seconds × 60.
- Timeout 20 seconds per chunk, one retry.

**Use cases:** UC-1 step 5.

**Acceptance criteria:** Short and long fixtures score successfully; chunked and unchunked scores of the same short audio match within 5 points.

**Tests:**

- [Unit] Header builder produces valid base64 JSON.
- [Unit] Chunker splits a 90-second fixture into chunks ≤ 30 seconds aligned to sentences.
- [Unit] Weighted average and WCPM from a fixture response.
- [Int] One chunk fails twice → attempt saved with `provider_error: azure`.
- [Int] Live call on staging with fixture audio (nightly).

### T3.4 Text alignment and problem-word candidates

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 3 | 1 d | P0 | T3.2, T3.3 |

**Product requirements:** BR-07, BR-17.

**Technical requirements:** TR-07, TR-16.

- Align each transcript with the reference (normalised: lower case, punctuation stripped, contractions kept) to find skipped and added words.
- Candidate words = union of Deepgram confidence < 0.75 and Azure Mispronunciation / Omission or word accuracy < 70. A word fails if **either** scorer flags it (resolves the inspection report's ambiguity).

**Use cases:** UC-1 step 6.

**Acceptance criteria:** Correct skipped and added lists on fixtures; candidate list deduplicated, in text order.

**Tests:**

- [Unit] Alignment: skipped word, added word, repeated word, reordered words.
- [Unit] Candidate union and order.

### T3.5 Gemini feedback via LangSmith

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 3 | 1.5 d | P0 | T0.6, T3.4 |

**Product requirements:** BR-14; BR-RULE-12, BR-RULE-14, BR-RULE-15.

**Technical requirements:** TR-13; S-2.

- Pull prompt (5-minute cache, last-known copy in KV); two Gemini calls in parallel (one per scorer).
- Validate output against the JSON schema; on invalid output or failure, fall back to the T3.4 candidate list and a generic encouraging message.
- Trace each call in LangSmith with attempt, participant and test ids, step and scorer; never the display name.

**Use cases:** UC-1 step 5.

**Acceptance criteria:** Valid feedback for both scorers on fixtures; fallback works when Gemini is down; traces contain no names.

**Tests:**

- [Unit] Schema validator accepts valid output and rejects missing fields.
- [Int] Gemini timeout → fallback feedback, attempt still succeeds.
- [Int] Captured trace payload has no `display_name` or name string.
- [Manual] Review 20 feedback samples for tone (encouraging, specific, ≤ 3 sentences).

### T3.6 Pass rule, step mismatch flags and persistence

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 3 | 1 d | P0 | T3.2-T3.5 |

**Product requirements:** BR-02, BR-09, BR-17; BR-RULE-05.

**Technical requirements:** TR-01 (pass rule), TR-09, TR-16.

- Pass when best-of WCPM, accuracy and fluency all meet the test thresholds.
- Flags per attempt: `accuracy_gap` (> 15 points), `wcpm_gap` (> 25%), `verdict_split`, `unreliable_input` (Azure completeness < 80 or Deepgram mean confidence < 0.6). Provider error never raises a flag.
- Insert `attempts`, `attempt_step`, `attempt_stt` (raw responses) in one transaction; update KV session.

**Use cases:** UC-1 steps 5-6.

**Acceptance criteria:** Pass/fail and flags match the rules on a fixture table; all rows written or none.

**Tests:**

- [Unit] Table-driven tests for the pass rule at, above and below each threshold for all 4 tests.
- [Unit] Each flag fires at its limit and not just below it; provider error produces no flags.
- [Int] Forced D1 failure mid-write leaves no partial rows.

### T3.7 Idempotent finalize and final mismatch check

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 3 | 1.5 d | P0 | T3.6 |

**Product requirements:** BR-09, BR-10 (final score), BR-RULE-07.

**Technical requirements:** TR-02, TR-09, TR-16.

- `POST /api/results/:id/finalize`: aggregate `test_step_result` (averages per step), AI best-of scores, `flag_reasons`, `agreement_score` (100 − mean normalised gap across metrics), `review_status` (`auto` or `needs_review`).
- Idempotent: second call returns the stored result unchanged (unique key on participant + test + session).

**Use cases:** UC-1 step 8; feeds UC-2.

**Acceptance criteria:** Repeated finalize never duplicates or errors; flagged tests appear as `needs_review`.

**Tests:**

- [Unit] Aggregation: two attempts with fluency 50 and 100 → 75.
- [Unit] Agreement score: identical scorers → 100.
- [Int] Finalize twice concurrently → one result row.
- [Int] Any step flag → `needs_review` with reasons; none → `auto`.

### T3.8 Audio fixture library (added)

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 3 | 1 d | P1 | T2.2 |

**Product requirements:** Supports testing of BR-01, BR-07, BR-09.

**Technical requirements:** TRD 9.1.

Recorded WAV fixtures (by consenting adults, stored in the repository's test folder) per test:

| Fixture | Purpose |
| ------- | ------- |
| Clean read at pass pace | Happy path, pass |
| Slow read (about 50 WCPM) | Fail on WCPM |
| One skipped sentence | Skipped words, completeness flag |
| Added words | Insertions |
| Mispronounced words | Highlighting |
| Background noise | Unreliable input |
| Silence | Error handling |
| Long full-story read (> 30 s) | Azure chunking |

Saved provider responses for each fixture let integration tests run without live calls.

**Use cases:** n/a

**Acceptance criteria:** At least the 8 fixtures for tests 1 and 4, and clean + slow for tests 2 and 3.

**Tests:**

- [Int] Fixture loader verifies every file is 16 kHz mono WAV.

---

## 8. Epic E4 -- Professor Portal

### T4.1 Portal lists, search and filters

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 4 | 2 d | P0 | T3.7 |

**Product requirements:** BR-08, BR-03. Anyone can see Active, Completed and Needs review lists and find a result by name or code.

**Technical requirements:** TR-08; TRD 7.3 (`/api/portal/sessions`).

- `/portal` with tabs Active, Completed, Needs review (count badge, oldest first).
- Search by display name or code; filters by test and group code; hidden results excluded; 25 per page.
- Status labels with text (Auto, Needs review, Reviewed) and a "Demo" tag for seeded results.
- Loading skeletons, empty states ("No tests need review"), refresh button.

**Use cases:** UC-2 steps 1-2.

**Acceptance criteria:** Lists correct for each status; search by "K7Q2" finds exactly one result; page loads in under 1.5 seconds with 1,000 results.

**Tests:**

- [Int] API returns correct rows per status, ordering and pagination.
- [Int] Hidden results never returned.
- [E2E] Search by name and by code; filter by test.
- [E2E] Empty and loading states render.

### T4.2 Result details view

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 4 | 2.5 d | P0 | T4.1 |

**Product requirements:** BR-08, BR-09, BR-17, BR-18.

**Technical requirements:** TR-08, TR-16, TR-17.

- `/portal/results/{id}`: per-step metrics for Coach DG and Coach AZ side by side (WCPM, accuracy, fluency, completeness); highlighted, skipped and added words; attempt counts.
- Per-paragraph metrics for both full-story reads; top 3 problem words; AI feedback per coach; transcripts aligned to the original text; original text.
- Flag reasons in plain language; provider errors shown separately.
- Review history (from T5.1); tooltips explaining each metric and flag.

**Use cases:** UC-2 step 3.

**Acceptance criteria:** All sections render for flagged, auto and reviewed results; 404 for unknown or hidden ids.

**Tests:**

- [Int] Details API returns step and paragraph metrics matching stored rows.
- [E2E] Flagged result shows its reasons; reviewed result shows history.
- [Manual] Screen-reader pass over tables (headers, captions).

### T4.3 CSV exports

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 4 | 1 d | P1 | T3.7 |

**Product requirements:** BR-13.

**Technical requirements:** TR-12; walkthrough "CSV Export Structure".

- `GET /api/export/attempts.csv` and `/api/export/results.csv` with the columns in the walkthrough; display names only; no IP data; UTF-8 with BOM for Excel.
- Formula injection protection: prefix cells starting with `=`, `+`, `-`, `@` with `'`.

**Use cases:** UC-2.

**Acceptance criteria:** Both files open in Excel and Google Sheets with correct columns.

**Tests:**

- [Unit] CSV escaping: commas, quotes, line breaks, leading `=`.
- [Int] Column headers match the walkthrough exactly; no `ip_hash` column.

### T4.4 Seeded demo results

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 4 | 0.5 d | P2 | T3.7, T3.8 |

**Product requirements:** BR-18.

**Technical requirements:** TR-08, TR-17.

- `npm run db:seed:demo` creates about 8 results from fixture data (`seeded = true`): auto, needs review (each flag type), reviewed, reverted review; exempt from 90-day deletion while `seeded`.

**Use cases:** UC-2 (first-time visitor).

**Acceptance criteria:** Fresh deployment shows demo results in every tab, tagged "Demo".

**Tests:**

- [Int] Seed is idempotent and creates the expected statuses.

---

## 9. Epic E5 -- Review and Moderation

### T5.1 Public review submission

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 4 | 2 d | P0 | T4.2, T1.4 |

**Product requirements:** BR-10, BR-11; BR-RULE-07, BR-RULE-08. Any visitor can set final scores with a signed review; AI scores remain.

**Technical requirements:** TR-10.

- Review form pre-filled with AI scores; reviewer name; note; Turnstile.
- `POST /api/results/:id/reviews`: validate (WCPM 0-300, scores 0-100, note ≤ 500 characters plain text, reviewer name rules); per-IP limit 20/day.
- Optimistic concurrency: request carries the review count it loaded; mismatch → 409 `STALE_REVIEW` with the latest state.
- Insert `review_events` (old and new values, `ip_hash`); set `final_*` to the latest non-reverted review; `review_status = reviewed`.
- Notes rendered escaped; Content-Security-Policy blocks inline scripts.

**Use cases:** UC-2 steps 4-5.

**Acceptance criteria:** Review updates the final score and history; AI scores unchanged; invalid or stale input rejected with clear messages.

**Tests:**

- [Unit] Final-score resolver: no reviews → AI; two reviews → latest; latest reverted → previous.
- [Int] Out-of-range values → 400 with field errors; bad captcha → 403; 21st review → 429.
- [Int] Two concurrent reviews from the same loaded state → one 201, one 409.
- [E2E] Submit a review on a flagged result; it moves from Needs review to Completed with status Reviewed.
- [E2E] Note containing `<img src=x onerror=alert(1)>` renders as text.

### T5.2 Admin authentication

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 4 | 1 d | P0 | T0.3 |

**Product requirements:** BR-12.

**Technical requirements:** TR-03, TRD 8.3.

- `/admin` login (email + password); password hashed with scrypt or bcrypt; HTTP-only, Secure, SameSite=Strict cookie, 12-hour expiry; logout.
- Login rate limit: 5 failures per IP per 15 minutes; generic error message.
- CSRF protection on admin POSTs (SameSite cookie + origin check).

**Use cases:** UC-3 step 1.

**Acceptance criteria:** Admin routes return 401 without a session; brute force is throttled.

**Tests:**

- [Int] Every `/api/admin/*` route → 401 without cookie.
- [Int] 6th failed login → 429.
- [Int] Cross-origin POST rejected.

### T5.3 Admin console

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 4 | 2.5 d | P0 | T5.1, T5.2, T0.4 |

**Product requirements:** BR-11, BR-12; BR-RULE-09.

**Technical requirements:** TR-10, TR-11.

- Recent results and reviews lists; hide/unhide result; delete result (cascade); revert review (sets `reverted_at`, recomputes final score); mark reviewer names trusted (applies to past and future reviews).
- Usage panel: speech minutes and tests today and this month vs cap.
- Kill switch: sets `paused` in `usage_daily` and KV; start page shows "Demo paused".
- Every action written to the admin audit log (T0.4).

**Use cases:** UC-3 steps 2-5.

**Acceptance criteria:** Each action works and is audited; reverting the only review returns the result to Needs review if it was flagged.

**Tests:**

- [Int] Revert recomputes final score and status.
- [Int] Trust a reviewer → their reviews flagged `trusted = true`.
- [Int] Hide → result absent from portal lists and search.
- [E2E] Admin turns on kill switch; `/start` shows "Demo paused"; turning it off restores.
- [Int] Each action creates one audit entry.

---

## 10. Epic E6 -- Quality, Calibration and Launch

### T6.1 Load and approve the final stories

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 5 | 0.5 d | P0 | T0.3 |

**Product requirements:** BR-06; BR-RULE-16. Gabriela approves the 4 stories (target: before Sprint 3).

**Technical requirements:** TR-06 content rules.

**Use cases:** UC-1.

**Acceptance criteria:** Seed matches approved texts; content rules hold.

**Tests:**

- [Unit] Content lint: 5-7 sentences, no digits or number words, full story ≤ 140 words.

### T6.2 Accessibility pass (WCAG 2.1 AA)

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 5 | 1.5 d | P1 | E2, E4, E5 |

**Product requirements:** TRD 7.1 (WCAG 2.1 AA); inspection report accessibility gaps.

**Technical requirements:**

- Visible focus rings; logical tab order; skip link; one H1 per page and correct heading levels.
- ARIA: live region for recording state and results; `aria-pressed` on word buttons; labelled form fields and errors.
- No colour-only meaning (status labels have text); contrast 4.5:1; `prefers-reduced-motion` respected.

**Use cases:** UC-1, UC-2, UC-3.

**Acceptance criteria:** No serious or critical axe violations; full test and review completed with keyboard only.

**Tests:**

- [E2E] axe-core scan on every route in Playwright.
- [Manual] Keyboard-only run of UC-1 and UC-2; screen reader run with NVDA and VoiceOver.

### T6.3 Browser and microphone test matrix

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 5 | 1.5 d | P0 | E2, E3 |

**Product requirements:** BRD success metric "usable on current Chrome, Edge, Firefox and Safari desktops and Chromebooks".

**Technical requirements:** TR-01, TR-02.

| Browser / device | Microphones |
| ---------------- | ----------- |
| Chrome (Windows, macOS), Edge, Firefox, Safari (macOS), Chromebook | Built-in laptop mic, USB headset, Bluetooth headset |

**Use cases:** UC-1.

**Acceptance criteria:** Each combination completes test 1; known issues documented.

**Tests:**

- [Manual] Run UC-1 on each combination; record WAV validity and score sanity.
- [E2E] Playwright projects for Chromium, Firefox and WebKit run the stubbed flow in CI.

### T6.4 Security and abuse testing

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 5 | 1.5 d | P0 | E1, E5 |

**Product requirements:** BR-16; BRD restrictions (abuse, integrity).

**Technical requirements:** TR-15, TRD 8.3.

- OWASP Top 10 review: injection (SQL via Drizzle params, XSS in names and notes), broken access control (admin routes, delete endpoint), security headers.
- Abuse: captcha bypass (replayed tokens), rate-limit bypass (header spoofing), oversized and malformed audio, CSV formula injection, mass review vandalism.

**Use cases:** UC-2, UC-3.

**Acceptance criteria:** No high or critical findings open at launch.

**Tests:**

- [Int] Replayed Turnstile token rejected.
- [Int] Spoofed `X-Forwarded-For` does not change the rate-limit key (use `CF-Connecting-IP`).
- [Manual] OWASP ZAP baseline scan on staging.

### T6.5 Load test

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 5 | 1 d | P2 | E3, E4 |

**Product requirements:** BRD assumption of about 50 users a month; handle bursts after sharing the portfolio link.

**Technical requirements:** TRD 3.1.

- k6 scenario with mocked providers: 20 concurrent participants submitting attempts; 100 concurrent portal viewers.

**Use cases:** UC-1, UC-2.

**Acceptance criteria:** P95 attempt latency (mocked providers) under 2 seconds; portal under 1.5 seconds; no errors.

**Tests:**

- [Manual] k6 run on staging; results saved in the repository.

### T6.6 LGPD compliance review

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 5 | 0.5 d | P0 | T1.2, T1.3, T1.5 |

**Product requirements:** BR-15; BR-RULE-01, 02, 06, 10, 11, 12.

**Technical requirements:** TR-14.

Checklist: consent recorded; only display name stored; no audio anywhere; IP only hashed; 90-day deletion works; erasure works; privacy notice complete; no names in LangSmith or logs; third parties listed.

**Use cases:** UC-1, UC-3.

**Acceptance criteria:** Every checklist item verified with evidence.

**Tests:**

- [Manual] Inspect D1, KV, logs and LangSmith after 5 test runs; no names, audio or raw IPs.

### T6.7 Calibration dry run

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 5 | 2 d | P0 | E3, E4, T6.1 |

**Product requirements:** BRD risk R6; TR-06 and TR-09 note thresholds are starting values.

**Technical requirements:** TR-06, TR-09, TR-13.

- At least 10 internal tests per level from several speakers and accents.
- Tune pass thresholds, retry limits and mismatch limits so that roughly 10-25% of tests are flagged; iterate the prompt in LangSmith.
- Record the final values in the seed and the TRD.

**Use cases:** UC-1, UC-2.

**Acceptance criteria:** Final thresholds and limits documented with the data behind them.

**Tests:**

- [Manual] Before/after comparison of flag rate and pass rate per level.

### T6.8 Production launch

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 6 | 1 d | P0 | Gate B, T6.2-T6.7 |

**Product requirements:** BRD success metric "public site live".

**Technical requirements:** TRD 10.1.

- Domain and DNS; production secrets; Turnstile production keys; demo seed; alerts live; budget cap 80 minutes.
- Smoke test on production; rollback rehearsed.

**Use cases:** UC-1, UC-2, UC-3.

**Acceptance criteria:** All smoke tests pass on production; owner receives a test alert.

**Tests:**

- [E2E] Production smoke suite: start, one step with real scorers, portal search, review, admin login.

### T6.9 AI vs trusted-review accuracy report

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 6 | 1.5 d | P1 | T5.3, launch data |

**Product requirements:** BR-11, BRD objective 4; success metric "AI and human final scores captured".

**Technical requirements:** TR-10, TR-12.

- Script or notebook reading the results CSV: per metric, mean absolute difference between AI and trusted review, per scorer and per level; flag precision (share of flagged tests where the reviewer changed the score).

**Use cases:** UC-3.

**Acceptance criteria:** Report generated from at least 25 completed tests, with a recommendation on thresholds and scorers.

**Tests:**

- [Unit] Report script on a fixture CSV produces known values.

### T6.10 Bug-fix and polish buffer

| Sprint | Estimate | Priority | Depends on |
| ------ | -------- | -------- | ---------- |
| 6 | 3 d | P1 | -- |

Reserved for defects from Sprints 5-6 and overflow from Sprints 3-4.

---

## 11. Traceability Matrix

| BR | Requirement | Tasks |
| -- | ----------- | ----- |
| BR-01 | AI listening and evaluation | T0.5, T2.2, T3.1, T3.2, T3.3 |
| BR-02 | Progressive reading and feedback loop | T2.3, T3.6, T3.7 |
| BR-03 | Public access without login | T1.1, T2.6, T4.1 |
| BR-04 | Name-based tracking | T1.3, T2.5 |
| BR-05 | Consent gate | T1.3 |
| BR-06 | Four graded tests | T0.3, T2.1, T6.1 |
| BR-07 | Word-level feedback | T2.4, T3.4 |
| BR-08 | Professor portal | T4.1, T4.2 |
| BR-09 | Mismatch detection | T3.6, T3.7, T4.2 |
| BR-10 | Public manual review | T5.1 |
| BR-11 | Review audit and revert | T5.1, T5.3, T6.9 |
| BR-12 | Admin moderation | T5.2, T5.3, T0.4 |
| BR-13 | CSV export | T4.3 |
| BR-14 | AI feedback and prompts | T0.6, T3.5 |
| BR-15 | Privacy (LGPD) | T1.2, T1.5, T6.6 |
| BR-16 | Abuse and cost controls | T1.4, T2.6, T6.4 |
| BR-17 | Step metrics | T3.2, T3.3, T3.6, T4.2 |
| BR-18 | Guided demo experience | T1.1, T4.2, T4.4 |

| Use case | Tasks |
| -------- | ----- |
| UC-1 Participant takes a test | T1.1, T1.2, T1.3, T2.1-T2.6, T3.1-T3.7 |
| UC-2 Visitor reviews a result | T4.1-T4.4, T5.1 |
| UC-3 Admin moderates | T0.4, T1.5, T5.2, T5.3 |

---

## 12. Test Plan Summary

| Level | Tool | Runs | Coverage target |
| ----- | ---- | ---- | --------------- |
| Unit | Vitest | Every commit | 80% lines on `app/lib` (metrics, rules, validation) |
| Integration | Vitest + Miniflare (D1, KV) + mocked providers | Every commit | Every API endpoint, every error code in S-1 |
| Live provider | Vitest against staging keys | Nightly | Deepgram and Azure with fixtures |
| End-to-end | Playwright (Chromium, Firefox, WebKit) | Every merge to `main` | UC-1, UC-2, UC-3 happy paths + error states |
| Accessibility | axe-core in Playwright + manual | Every merge; manual in Sprint 5 | No serious violations |
| Security | OWASP ZAP, manual checks | Sprint 5, before launch | No open high findings |
| Load | k6 | Sprint 5 | P95 targets in T6.5 |
| Calibration | Manual dry run | Sprint 5 | 10+ tests per level |

---

## 13. Documentation Note

`PRD.md`, `TRD.md`, `LoFi-Wireframes.md` and `HiFi-Design.md` in this folder still describe ReadAssist (K-12, Basic Auth, SpeechAce, teacher dashboard). Where they conflict with this breakdown, the Read AI BRD and TRD win. The design tokens and component specs in `HiFi-Design.md` remain usable for T1.1 once colours are rechecked for contrast.

---

## 14. Revision History

| Version | Date | Author | Changes |
| ------- | ---- | ------ | ------- |
| 1.0 | October 20, 2026 | Gabriela | Initial task breakdown from Read AI BRD v1.0 and TRD v1.0, including gaps from the documentation inspection report. |
