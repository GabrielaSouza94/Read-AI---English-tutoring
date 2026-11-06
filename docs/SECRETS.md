# Secrets and settings

Every setting the Worker needs, where its value comes from, who owns it and when to rotate it.
`app/lib/config.ts` validates them, and `GET /api/health` reports `"config": "incomplete"` until all are set.

## Settings

**Secrets** are set per environment with Wrangler (or in `.dev.vars` locally) and are never committed.
**Vars** are plain values in `wrangler.jsonc`, repeated in each environment.

| Name                           | Kind   | Where the value comes from                                                                         | Needed from |
| ------------------------------ | ------ | -------------------------------------------------------------------------------------------------- | ----------- |
| `DEEPGRAM_API_KEY`             | Secret | Deepgram console → API Keys                                                                        | T3.2        |
| `AZURE_SPEECH_KEY`             | Secret | Azure portal → Speech resource → Keys and Endpoint                                                 | T0.5        |
| `AZURE_SPEECH_REGION`          | Secret | Same page as the key (for example `eastus`)                                                        | T0.5        |
| `GEMINI_API_KEY`               | Secret | Google AI Studio → API keys (paid tier)                                                            | T3.5        |
| `LANGSMITH_API_KEY`            | Secret | LangSmith → Settings → API Keys                                                                    | T0.6        |
| `TURNSTILE_SITE_KEY`           | Secret | Cloudflare dashboard → Turnstile → widget (public, but differs per environment)                    | T1.3        |
| `TURNSTILE_SECRET_KEY`         | Secret | Same Turnstile widget                                                                              | T1.3        |
| `IP_HASH_SALT`                 | Secret | Generate: `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`                          | T1.4        |
| `RESEND_API_KEY`               | Secret | Resend → API Keys → Create, permission **Sending access**                                          | T0.4        |
| `DAILY_STT_MINUTES_CAP`        | Var    | `wrangler.jsonc` (80)                                                                              | T2.6        |
| `RETENTION_DAYS`               | Var    | `wrangler.jsonc` (90)                                                                              | T1.5        |
| `PRIVACY_CONTACT_EMAIL`        | Var    | `wrangler.jsonc`; shown publicly on the privacy notice                                             | T1.2        |
| `ALERT_EMAIL`                  | Var    | `wrangler.jsonc`; must be the address of the Resend account                                        | T0.4        |
| `LANGSMITH_PROJECT`            | Var    | `wrangler.jsonc`; tracing project, one per environment                                             | T0.6        |
| `LANGSMITH_FEEDBACK_PROMPT_ID` | Var    | `wrangler.jsonc`; Prompt Hub id and tag (see `docs/DEPLOYMENT.md`)                                 | T0.6        |
| `STUB_SCORER`                  | Var    | `wrangler.jsonc`; `"true"` turns on the always-pass scorer (local, staging; ignored in production) | T2.3        |

Staging and production must use **separate keys** for every secret, so a leaked staging key never exposes
production. Create a separate Turnstile widget per environment, and generate a different salt for each.

**Turnstile widgets.** Each widget lists the hostnames it accepts (Cloudflare dashboard → Turnstile →
widget → Hostnames): the staging widget the staging `workers.dev` host, the production widget the
production one. A wrong hostname shows Turnstile error 110200 and the start page cannot continue.
Locally and in CI, use Cloudflare's published test keys, which always pass on any host:
`TURNSTILE_SITE_KEY=1x00000000000000000000AA` and `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`
(the CI E2E job writes them into its own `.dev.vars`).

## Setting secrets

**Local:** copy `.dev.vars.example` to `.dev.vars` and fill in the values. Leave unknown ones empty.

**Staging and production:** upload them with Wrangler from the project folder. One at a time (Wrangler
prompts for the value, so it never appears in your shell history):

```powershell
npx wrangler secret put DEEPGRAM_API_KEY --env staging
```

All at once, from a JSON file:

```powershell
# .secrets.staging.json is git-ignored: { "DEEPGRAM_API_KEY": "...", "AZURE_SPEECH_KEY": "...", ... }
npx wrangler secret bulk .secrets.staging.json --env staging
Remove-Item .secrets.staging.json
```

Check what is set (names only): `npx wrangler secret list --env staging`.
Secrets apply right away and are kept across deploys and rollbacks.

## Ownership and rotation

Owner of every key: **Gabriela Souza**. Rotate each key **every 6 months**, and right away if a leak is suspected:
for example, a key pasted into a chat, a commit, a log or a screenshot.

| Secret                              | Rotation steps                                                                                                       | Last rotated |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------ |
| Deepgram, Gemini, LangSmith, Resend | Create a new key, `wrangler secret put` it in each environment, confirm `/api/health` is ok, then revoke the old key | --           |
| Azure Speech                        | Azure has two keys: switch the Worker to the second key, then regenerate the first                                   | --           |
| Turnstile                           | Rotate the secret key in the widget settings, then `wrangler secret put` the new value                               | --           |
| `IP_HASH_SALT`                      | Generate a new salt. Side effect: the day's rate-limit counters reset                                                | --           |
| Cloudflare API token (CI)           | Roll the token in Cloudflare, then update the `CLOUDFLARE_API_TOKEN` repository secret in GitHub                     | --           |

Update the "Last rotated" column (date only) each time.
