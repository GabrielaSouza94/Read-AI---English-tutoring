/**
 * `POST /api/session/start` (T1.3; TR-03, TR-04, TR-05): creates a participant, or resumes the one
 * this browser already has. Order: consent → name and group code → captcha → limits (T1.4), so a
 * rejected form never uses up one of the IP's daily tests. Then the participant is created.
 *
 * Runtime-neutral: the route passes the Worker bindings; integration tests pass Miniflare ones.
 * The name is never logged; only the display name is stored.
 */
import type { KVLike } from "./alerts";
import { browserIdCookie, isBrowserId, newBrowserId, readBrowserIdCookie } from "./browser-id";
import type { StartConfig } from "./config";
import { apiError } from "./errors";
import { clientIp, hashIp } from "./ip";
import { guardSessionStart } from "./limits";
import type { D1Like } from "./metrics";
import { displayName, normaliseGroupCode, pickUniqueCode, validateName } from "./participant";
import type { CaptchaResult } from "./turnstile";

export const GROUP_CODE_COOKIE = "group_code";

export type StartedParticipant = { id: string; displayName: string; code: string };

export type StartResponse = {
  participant: StartedParticipant;
  browserId: string;
  groupCode: string | null;
  resumed: boolean;
};

export type StartDeps = {
  db: D1Like;
  kv: KVLike;
  request: Request;
  config: Omit<StartConfig, "turnstileSiteKey">;
  now: Date;
  verifyCaptcha: (token: string, ip: string) => Promise<CaptchaResult>;
};

export const START_MESSAGES = {
  consent: "Please confirm you are 18 or older and agree that your name and scores are public.",
  form: "Please check the highlighted fields.",
  captcha: "The captcha check failed. Please try it again.",
  captchaUnavailable: "We could not check the captcha just now. Please try again in a minute.",
};

type Body = {
  name?: unknown;
  consent?: unknown;
  groupCode?: unknown;
  turnstileToken?: unknown;
  browserId?: unknown;
};

/** The live participant this browser created, if any (expired ones are ignored). */
export async function findParticipant(
  db: D1Like,
  browserId: string,
  now: Date,
): Promise<StartedParticipant | null> {
  const row = await db
    .prepare(
      `SELECT id, display_name, code FROM participants
       WHERE browser_id = ?1 AND delete_after > ?2 ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(browserId, now.getTime())
    .first<{ id: string; display_name: string; code: string }>();
  return row ? { id: row.id, displayName: row.display_name, code: row.code } : null;
}

const INSERT_ATTEMPTS = 3;

async function createParticipant(
  db: D1Like,
  values: {
    displayName: string;
    browserId: string;
    ipHash: string;
    now: Date;
    retentionDays: number;
  },
): Promise<StartedParticipant> {
  const isTaken = async (code: string) =>
    (await db
      .prepare("SELECT 1 AS taken FROM participants WHERE display_name = ?1 AND code = ?2")
      .bind(values.displayName, code)
      .first()) !== null;
  const deleteAfter = values.now.getTime() + values.retentionDays * 86_400_000;

  // A concurrent start can take the same code between the check and the insert; the unique
  // index refuses it, and we pick again.
  for (let attempt = 1; ; attempt++) {
    const id = crypto.randomUUID();
    const code = await pickUniqueCode(isTaken);
    try {
      await db
        .prepare(
          `INSERT INTO participants (id, display_name, code, browser_id, consent_at, ip_hash, created_at, delete_after)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5, ?7)`,
        )
        .bind(
          id,
          values.displayName,
          code,
          values.browserId,
          values.now.getTime(),
          values.ipHash,
          deleteAfter,
        )
        .run();
      return { id, displayName: values.displayName, code };
    } catch (error) {
      const duplicate = error instanceof Error && /UNIQUE/i.test(error.message);
      if (!duplicate || attempt >= INSERT_ATTEMPTS) throw error;
    }
  }
}

function groupCodeCookie(groupCode: string | null, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  // A session cookie: the group applies to the tests taken in this visit (T2.3 stores it on the result).
  return groupCode
    ? `${GROUP_CODE_COOKIE}=${groupCode}; Path=/; HttpOnly; SameSite=Lax${secure}`
    : `${GROUP_CODE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}

export async function startSession(rawBody: unknown, deps: StartDeps): Promise<Response> {
  const { db, kv, request, config, now } = deps;
  const body: Body = rawBody && typeof rawBody === "object" ? (rawBody as Body) : {};

  if (body.consent !== true) {
    return apiError("CONSENT_REQUIRED", START_MESSAGES.consent, {
      fields: { consent: START_MESSAGES.consent },
    });
  }

  // The cookie wins; the localStorage copy covers a browser that cleared its cookies.
  const knownBrowserId =
    readBrowserIdCookie(request) ?? (isBrowserId(body.browserId) ? body.browserId : null);
  const existing = knownBrowserId ? await findParticipant(db, knownBrowserId, now) : null;

  const fields: Record<string, string> = {};
  let name = "";
  if (!existing) {
    const result = validateName(typeof body.name === "string" ? body.name : "");
    if (result.ok) name = result.name;
    else fields.name = result.message;
  }
  const group = normaliseGroupCode(typeof body.groupCode === "string" ? body.groupCode : null);
  if (!group.ok) fields.groupCode = group.message;
  if (Object.keys(fields).length > 0) {
    return apiError("VALIDATION_FAILED", START_MESSAGES.form, { fields });
  }

  const ip = clientIp(request);
  const token = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  const captcha = token
    ? await deps.verifyCaptcha(token, ip)
    : ({ ok: false, reason: "invalid" } as const);
  if (!captcha.ok) {
    return captcha.reason === "unavailable"
      ? apiError("CAPTCHA_FAILED", START_MESSAGES.captchaUnavailable, { retryable: true })
      : apiError("CAPTCHA_FAILED", START_MESSAGES.captcha);
  }

  const ipHash = await hashIp(ip, config.ipHashSalt);
  const refused = await guardSessionStart({
    db,
    kv,
    ipHash,
    dailySttMinutesCap: config.dailySttMinutesCap,
    now,
  });
  if (refused) return refused;

  const browserId = knownBrowserId ?? newBrowserId();
  const participant =
    existing ??
    (await createParticipant(db, {
      displayName: displayName(name),
      browserId,
      ipHash,
      now,
      retentionDays: config.retentionDays,
    }));

  const payload: StartResponse = {
    participant,
    browserId,
    groupCode: group.ok ? group.groupCode : null,
    resumed: existing !== null,
  };
  const headers = new Headers({ "Cache-Control": "no-store" });
  headers.append("Set-Cookie", browserIdCookie(browserId, config.retentionDays, request));
  headers.append("Set-Cookie", groupCodeCookie(payload.groupCode, request));
  return Response.json(payload, { status: existing ? 200 : 201, headers });
}
