/**
 * Deepgram Nova-3 pre-recorded transcription (TRD §6.1): transcript, word timings and confidence.
 * S-2: 20 s timeout, one retry after 500 ms.
 */
import { callWithRetry, type CallPolicy, ProviderError } from "./http";

/** The call T3.2 specifies; the saved fixture responses (T3.8) are made with the same URL. */
export const DEEPGRAM_LISTEN_URL =
  "https://api.deepgram.com/v1/listen?model=nova-3&language=en-US&smart_format=true";

export type SpokenWord = { word: string; start: number; end: number; confidence: number };
export type DeepgramResult = { transcript: string; words: SpokenWord[]; durationSec: number };

export type DeepgramResponse = {
  metadata?: { duration?: number };
  results?: {
    channels?: { alternatives?: { transcript?: string; words?: SpokenWord[] }[] }[];
  };
};

/** The raw Deepgram response (saved as a fixture by T3.8; parsed by `parseDeepgramResponse`). */
export async function fetchTranscription(
  apiKey: string,
  wav: Uint8Array<ArrayBuffer>,
  policy: Partial<CallPolicy> = {},
): Promise<DeepgramResponse> {
  const response = await callWithRetry(
    "deepgram",
    DEEPGRAM_LISTEN_URL,
    {
      method: "POST",
      headers: { Authorization: `Token ${apiKey}`, "Content-Type": "audio/wav" },
      body: wav,
    },
    { timeoutMs: 20_000, ...policy },
  );
  try {
    return (await response.json()) as DeepgramResponse;
  } catch {
    throw new ProviderError("deepgram", "response is not valid JSON");
  }
}

export function parseDeepgramResponse(body: DeepgramResponse): DeepgramResult {
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

export async function transcribe(
  apiKey: string,
  wav: Uint8Array<ArrayBuffer>,
  policy: Partial<CallPolicy> = {},
): Promise<DeepgramResult> {
  return parseDeepgramResponse(await fetchTranscription(apiKey, wav, policy));
}
