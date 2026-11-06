/**
 * POST /api/attempts (multipart: testId, stepNumber, audio): scores one recording of the current
 * step and moves the test on (T2.3). Until Epic E3 the scorer is the Gate A stub, where
 * `STUB_SCORER` allows it. The audio is read into memory for this request only.
 */
import { env } from "cloudflare:workers";

import { stubScorer, submitAttempt, type AttemptResponse } from "~/lib/assessment";
import { readBrowserIdCookie } from "~/lib/browser-id";
import { getTest, parseTestId } from "~/lib/catalog";
import { loadScoringConfig } from "~/lib/config";
import { apiError } from "~/lib/errors";
import { log } from "~/lib/log";
import { MAX_RECORDING_BYTES } from "~/lib/recorder-machine";
import { findParticipant } from "~/lib/session-start";

import type { Route } from "./+types/api.attempts";

// Room for the multipart boundaries and the two small fields around the audio.
const MAX_BODY_BYTES = MAX_RECORDING_BYTES + 64 * 1024;

export async function action({ request }: Route.ActionArgs) {
  const now = new Date();
  const browserId = readBrowserIdCookie(request);
  const participant = browserId ? await findParticipant(env.DB, browserId, now) : null;
  if (!participant) return apiError("NOT_FOUND", "Please start at the start page first.");

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return apiError("AUDIO_TOO_LARGE", "The recording is larger than 10 MB. Please record again.");
  }
  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  const stepNumber = Number(form?.get("stepNumber"));
  if (!form || !(audio instanceof File) || !Number.isInteger(stepNumber)) {
    return apiError("VALIDATION_FAILED", "The recording did not arrive. Please try again.");
  }
  const rawTestId = form.get("testId");
  const testId = parseTestId(typeof rawTestId === "string" ? rawTestId : null);
  const test = testId === null ? null : await getTest(env.DB, testId);
  if (!test) return apiError("NOT_FOUND", "This test does not exist.");

  const { stubScorer: useStub } = loadScoringConfig(env as unknown as Record<string, unknown>);
  const response = await submitAttempt({
    kv: env.KV,
    participantId: participant.id,
    test,
    stepNumber,
    audio: new Uint8Array(await audio.arrayBuffer()),
    scorer: useStub ? stubScorer : null,
    now,
  });

  if (response.ok) {
    const { outcome, done } = (await response.clone().json()) as AttemptResponse;
    log.info("attempt_scored", {
      participantId: participant.id,
      testId,
      stepNumber,
      outcome,
      done,
      scorer: "stub",
    });
  }
  return response;
}
