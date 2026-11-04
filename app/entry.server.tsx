/**
 * React Router's default web server entry, plus `handleError` (T0.4): an error thrown in any
 * loader, action or render is logged once, as JSON with the request id from workers/app.ts.
 */
import type { EntryContext, HandleErrorFunction, RouterContextProvider } from "react-router";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";

import { log } from "~/lib/log";
import { requestIdOf, routeOf } from "~/lib/request";

export const streamTimeout = 5_000;

export const handleError: HandleErrorFunction = (error, { request }) => {
  if (request.signal.aborted) return; // the client went away; not a server fault
  log.error("unhandled_exception", {
    requestId: requestIdOf(request),
    route: routeOf(new URL(request.url)),
    method: request.method,
    error,
  });
};

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: RouterContextProvider,
) {
  // https://httpwg.org/specs/rfc9110.html#HEAD
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, { status: responseStatusCode, headers: responseHeaders });
  }

  let shellRendered = false;
  const userAgent = request.headers.get("user-agent");

  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: AbortSignal.timeout(streamTimeout + 1000),
      onError(error: unknown) {
        responseStatusCode = 500;
        // Errors during the initial shell render reject and reach handleError instead.
        if (shellRendered) handleError(error, { request, params: {}, context: _loadContext });
      },
    },
  );
  shellRendered = true;

  // Bots and SPA mode wait for all content, so they get complete HTML.
  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, { headers: responseHeaders, status: responseStatusCode });
}
