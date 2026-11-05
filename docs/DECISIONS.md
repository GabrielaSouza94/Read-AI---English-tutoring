# Decision log

> One entry per significant technical choice. Helps Claude (and teammates) understand _why_.
> Product and scope decisions are logged in the BRD (`Product materials/business-requirements.md` §12).

## 2026-10-21: React Router 8 instead of 7

- **Context:** The TRD names React Router 7. By October 2026, React Router 8.4 is the current major, and it is what Cloudflare's scaffolder generates.
- **Decision:** Build on React Router 8 in framework mode with server-side rendering.
- **Alternatives:** Pinning React Router 7 would start a new project one major version behind.
- **Consequences:** The architecture in the TRD is unchanged. When the TRD's stack table is next revised, update it to version 8.

## 2026-10-21: Standalone repository

- **Context:** The product documents live in the `past-products` portfolio repo. GitHub Actions only runs workflows from a repo's root.
- **Decision:** This folder is its own git repository, with CI in its own `.github/workflows`.
- **Alternatives:** A subfolder of `past-products`, with a path-filtered workflow at its root.
- **Consequences:** `past-products` must ignore this folder, or reference it as a submodule, so that it does not commit the nested repo by accident.

## 2026-10-21: Python starter template replaced

- **Context:** A generic Python/FastAPI starter template (Ollama, Chroma) had been copied into the folder.
- **Decision:** Remove the Python code and keep the workflow parts: the `/plan`, `/next`, `/review` and `/fix-tests` commands, the subagents, `docs/` and the format hook. Adapt them to npm, Vitest, ESLint and Prettier.
- **Consequences:** `global/CLAUDE.md` holds personal preferences from the template and is left as is.

## 2026-11-05: Session start: resume by browser, group code cookie (T1.3)

- **Context:** TR-04 says a returning browser is the same participant, and the group code is stored on each result (`test_results.group_code`), which T2.3 creates later.
- **Decision:** `POST /api/session/start` looks up the browser id (cookie first, then the localStorage copy sent in the body). A live participant is resumed: no name needed, but consent and the captcha are still checked, and the start still counts towards the IP's 3 daily tests. The group code goes into a host-only session cookie, `group_code`, for T2.3 to copy onto the result. Order of checks: consent, fields, captcha, then limits, so a rejected form never uses up a test.
- **Alternatives:** Keep the group code in KV per participant. Rejected: it belongs to the visit, not to the person, and a cookie needs no cleanup.
- **Consequences:** The daily test limit counts session starts. T2.3 must decide whether starting a second test from `/tests` counts too (TR-15 says 3 tests per IP per day). E2E sends its own `cf-connecting-ip` per test so local KV counters never block a rerun; Cloudflare overwrites the header in staging and production.

## 2026-11-05: Design tokens rechecked for contrast (T1.1)

- **Context:** `HiFi-Design.md` (ReadAssist) is reused for Read AI once its colours pass WCAG 2.1 AA. Several do not: success `#059669` (3.8:1) and warning `#D97706` (3.2:1) as text on white, danger `#DC2626` on its light background (4.0:1), the focus ring `#93C5FD` (1.8:1) and input borders `#E5E7EB` (1.2:1, below the 3:1 for UI parts).
- **Decision:** Use the spec's darker shades for success, warning and danger text, primary blue for the focus ring and gray-500 for input borders. The tokens live in the `@theme` block of `app/app.css`, and `test/theme.test.ts` checks every text and UI pair the app uses, so the manual contrast check is now automated. Light theme only.
- **Alternatives:** Keep the spec colours for large text only. Rejected: the same tokens are used for body text and badges.
- **Consequences:** New colour pairs must be added to `test/theme.test.ts`. The E2E keyboard tests skip WebKit, which (like Safari) does not tab to links by default; Chromium and Firefox cover keyboard access.

## 2026-11-05: MVP on workers.dev, own domain in MVP2 (BR-19)

- **Context:** The owner plans to move Read AI to its own domain, but not as part of the MVP. T6.8 had listed "Domain and DNS" as a launch step.
- **Decision:** The MVP launches on `workers.dev`. The move is BR-19 / TR-18, Epic E7 (T7.1-T7.5, about 4 days) in `task-breakdown.md` §14. MVP tasks stay domain-ready (§14.1).
- **Alternatives:** Buy the domain now and launch on it. This avoids the browser-id hand-over in T7.2, and is still possible: E7 only depends on T0.2.
- **Consequences:** Until the move, the Workers rate limiter is the only per-minute limit (no WAF), staging is public, and alerts come from `onboarding@resend.dev`. Moving after launch needs redirects for at least 90 days, plus the browser-id hand-over.

## 2026-11-04: Limits: kill switch in D1, Workers rate limiter (T1.4)

- **Context:** The TRD mirrors the kill switch in KV and asks for a WAF rule on `/api/*`. KV reads can be up to 60 seconds stale in other locations, so a KV switch would not refuse "within one request". WAF rules need a zone (custom domain), and the app runs on `workers.dev`.
- **Decision:** The kill switch and the speech budget are read from D1 `usage_daily` on every session start; the switch is the `paused` flag of the latest row, copied into each new day's row, so it stays on until turned off. The `/api/*` limit uses the Workers rate-limiting binding (60 a minute per IP). Per-IP daily counters stay in KV, as in the TRD; an unreadable counter counts as used up.
- **Alternatives:** A KV mirror for faster reads (stale); a WAF rule once a custom domain exists (can be added on top later).
- **Consequences:** One extra D1 read per session start. The Workers limiter counts per Cloudflare location and syncs its counts with a delay, so the limit is loose: on staging, about 275 requests passed within a minute before the first 429 (2026-11-04). It stops floods, not a careful script; the per-IP daily counters and the speech budget are what cap spend.

## 2026-11-03: Feedback prompt versioned by Prompt Hub tags (T0.6)

- **Context:** BR-RULE-14 says prompts change without a deploy, but a bad edit must not reach production at once.
- **Decision:** One private prompt, `read-ai-feedback`, as a LangChain `StructuredPrompt` with mustache templates and the output JSON schema, so the Playground returns schema-shaped JSON. Local pulls the latest commit, staging and production pull the `staging` and `production` tags. The first version lives in `app/lib/prompts.ts` and is pushed with `npm run prompt:push`. The Worker calls the REST API directly with a small mustache renderer, not the LangChain SDK, to keep the bundle small.
- **Alternatives:** One prompt per environment (edits copied by hand); pulling `latest` everywhere (no review step before production).
- **Consequences:** Promoting a prompt means moving a tag. The renderer supports variables only, so a Hub edit that adds a mustache section fails the pull instead of rendering wrongly. The open-model bake-off below moves to T3.5, where the Gemini client and output validator exist to compare against.

## 2026-11-02: Open model instead of Gemini (to revisit in T3.5)

- **Status:** Bookmarked, not decided. The project stays on Gemini 2.5 Flash Lite for now.
- **Context:** Gemini writes the feedback and picks the words to highlight (BR-14; two calls per attempt). It does not decide pass or fail, and a fallback covers outages. The question was whether an open model, such as Nous Research's Hermes, could replace it.
- **Options:**
  - **A. Open model on Cloudflare Workers AI.** An `AI` binding instead of an API key, with no extra vendor. The catalog has about 40 open models (Llama 3.3 70B, Gemma 4 26B, Qwen3 30B, gpt-oss and more) but **no Hermes** (checked 2026-11-02). This is the best fit.
  - **B. Hermes through a hosted provider** (OpenRouter, Nous API). Still an outside vendor with a key; little gain over Gemini.
  - **C. Hermes on a personal computer** behind a Cloudflare Tunnel. Not viable for a public site: it needs the machine online 24/7, and it adds latency and security risk.
- **Trade-offs:** Cost barely changes (Gemini is under $1 a month in the TRD). Privacy improves slightly with option A, since Google is no longer a third party. The risk is quality: the model must return valid JSON (feedback, plus highlighted words in text order) within the 15-second timeout.
- **To verify:** In T3.5 (moved from T0.6), run the same fixture attempts through two or three Workers AI models, with Gemini as the baseline, and compare JSON validity, feedback quality and latency. If an open model wins, update BR-14, the BRD restrictions and decisions log, TRD §3.2, §6.3, costs and third parties, `product-documentation.md`, `task-breakdown.md` (T3.5, S-2, T0.2), the privacy notice and `app/lib/config.ts`.

## 2026-11-03: Long reads scored in sentence-boundary chunks (T0.5)

- **Context:** Azure REST pronunciation assessment takes at most 30 seconds; reads reach 100 seconds or more.
- **Decision:** Chunked REST, with chunks of at most 25 seconds split in the pauses between sentences (from Deepgram timings), scored in parallel and averaged by word count. About 7 seconds for a 100-second read on staging.
- **Alternatives:** Azure continuous mode over WebSocket works from a Worker, but takes about 20 seconds for 100 seconds of audio, lacks miscue support and uses an undocumented protocol.
- **Consequences:** Azure waits for Deepgram on reads over 25 seconds (under 1 second). Chunked fluency is slightly higher than a single call, so thresholds are calibrated on this pipeline (T6.7). The Azure client refuses audio over 30 seconds, because Azure would score it only in part without an error. Full note: `docs/spikes/T0.5-azure-long-audio.md`.

## 2026-11-03: Monitoring and alerts (T0.4)

- **Context:** T0.4 asks for structured logs, three email alerts and an admin audit log, on the free Cloudflare plan.
- **Decisions:**
  - **Logs:** Workers Logs, one JSON line per event, through one logger that redacts names, IPs and secrets by key. No Logpush (paid plan) and no separate error tracker: unhandled errors are logged with the stack and request id, and the 5xx alert covers them.
  - **Counters in D1** (`metrics_hourly`), not KV. An atomic upsert per request never loses a count, and the KV free tier allows only 1,000 writes a day. Analytics Engine would need an API token to query.
  - **An hourly Cron Trigger** checks the previous full hour. Rate alerts need a minimum volume (3 provider calls, 10 requests), so one failure at night does not wake the owner.
  - **Email through Resend** (owner's choice, 2026-11-03). A Worker cannot send email itself, and Cloudflare Email Routing needs an owned domain. Without a domain, Resend sends only to the account owner's address, which is the alert recipient. Resend receives no participant data.
  - **Audit log** in a D1 table `admin_audit`, without foreign keys, so it survives deletions.
  - **Debug routes** `/api/debug/error` and `/api/debug/alert` prove the acceptance criteria on staging. Production returns 404.
- **Consequences:** The Resend free tier (100 emails a day) is far above the alert volume. If a domain is added later, Email Routing can replace Resend by changing `alertNotifier` only.

## 2026-11-03: Schema details not fixed by the TRD (T0.3)

- **Context:** TRD §5.1 lists tables and columns, but leaves some details open.
- **Decisions:**
  - `participants.created_at` added, because `delete_after` is "created + 90 days". An index on `browser_id` speeds up the returning-browser lookup on session start. The TRD ERD now shows `created_at`.
  - `review_status` is `auto`, `needs_review` or `reviewed` (T3.7, T4.2). It stays null while a test is in progress.
  - `step_type` is `progressive` or `full_story`.
  - Timestamps are Unix milliseconds. JSON columns are text.
  - Test and sentence ids are fixed (sentence = test × 100 + position), so the seed can upsert, and attempts keep pointing at the right sentence.
  - The admin password is hashed with PBKDF2-SHA256, 100,000 iterations (the Workers limit), through Web Crypto, so the seed script and the Worker share one implementation.
  - Integration tests use Wrangler's `getPlatformProxy` (in-memory D1), not Miniflare's API, which changed shape in Miniflare 5.
- **Consequences:** Removing a sentence from `seed-data.ts` does not delete it from D1. Write a migration for that.
