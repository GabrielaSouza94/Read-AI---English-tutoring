/**
 * Azure AI Speech pronunciation assessment over the REST short-audio API (TRD §6.2).
 * At most 30 seconds of audio per request; longer reads are chunked (`azure-chunks.ts`).
 * S-2: 20 s timeout per chunk, one retry after 500 ms.
 */
import { callWithRetry, type CallPolicy, ProviderError } from "./http";
import { parseWav } from "./wav";

export const AZURE_MAX_SECONDS = 30;

export type AzureWord = {
  word: string;
  accuracy: number;
  errorType: "None" | "Omission" | "Insertion" | "Mispronunciation" | string;
  offsetSec: number;
  durationSec: number;
};

export type AzureScores = {
  accuracy: number;
  fluency: number;
  completeness: number;
  pronunciation: number;
  prosody: number | null;
};

export type AzureResult = AzureScores & { words: AzureWord[]; recognitionStatus: string };

export type AzureResponse = {
  RecognitionStatus: string;
  NBest?: {
    AccuracyScore: number;
    FluencyScore: number;
    CompletenessScore: number;
    PronScore: number;
    ProsodyScore?: number;
    Words?: {
      Word: string;
      AccuracyScore?: number;
      ErrorType?: string;
      Offset?: number;
      Duration?: number;
    }[];
  }[];
};

const TICKS_PER_SECOND = 10_000_000; // Azure offsets are in 100-nanosecond units

const toBase64 = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));

export function assessmentHeader(referenceText: string): string {
  return toBase64(
    JSON.stringify({
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Granularity: "Word",
      Dimension: "Comprehensive",
      EnableMiscue: "True",
      EnableProsodyAssessment: "True",
    }),
  );
}

export function parseAzureResponse(body: AzureResponse): AzureResult {
  const best = body.NBest?.[0];
  if (body.RecognitionStatus !== "Success" || !best) {
    // Silence or no speech: a valid result with zero scores, not a provider failure.
    return {
      accuracy: 0,
      fluency: 0,
      completeness: 0,
      pronunciation: 0,
      prosody: null,
      words: [],
      recognitionStatus: body.RecognitionStatus,
    };
  }
  return {
    accuracy: best.AccuracyScore,
    fluency: best.FluencyScore,
    completeness: best.CompletenessScore,
    pronunciation: best.PronScore,
    prosody: best.ProsodyScore ?? null,
    words: (best.Words ?? []).map((word) => ({
      word: word.Word,
      accuracy: word.AccuracyScore ?? 0,
      errorType: word.ErrorType ?? "None",
      offsetSec: (word.Offset ?? 0) / TICKS_PER_SECOND,
      durationSec: (word.Duration ?? 0) / TICKS_PER_SECOND,
    })),
    recognitionStatus: body.RecognitionStatus,
  };
}

/** The raw Azure response for one request of at most 30 s (saved as a fixture by T3.8). */
export async function fetchAssessment(
  { key, region }: { key: string; region: string },
  wav: Uint8Array<ArrayBuffer>,
  referenceText: string,
  policy: Partial<CallPolicy> & { allowLong?: boolean } = {},
): Promise<AzureResponse> {
  // Azure answers 200 for longer audio but scores only about the first 30 s (T0.5), so a long
  // read would silently look incomplete. Chunk it first (azure-chunks.ts).
  if (!policy.allowLong && parseWav(wav).durationSec > AZURE_MAX_SECONDS) {
    throw new ProviderError("azure", `audio is longer than ${AZURE_MAX_SECONDS} s; chunk it first`);
  }
  const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;
  const response = await callWithRetry(
    "azure",
    url,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        Accept: "application/json",
        "Pronunciation-Assessment": assessmentHeader(referenceText),
      },
      body: wav,
    },
    { timeoutMs: 20_000, ...policy },
  );
  try {
    return (await response.json()) as AzureResponse;
  } catch {
    throw new ProviderError("azure", "response is not valid JSON");
  }
}

export async function assessPronunciation(
  account: { key: string; region: string },
  wav: Uint8Array<ArrayBuffer>,
  referenceText: string,
  policy: Partial<CallPolicy> & { allowLong?: boolean } = {},
): Promise<AzureResult> {
  return parseAzureResponse(await fetchAssessment(account, wav, referenceText, policy));
}
