import { describe, expect, it } from "vitest";

import { type ApiErrorBody, apiError } from "./errors";
import { finaliseResponse, REQUEST_ID_HEADER, routeOf, withRequestId } from "./request";

const url = (path: string) => new URL(`https://read-ai.example${path}`);

describe("withRequestId", () => {
  it("replaces a request id sent by the client", () => {
    const request = new Request("https://read-ai.example/", {
      headers: { [REQUEST_ID_HEADER]: "spoofed" },
    });
    expect(withRequestId(request, "ours").headers.get(REQUEST_ID_HEADER)).toBe("ours");
  });
});

describe("routeOf", () => {
  it("drops the query string, which can hold a searched name", () => {
    expect(routeOf(url("/portal?q=Ana%20Souza"))).toBe("/portal");
  });
});

describe("finaliseResponse", () => {
  it("adds the request id header", () => {
    const response = finaliseResponse(new Response("ok"), url("/"), "req-1");
    expect(response.headers.get(REQUEST_ID_HEADER)).toBe("req-1");
  });

  it("turns a plain-text 500 from an API route into S-1 JSON with the request id", async () => {
    const response = finaliseResponse(
      new Response("Unexpected Server Error", { status: 500 }),
      url("/api/debug/error"),
      "req-2",
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "INTERNAL",
        message: "Something went wrong. Please try again.",
        retryable: true,
        requestId: "req-2",
      },
    });
  });

  it("keeps an API route's own JSON error", async () => {
    const response = finaliseResponse(
      apiError("PROVIDER_ERROR", "Scorer failed", { retryable: true }),
      url("/api/attempts"),
      "req-3",
    );
    expect(response.status).toBe(502);
    expect(((await response.json()) as ApiErrorBody).error.code).toBe("PROVIDER_ERROR");
  });

  it("leaves page errors to the React error boundary", async () => {
    const response = finaliseResponse(
      new Response("<html>Oops</html>", { status: 500, headers: { "content-type": "text/html" } }),
      url("/portal"),
      "req-4",
    );
    expect(await response.text()).toBe("<html>Oops</html>");
  });
});
