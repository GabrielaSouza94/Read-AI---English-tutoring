import { describe, expect, it } from "vitest";

import { CONNECTION_LOST, postJson, RequestError, UNEXPECTED } from "./api-client";
import type { Fetch } from "./http";

const respond =
  (response: Response | Error): Fetch =>
  async () => {
    if (response instanceof Error) throw response;
    return response;
  };

async function failure(fetchImpl: Fetch): Promise<RequestError> {
  try {
    await postJson("/api/x", {}, fetchImpl);
  } catch (error) {
    if (error instanceof RequestError) return error;
    throw error;
  }
  throw new Error("expected a RequestError");
}

const s1 = (status: number, code: string, message: string, retryable = false) =>
  Response.json({ error: { code, message, retryable } }, { status });

describe("postJson", () => {
  it("returns the JSON body on success", async () => {
    expect(await postJson("/api/x", {}, respond(Response.json({ ok: 1 })))).toEqual({ ok: 1 });
  });

  it("uses the S-1 message, code and retryable flag", async () => {
    const error = await failure(
      respond(s1(429, "RATE_LIMITED", "You've reached today's 3 tests.")),
    );
    expect(error).toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
      retryable: false,
      message: "You've reached today's 3 tests.",
    });
    expect((await failure(respond(s1(502, "PROVIDER_ERROR", "Try later.", true)))).retryable).toBe(
      true,
    );
  });

  it("a network failure is 'Connection lost', retryable, and never the browser's raw text", async () => {
    const error = await failure(respond(new TypeError("Failed to fetch")));
    expect(error).toMatchObject({ code: "NETWORK", retryable: true, message: CONNECTION_LOST });
    expect(error.message).not.toContain("fetch");
  });

  it("a body that is not S-1 gets a plain message; 5xx are retryable", async () => {
    const html = new Response("<h1>Bad gateway</h1>", { status: 502 });
    expect(await failure(respond(html))).toMatchObject({
      code: "UNKNOWN",
      status: 502,
      retryable: true,
      message: UNEXPECTED,
    });
    const notFound = new Response("nope", { status: 404 });
    expect(await failure(respond(notFound))).toMatchObject({
      retryable: false,
      message: UNEXPECTED,
    });
  });
});
