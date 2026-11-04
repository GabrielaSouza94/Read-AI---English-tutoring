/**
 * GET /api/debug/alert sends a test alert email to the owner (T0.4 acceptance). At most one every
 * 10 minutes, through the same dedupe as real alerts. Not available in production.
 */
import { env } from "cloudflare:workers";

import { sendAlerts, testAlert } from "~/lib/alerts";
import { alertNotifier } from "~/lib/email";
import { apiError } from "~/lib/errors";

export async function loader() {
  if (env.APP_ENV === "production") return apiError("NOT_FOUND", "Not found");
  const sent = await sendAlerts([testAlert(new Date())], {
    kv: env.KV,
    notify: alertNotifier(env as unknown as Record<string, unknown>, env.APP_ENV),
  });
  return Response.json(
    {
      sent: sent.length > 0,
      note:
        sent.length > 0
          ? "Check the inbox."
          : "Already sent in the last 10 minutes, or delivery failed (see logs).",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
