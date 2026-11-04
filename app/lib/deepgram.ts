/**
 * Deepgram Nova-3 pre-recorded transcription (TRD §6.1): transcript, word timings and confidence.
 * S-2: 20 s timeout, one retry after 500 ms.
 */
import { callWithRetry, type CallPolicy, ProviderError } from "./http";

const ENDPOINT = "https://api.deepgram.com/v1/listen?model=nova-3&language=en&smart_format=false";

export type SpokenWord = { word: string; start: number; end: number; confidence: number };
export type DeepgramResult = { transcript: string; words: SpokenWord[]; durationSec: number };

type DeepgramResponse = {
  metadata?: { duration?: number };
  results?: {
    channels?: { alternatives?: { transcript?: string; words?: SpokenWord[] }[] }[];
  };
};

export async function transcribe(
  apiKey: string,
  wav: Uint8Array<ArrayBuffer>,
  policy: Partial<CallPolicy> = {},
): Promise<DeepgramResult> {
  const response = await callWithRetry(
    "deepgram",
    ENDPOINT,
    {
      method: "POST",
      headers: { Authorization: `Token ${apiKey}`, "Content-Type": "audio/wav" },
      body: wav,
    },
    { timeoutMs: 20_000, ...policy },
  );
  const body = (await response.json()) as DeepgramResponse;
  const best = body.results?.channels?.[0]?.alternatives?.[0];
  if (!best) throw new ProviderError("deepgram", "response has no transcript");
  return {
    transcript: best.transcript ?? "",
    words: (best.words ?? []).map(({ word, start, end, confidence }) => ({
      word,
      start,
      end,
      confidence,
    })),
    durationSec: body.metadata?.duration ?? 0,
  };
}
