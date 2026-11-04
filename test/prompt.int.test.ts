/**
 * T0.6: pull the feedback prompt and render it with fixture variables.
 *
 * The first suite stubs LangSmith with the manifest that `npm run prompt:push` uploads. The second
 * pulls the real prompt and runs only when LANGSMITH_API_KEY is set (it is not set in CI).
 */
import { describe, expect, it } from "vitest";

import { LANGSMITH_API_URL, pullPrompt } from "../app/lib/langsmith";
import {
  feedbackManifest,
  feedbackVariables,
  FEEDBACK_PROMPT_NAME,
  renderPrompt,
  SAMPLE_FEEDBACK_INPUT,
} from "../app/lib/prompts";

const PLACEHOLDER = /\{\{|\}\}/;

describe("pullPrompt (stubbed LangSmith)", () => {
  it("pulls a tagged commit and renders it with every placeholder filled", async () => {
    const calls: { url: string; headers: Headers }[] = [];
    const fetchImpl = (url: string, init: RequestInit) => {
      calls.push({ url, headers: new Headers(init.headers) });
      return Promise.resolve(
        Response.json({ commit_hash: "abc123", manifest: feedbackManifest() }),
      );
    };

    const pulled = await pullPrompt("test-key", `${FEEDBACK_PROMPT_NAME}:staging`, {
      timeoutMs: 1000,
      fetchImpl,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${LANGSMITH_API_URL}/commits/-/${FEEDBACK_PROMPT_NAME}/staging`);
    expect(calls[0]?.headers.get("x-api-key")).toBe("test-key");
    expect(pulled.commitHash).toBe("abc123");

    const messages = renderPrompt(pulled.prompt, feedbackVariables(SAMPLE_FEEDBACK_INPUT));
    expect(messages).toHaveLength(2);
    for (const message of messages) expect(message.content).not.toMatch(PLACEHOLDER);
  });

  it("pulls the latest commit when no tag is given", async () => {
    let url = "";
    await pullPrompt("k", FEEDBACK_PROMPT_NAME, {
      timeoutMs: 1000,
      fetchImpl: (u) => {
        url = u;
        return Promise.resolve(Response.json({ commit_hash: "x", manifest: feedbackManifest() }));
      },
    });
    expect(url).toBe(`${LANGSMITH_API_URL}/commits/-/${FEEDBACK_PROMPT_NAME}/latest`);
  });

  it("fails with a ProviderError, without the response body, when the prompt is missing", async () => {
    const pull = pullPrompt("k", "nope", {
      timeoutMs: 1000,
      fetchImpl: () => Promise.resolve(new Response("secret detail", { status: 404 })),
    });
    await expect(pull).rejects.toThrow("langsmith: returned 404");
    await expect(pull).rejects.not.toThrow("secret detail");
  });
});

const liveKey = process.env.LANGSMITH_API_KEY;

describe.skipIf(!liveKey)("pullPrompt (live LangSmith)", () => {
  it("pulls the staging prompt and fills every placeholder", async () => {
    const pulled = await pullPrompt(liveKey ?? "", `${FEEDBACK_PROMPT_NAME}:staging`, {
      timeoutMs: 5000,
    });
    const messages = renderPrompt(pulled.prompt, feedbackVariables(SAMPLE_FEEDBACK_INPUT));
    for (const message of messages) expect(message.content).not.toMatch(PLACEHOLDER);
  });
});
