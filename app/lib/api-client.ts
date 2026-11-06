/**
 * The browser side of the S-1 error format (T2.6): every failed request becomes a RequestError
 * with a message fit to show, the S-1 code and whether trying again can help. A network failure
 * is "Connection lost", never the browser's own text ("Failed to fetch", "NetworkError ...").
 */
import type { ApiErrorBody, ErrorCode } from "./errors";
import type { Fetch } from "./http";

export const CONNECTION_LOST = "Connection lost. Check your internet connection, then try again.";
export const UNEXPECTED = "Something went wrong. Please try again.";

export class RequestError extends Error {
  constructor(
    message: string,
    readonly code: ErrorCode | "NETWORK" | "UNKNOWN",
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = "RequestError";
  }
}

function isApiError(body: unknown): body is ApiErrorBody {
  const error = (body as ApiErrorBody | null)?.error;
  return typeof error?.code === "string" && typeof error.message === "string";
}

/** POSTs and returns the parsed JSON body; throws RequestError on any failure. */
export async function postJson(
  url: string,
  init: RequestInit,
  fetchImpl: Fetch = (input, options) => fetch(input, options),
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url, { method: "POST", ...init });
  } catch {
    throw new RequestError(CONNECTION_LOST, "NETWORK", true);
  }
  const body: unknown = await response.json().catch(() => null);
  if (response.ok) return body;
  if (isApiError(body)) {
    throw new RequestError(
      body.error.message,
      body.error.code,
      body.error.retryable,
      response.status,
    );
  }
  throw new RequestError(UNEXPECTED, "UNKNOWN", response.status >= 500, response.status);
}
