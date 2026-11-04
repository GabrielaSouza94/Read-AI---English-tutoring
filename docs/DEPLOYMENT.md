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
