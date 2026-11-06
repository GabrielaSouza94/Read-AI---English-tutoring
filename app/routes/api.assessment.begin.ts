/**
 * POST /api/assessment/begin { testId }: starts the test, or resumes the one in progress (T2.3).
 * A new start uses one of the IP's 3 daily tests.
 */
import { env } from "cloudflare:workers";

import { beginTest } from "~/lib/assessment";
import { readBrowserIdCookie } from "~/lib/browser-id";
import { getTest, parseTestId } from "~/lib/catalog";
import { loadStartConfig } from "~/lib/config";
import { apiError } from "~/lib/errors";
import { clientIp, hashIp } from "~/lib/ip";
import { log } from "~/lib/log";
import { findParticipant } from "~/lib/session-start";

import type { Route } from "./+types/api.assessment.begin";

export async function action({ request }: Route.ActionArgs) {
  const config = loadStartConfig(env as unknown as Record<string, unknown>);
  const now = new Date();
  const browserId = readBrowserIdCookie(request);
  const participant = browserId ? await findParticipant(env.DB, browserId, now) : null;
  if (!participant) return apiError("NOT_FOUND", "Please start at the start page first.");

  const body = (await request.json().catch(() => null)) as { testId?: unknown } | null;
  const testId = parseTestId(typeof body?.testId === "number" ? String(body.testId) : null);
  const test = testId === null ? null : await getTest(env.DB, testId);
  if (!test) return apiError("NOT_FOUND", "This test does not exist.");

  const result = await beginTest({
    db: env.DB,
    kv: env.KV,
    participantId: participant.id,
    test,
    ipHash: await hashIp(clientIp(request), config.ipHashSalt),
    dailySttMinutesCap: config.dailySttMinutesCap,
    now,
  });
  if (result instanceof Response) return result;
  log.info("test_begun", { participantId: participant.id, testId, stepNumber: result.stepNumber });
  return Response.json(
    { stepNumber: result.stepNumber, attempt: result.attempt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
