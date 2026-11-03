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

## Database migrations (from T0.3)

- Drizzle Kit generates SQL from `app/db/schema.ts` into `drizzle/migrations/` (`npm run db:generate`).
  Wrangler applies it to D1.
- **Forward-only.** Never edit a migration that has been applied anywhere. Fix mistakes with a new migration.
- Every migration `NNNN_name.sql` has a hand-written `drizzle/down/NNNN_name.down.sql`. That file reverses it, for emergencies only.
- A migration must stay compatible with the previous Worker version, so that a code rollback still works.
  For example, add a column in one release and drop the old one in a later release.
