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

## CI pipeline (`.github/workflows/ci.yml`)

1. **check**: typecheck, ESLint, Prettier check and Vitest. Runs on every pull request and push.
2. **e2e**: Playwright against `vite preview` in Chromium, Firefox and WebKit. Runs after `check`.
3. **deploy-staging**: only on `main`, and only if `check` and `e2e` passed. A failing test therefore blocks deployment.
4. **deploy-production**: runs after staging and waits for manual approval.

One-time GitHub setup:

- Repository secrets `CLOUDFLARE_API_TOKEN` (template "Edit Cloudflare Workers"; add D1 edit permission when
  T0.3 lands) and `CLOUDFLARE_ACCOUNT_ID`.
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

## Database migrations (from T0.3)

- Drizzle Kit generates SQL from `app/db/schema.ts` into `drizzle/migrations/` (`npm run db:generate`).
  Wrangler applies it to D1.
- **Forward-only.** Never edit a migration that has been applied anywhere. Fix mistakes with a new migration.
- Every migration `NNNN_name.sql` has a hand-written `drizzle/down/NNNN_name.down.sql`. That file reverses it, for emergencies only.
- A migration must stay compatible with the previous Worker version, so that a code rollback still works.
  For example, add a column in one release and drop the old one in a later release.
