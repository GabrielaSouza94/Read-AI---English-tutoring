import { env } from "cloudflare:workers";

import { findConfigProblems } from "~/lib/config";
import { checkHealth } from "~/lib/health";
import { log } from "~/lib/log";

export async function loader() {
  const configProblems = findConfigProblems(env as unknown as Record<string, unknown>);
  if (configProblems.length > 0) {
    // Names only, never values. Visible in Workers Logs, not in the public response.
    log.warn("config_incomplete", { problems: configProblems });
  }

  const report = await checkHealth({ appEnv: env.APP_ENV, db: env.DB, kv: env.KV, configProblems });
  return Response.json(report, {
    status: report.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
