# Deployment, rollback and migrations

## Environments

| Environment | How it runs                                        | Worker name          |
| ----------- | -------------------------------------------------- | -------------------- |
| Local       | `npm run dev` (Vite + workerd)                     | `read-ai`            |
| Staging     | CI on every push to `main`                         | `read-ai-staging`    |
| Production  | CI after staging, once a reviewer approves the job | `read-ai-production` |

`wrangler.jsonc` defines all three. The Cloudflare Vite plugin picks the environment at **build** time from
`CLOUDFLARE_ENV`, and writes the resolved config to `build/server/wrangler.json`. `wrangler deploy` then
deploys that file. This is why the deploy scripts build and deploy in one step:

```bash
npm run deploy:staging      # CLOUDFLARE_ENV=staging react-router build && wrangler deploy
npm run deploy:production
```

## Bindings

| Binding | Local                   | Staging                 | Production                 |
| ------- | ----------------------- | ----------------------- | -------------------------- |
| `DB`    | `local-dev` (Miniflare) | D1 `read-ai-staging-db` | D1 `read-ai-production-db` |
| `KV`    | `local-dev` (Miniflare) | KV `read-ai-staging-kv` | KV `read-ai-production-kv` |

Local data lives in `.wrangler/state` and is safe to delete. Secrets and vars are listed in `docs/SECRETS.md`.

`GET /api/health` checks that the environment can query its database, read its storage and has a complete
configuration. It returns 200 when everything works and 503 otherwise. Open it after every deploy.

## Logs, monitoring and alerts

**Logs.** Every request writes one JSON line to Workers Logs (`observability` in `wrangler.jsonc`) with
`requestId`, `route` (path only, never the query string), `method`, `status` and `latencyMs`. Unhandled
errors write an `unhandled_exception` line with the same `requestId` and the stack. Every response carries the
id in an `x-request-id` header, and API 500s return it in the S-1 body, so a user can quote it.
All log fields pass through `redact()` in `app/lib/log.ts`: names, reviewer names, IP addresses, passwords,
tokens and audio never reach the logs. Use `log` from `~/lib/log`, never bare `console.log`.

To read them: Cloudflare dashboard → Workers → `read-ai-staging` → Observability, or live with
`npx wrangler tail read-ai-staging`. Filter on `requestId` to follow one request.

**Counters.** Each request adds to `metrics_hourly` (one D1 upsert, after the response is sent). Scorer and
Gemini calls call `recordProviderCall` (from T3.x).

**Alerts.** A Cron Trigger runs at minute 5 of every hour (UTC) and emails `ALERT_EMAIL` through Resend when:

| Alert           | Rule                                                                      | Sent at most |
| --------------- | ------------------------------------------------------------------------- | ------------ |
| Speech budget   | Today's speech minutes are at least 80% of `DAILY_STT_MINUTES_CAP`        | Once a day   |
| Provider errors | Over 10% of provider calls failed in the previous hour (at least 3 calls) | Once an hour |
| Server errors   | Over 5% of responses were 5xx in the previous hour (at least 10 requests) | Once an hour |

Each alert is also logged as an `alert` event, so it is visible even when email fails
(`alert_delivery_failed`, retried at the next run). Dedupe keys live in KV (`alert:*`) with a TTL.

**Checking it on staging** (production returns 404 for both):

- `GET /api/debug/error` throws on purpose. Look up the `requestId` from the response in the logs.
- `GET /api/debug/alert` emails a test alert, at most once every 10 minutes.
- Locally, `npx wrangler dev --test-scheduled`, then open `http://localhost:8787/__scheduled?cron=5+*+*+*+*` to run the hourly check.

**Admin audit.** Every admin action calls `recordAdminAction()` (`app/lib/audit.ts`), which writes one
`admin_audit` row: action, admin id, target, redacted details and request id. Rows have no foreign keys, so the
trail survives deletions.

## Abuse and cost limits

`app/lib/limits.ts` holds the guards. Routes call them after their own validation, so a rejected form does
not use up a test:

| Limit          | Where                                                 | Value                        | Refusal                                |
| -------------- | ----------------------------------------------------- | ---------------------------- | -------------------------------------- |
| Tests per IP   | KV `tests:{ipHash}:{date}` (UTC, 24-hour TTL)         | 3 a day                      | 429 `RATE_LIMITED`                     |
| Reviews per IP | KV `reviews:{ipHash}:{date}`                          | 20 a day                     | 429 `RATE_LIMITED`                     |
| Speech budget  | D1 `usage_daily.stt_minutes`                          | `DAILY_STT_MINUTES_CAP` (80) | 503 `DEMO_PAUSED` on new sessions only |
| Kill switch    | D1 `usage_daily.paused` (latest row)                  | on / off                     | 503 `DEMO_PAUSED` on new sessions only |
| API requests   | Workers binding `API_RATE_LIMITER` (`wrangler.jsonc`) | 60 a minute per IP           | 429 `RATE_LIMITED`, retryable          |

- Running tests always finish: attempts are never refused by the budget or the switch.
- The kill switch stays on across midnight: a new day's row copies `paused` from the latest one.
- KV counters are not atomic, so two requests at the same instant can both pass. The API limit and the
  budget bound the cost.
- To pause by hand before the admin page exists (T5.x):
  `npx wrangler d1 execute DB --remote --env staging --command "INSERT INTO usage_daily (date, paused) VALUES (date('now'), 1) ON CONFLICT(date) DO UPDATE SET paused = 1"`
  (`paused = 0` to resume).

## Prompts (LangSmith)

The feedback prompt lives in LangSmith Prompt Hub as `read-ai-feedback` (private). Its first version is
`FEEDBACK_PROMPT` in `app/lib/prompts.ts`. Each environment pulls the commit named by
`LANGSMITH_FEEDBACK_PROMPT_ID` in `wrangler.jsonc`:

| Environment | Pulls                         | Tracing project      |
| ----------- | ----------------------------- | -------------------- |
| Local       | `read-ai-feedback` (latest)   | `read-ai-local`      |
| Staging     | `read-ai-feedback:staging`    | `read-ai-staging`    |
| Production  | `read-ai-feedback:production` | `read-ai-production` |

**Changing the prompt without a deploy** (BR-RULE-14): edit it in the Hub or Playground and commit. Local
sees it at once. Move the `staging` tag to the new commit and check it on staging, then move `production`.
The prompt must keep mustache templates and the variables from `feedbackVariables()`; a pull that finds
anything else fails, and T3.5 falls back to its cached copy.

**Pushing the repo version:** `npm run prompt:push` creates the three tracing projects and the prompt if
needed, commits `app/lib/prompts.ts` when it differs from the latest Hub commit, and tags it `staging`. Add
`-- --tag production` to move `production` too. It reads `LANGSMITH_API_KEY` from the environment or
`.dev.vars`. A push overwrites Hub edits only when the file itself has changed.

**Checking it:** `GET /api/debug/prompt` (local and staging; 404 in production) pulls the prompt from the
Worker and returns it rendered with a fixture attempt, its commit hash and the pull time. It calls no model.

## CI pipeline (`.github/workflows/ci.yml`)

1. **check**: typecheck, ESLint, Prettier check and Vitest. Runs on every pull request and push.
2. **e2e**: Playwright against `vite preview` in Chromium, Firefox and WebKit. Runs after `check`.
3. **secret-scan**: Gitleaks over the full git history.
4. **deploy-staging**: only on `main`, and only if the three jobs above passed. A failing test or a leaked secret therefore blocks deployment.
5. **deploy-production**: runs after staging and waits for manual approval.

One-time GitHub setup:

- Repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The token is an account API token
  with **Workers Scripts: Edit**, **Workers KV Storage: Edit** and **D1: Edit**.
- Environments `staging` and `production` under Settings → Environments. Give `production` at least one
  required reviewer; that is the manual approval gate.

## Rollback

Workers keep previous versions, so a rollback redeploys the previous version without rebuilding:

```bash
npx wrangler deployments list --env staging   # find the version to return to
npx wrangler rollback --env staging           # previous version (or pass a version id)
npx wrangler rollback --env production
```

A rollback only restores Worker code. It does not undo database migrations (see below). Bindings and
secrets keep their current values.

While an older version is live, `wrangler secret put` fails ("the latest version of your Worker isn't
currently deployed"). To undo the rollback, redeploy the latest version, then change secrets:

```bash
npx wrangler versions list --env staging                 # the latest version is last
npx wrangler versions deploy <latest-version-id> --env staging
```

## Running Wrangler by hand after a local build

A local build writes `.wrangler/deploy/config.json`, which points every later Wrangler command at
`build/server/wrangler.json` for the environment that was built. A command for a different environment then
fails with "This does not match the target environment … used when building". Delete the build output
before running Wrangler by hand: `Remove-Item -Recurse build, .wrangler/deploy` (PowerShell).
The `deploy:*` scripts are not affected, because they always build first.

## Database migrations and seed

Changing the schema:

1. Edit `app/db/schema.ts`, then run `npm run db:generate -- --name <short_name>`. Drizzle Kit writes
   `drizzle/migrations/NNNN_<short_name>.sql`. Read the SQL before committing it.
2. Write `drizzle/down/NNNN_<short_name>.down.sql` by hand.
3. `npm run db:migrate:local`, then `npm test`. The integration tests in `test/` apply every migration to a
   fresh database.
4. Push. CI runs `db:migrate:<env>`, then `db:seed:<env>`, then the deploy, in that order. Wrangler records
   applied migrations in each database's `d1_migrations` table and skips them next time.

The seed (`app/db/seed-data.ts`) holds the 4 tests and 24 sentences. Every statement is an upsert keyed on a
stable id, so it runs on every deploy, and edited thresholds overwrite the old ones. Sentence ids are
`test × 100 + position` (203 = test 2, sentence 3). Attempts point at them, so never renumber a sentence.

The admin account is seeded by hand, once per environment. CI never does it:

```powershell
npm run db:seed:staging -- --admin      # asks for email and password; stores only a PBKDF2 hash
npm run db:seed:production -- --admin   # use a different password from staging
```

Running it again with the same email replaces the password.

Rules:

- **Forward-only.** Never edit a migration that has been applied anywhere. Fix mistakes with a new migration.
- Every migration `NNNN_name.sql` has a hand-written `drizzle/down/NNNN_name.down.sql`. That file reverses it, for emergencies only.
- A migration must stay compatible with the previous Worker version, so that a code rollback still works.
  For example, add a column in one release and drop the old one in a later release.

## Own domain (MVP2)

Staging and production run on `workers.dev` addresses until MVP2. The move is planned in
`Product materials/task-breakdown.md` §14 (tasks T7.1-T7.5) and specified in TRD §4.18 (TR-18).
Until then, follow §14.1 there: no host names in code, tests or emails; one `APP_ORIGIN` setting for absolute
URLs; host-only cookies.
