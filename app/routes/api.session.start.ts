/**
 * POST /api/session/start: creates or resumes the participant (T1.3). The logic is in
 * `~/lib/session-start`; this route passes the bindings and records the Turnstile call.
 */
import { env } from "cloudflare:workers";

import { loadStartConfig } from "~/lib/config";
import { log } from "~/lib/log";
import { recordProviderCall } from "~/lib/metrics";
import { startSession } from "~/lib/session-start";
import { verifyTurnstile } from "~/lib/turnstile";

import type { Route } from "./+types/api.session.start";

export async function action({ request }: Route.ActionArgs) {
  const config = loadStartConfig(env as unknown as Record<string, unknown>);
  const body: unknown = await request.json().catch(() => null);
  const now = new Date();

  const response = await startSession(body, {
    db: env.DB,
    kv: env.KV,
    request,
    config,
    now,
    verifyCaptcha: async (token, ip) => {
      const result = await verifyTurnstile(config.turnstileSecretKey, token, ip);
      await recordProviderCall(env.DB, now, result.ok || result.reason === "invalid");
      if (!result.ok && result.reason === "unavailable") log.warn("turnstile_unavailable");
      return result;
    },
  });

  if (response.ok) {
    const { participant, resumed } = (await response.clone().json()) as {
      participant: { id: string };
      resumed: boolean;
    };
    log.info("session_started", { participantId: participant.id, resumed });
  }
  return response;
}
