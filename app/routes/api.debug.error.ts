/**
 * GET /api/debug/error throws on purpose, to prove that errors reach Workers Logs with a request
 * id (T0.4 acceptance). Not available in production.
 */
import { env } from "cloudflare:workers";

import { apiError } from "~/lib/errors";

export function loader() {
  if (env.APP_ENV === "production") return apiError("NOT_FOUND", "Not found");
  throw new Error("Forced error from /api/debug/error");
}
