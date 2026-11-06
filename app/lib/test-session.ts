/**
 * Where a participant is in a test (T2.3): `session:{participantId}:{testId}` in KV, 1-hour TTL,
 * refreshed on every change. A reload resumes from it; an hour without activity starts over.
 */
import type { KVLike } from "./alerts";
import type { TestSession } from "./steps";

export const TEST_SESSION_TTL_SECONDS = 3600;

export function testSessionKey(participantId: string, testId: number): string {
  return `session:${participantId}:${testId}`;
}

function isTestSession(value: unknown): value is TestSession {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.participantId === "string" &&
    typeof v.testId === "number" &&
    typeof v.stepNumber === "number" &&
    typeof v.attempt === "number" &&
    Array.isArray(v.history) &&
    typeof v.done === "boolean"
  );
}

/** The stored session, or null when there is none, it expired, or it cannot be read. */
export async function loadTestSession(
  kv: KVLike,
  participantId: string,
  testId: number,
): Promise<TestSession | null> {
  const raw = await kv.get(testSessionKey(participantId, testId));
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isTestSession(value) && value.participantId === participantId && value.testId === testId
      ? value
      : null;
  } catch {
    return null;
  }
}

export async function saveTestSession(kv: KVLike, session: TestSession): Promise<void> {
  await kv.put(testSessionKey(session.participantId, session.testId), JSON.stringify(session), {
    expirationTtl: TEST_SESSION_TTL_SECONDS,
  });
}
