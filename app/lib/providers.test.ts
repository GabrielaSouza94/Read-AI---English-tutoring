import { describe, expect, it } from "vitest";

import { assessmentHeader, assessPronunciation, parseAzureResponse } from "./azure";
import { aggregatePhrases } from "./azure-ws";
import { transcribe } from "./deepgram";
import { callWithRetry, ProviderError } from "./http";

function fakeFetch(responses: (Response | "network")[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses[calls.length - 1] ?? new Response("{}");
    if (next === "network") throw new TypeError("fetch failed");
    return next;
  };
  return { calls, fetchImpl };
}

describe("callWithRetry (S-2)", () => {
  it("retries once on 5xx, then succeeds", async () => {
    const { calls, fetchImpl } = fakeFetch([new Response("", { status: 503 }), new Response("ok")]);
    const response = await callWithRetry(
      "x",
      "https://x",
      {},
      { timeoutMs: 1000, retryDelayMs: 0, fetchImpl },
    );
    expect(await response.text()).toBe("ok");
    expect(calls).toHaveLength(2);
  });

  it("does not retry a 400, and never includes the body", async () => {
    const { calls, fetchImpl } = fakeFetch([new Response("secret echo", { status: 400 })]);
    const call = callWithRetry(
      "azure",
      "https://x",
      {},
      { timeoutMs: 1000, retryDelayMs: 0, fetchImpl },
    );
    await expect(call).rejects.toThrow(new ProviderError("azure", "returned 400", 400));
    expect(calls).toHaveLength(1);
  });

  it("fails after a second network error", async () => {
    const { fetchImpl } = fakeFetch(["network", "network"]);
    await expect(
      callWithRetry("deepgram", "https://x", {}, { timeoutMs: 1000, retryDelayMs: 0, fetchImpl }),
    ).rejects.toThrow("deepgram: network error");
  });
});

describe("Azure REST", () => {
  it("encodes the assessment parameters as base64 JSON", () => {
    const decoded = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(assessmentHeader("Café’s open.")), (c) => c.charCodeAt(0)),
      ),
    );
    expect(decoded).toMatchObject({
      ReferenceText: "Café’s open.",
      GradingSystem: "HundredMark",
      Granularity: "Word",
      Dimension: "Comprehensive",
      EnableMiscue: "True",
    });
  });

  it("parses scores and converts word offsets to seconds", () => {
    const result = parseAzureResponse({
      RecognitionStatus: "Success",
      NBest: [
        {
          AccuracyScore: 92,
          FluencyScore: 80,
          CompletenessScore: 100,
          PronScore: 88.5,
          ProsodyScore: 75,
          Words: [
            {
              Word: "good",
              AccuracyScore: 100,
              ErrorType: "None",
              Offset: 7_000_000,
              Duration: 2_600_000,
            },
          ],
        },
      ],
    });
    expect(result).toMatchObject({
      accuracy: 92,
      fluency: 80,
      completeness: 100,
      pronunciation: 88.5,
      prosody: 75,
    });
    expect(result.words[0]).toEqual({
      word: "good",
      accuracy: 100,
      errorType: "None",
      offsetSec: 0.7,
      durationSec: 0.26,
    });
  });

  it("treats silence as a zero result, not an error", () => {
    expect(parseAzureResponse({ RecognitionStatus: "InitialSilenceTimeout" })).toMatchObject({
      accuracy: 0,
      words: [],
      recognitionStatus: "InitialSilenceTimeout",
    });
  });

  it("sends the key, audio type and assessment header to the regional endpoint", async () => {
    const { calls, fetchImpl } = fakeFetch([Response.json({ RecognitionStatus: "NoMatch" })]);
    await assessPronunciation({ key: "k", region: "brazilsouth" }, new Uint8Array(4), "Hi.", {
      fetchImpl,
    });
    expect(calls[0].url).toMatch(
      /^https:\/\/brazilsouth\.stt\.speech\.microsoft\.com\/.+language=en-US/,
    );
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get("ocp-apim-subscription-key")).toBe("k");
    expect(headers.get("content-type")).toBe("audio/wav; codecs=audio/pcm; samplerate=16000");
    expect(headers.get("pronunciation-assessment")).toBe(assessmentHeader("Hi."));
  });
});

describe("Deepgram", () => {
  it("returns transcript, word timings and duration", async () => {
    const { calls, fetchImpl } = fakeFetch([
      Response.json({
        metadata: { duration: 3.2 },
        results: {
          channels: [
            {
              alternatives: [
                {
                  transcript: "good morning",
                  words: [
                    {
                      word: "good",
                      start: 0.1,
                      end: 0.4,
                      confidence: 0.99,
                      punctuated_word: "Good",
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    ]);
    const result = await transcribe("dg", new Uint8Array(4), { fetchImpl });
    expect(new Headers(calls[0].init.headers).get("authorization")).toBe("Token dg");
    expect(calls[0].url).toContain("model=nova-3");
    expect(result).toEqual({
      transcript: "good morning",
      words: [{ word: "good", start: 0.1, end: 0.4, confidence: 0.99 }],
      durationSec: 3.2,
    });
  });
});

describe("aggregatePhrases (WebSocket continuous mode)", () => {
  it("weights phrase scores by word count and computes completeness against the whole text", () => {
    const phrase = (score: number, words: string[]) => ({
      RecognitionStatus: "Success",
      NBest: [
        {
          PronunciationAssessment: { AccuracyScore: score, FluencyScore: score, PronScore: score },
          Words: words.map((Word) => ({
            Word,
            PronunciationAssessment: { AccuracyScore: score, ErrorType: "None" },
          })),
        },
      ],
    });
    const result = aggregatePhrases(
      [
        phrase(90, ["one", "two", "three"]),
        phrase(50, ["four"]),
        { RecognitionStatus: "EndOfDictation" },
      ],
      "One two three four five six.",
    );
    expect(result.accuracy).toBe(80);
    expect(result.completeness).toBeCloseTo((4 / 6) * 100);
    expect(result.prosody).toBeNull();
    expect(result.words).toHaveLength(4);
  });
});
