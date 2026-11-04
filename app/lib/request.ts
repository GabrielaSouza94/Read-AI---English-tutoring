/**
 * Per-request plumbing for the Worker entry (T0.4): a request id on every request and response,
 * and S-1 JSON in place of React Router's plain-text 500 on API routes.
 */
import { internalError } from "./errors";

export const REQUEST_ID_HEADER = "x-request-id";

/** The request with our own id. A client-supplied `x-request-id` is replaced, never trusted. */
export function withRequestId(request: Request, requestId: string): Request {
  const headers = new Headers(request.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  return new Request(request, { headers });
}

export function requestIdOf(request: Request): string | undefined {
  return request.headers.get(REQUEST_ID_HEADER) ?? undefined;
}

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/**
 * The pathname only. Query strings are dropped, because a portal search can carry a participant
 * name (BR-15).
 */
export function routeOf(url: URL): string {
  return url.pathname;
}

export function finaliseResponse(response: Response, url: URL, requestId: string): Response {
  const isJson = response.headers.get("content-type")?.includes("application/json") ?? false;
  const result =
    response.status >= 500 && isApiPath(url.pathname) && !isJson
      ? internalError(requestId)
      : new Response(response.body, response); // a copy, so the headers are mutable
  result.headers.set(REQUEST_ID_HEADER, requestId);
  return result;
}
