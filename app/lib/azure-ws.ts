/**
 * T0.5 spike: Azure continuous pronunciation assessment over the Speech service WebSocket
 * protocol (the one the Speech SDK uses), opened from a Worker with `fetch` + `Upgrade`.
 * Worker-only (needs `response.webSocket`). Not used in production code unless T0.5 picks it.
 */
import { alignWords, referenceWords, spokenIndexByReference } from "./align";
import type { AzureResult, AzureWord } from "./azure";
import { parseWav } from "./wav";

const TICKS_PER_SECOND = 10_000_000;
const AUDIO_CHUNK_BYTES = 32_000; // 1 second of 16 kHz 16-bit mono

type Phrase = {
  RecognitionStatus: string;
  NBest?: {
    Lexical?: string;
    PronunciationAssessment?: {
      AccuracyScore: number;
      FluencyScore: number;
      CompletenessScore?: number;
      PronScore: number;
      ProsodyScore?: number;
    };
    Words?: {
      Word: string;
      Offset?: number;
      Duration?: number;
      PronunciationAssessment?: { AccuracyScore?: number; ErrorType?: string };
    }[];
  }[];
};

export type WsVariant = "top-level" | "enrichment";

const timestamp = () => new Date().toISOString();
const id = () => crypto.randomUUID().replaceAll("-", "");

function textMessage(path: string, requestId: string, body: unknown): string {
  return [
    `Path: ${path}`,
    `X-RequestId: ${requestId}`,
    `X-Timestamp: ${timestamp()}`,
    "Content-Type: application/json",
    "",
    JSON.stringify(body),
  ].join("\r\n");
}

function audioMessage(requestId: string, audio: Uint8Array): Uint8Array {
  const header = new TextEncoder().encode(
    `Path: audio\r\nX-RequestId: ${requestId}\r\nX-Timestamp: ${timestamp()}\r\nContent-Type: audio/x-wav\r\n`,
  );
  const message = new Uint8Array(2 + header.length + audio.length);
  new DataView(message.buffer).setUint16(0, header.length); // big-endian header length
  message.set(header, 2);
  message.set(audio, 2 + header.length);
  return message;
}

function parseIncoming(data: string): { path: string; body: string } {
  const split = data.indexOf("\r\n\r\n");
  const head = split === -1 ? data : data.slice(0, split);
  const path = /^path:\s*(.+)$/im.exec(head)?.[1]?.trim().toLowerCase() ?? "";
  return { path, body: split === -1 ? "" : data.slice(split + 4) };
}

export type WsTimings = { connectMs: number; firstPhraseMs: number | null; totalMs: number };

export async function assessContinuous(
  { key, region }: { key: string; region: string },
  wav: Uint8Array,
  referenceText: string,
  { variant = "enrichment" as WsVariant, timeoutMs = 30_000 } = {},
): Promise<{ result: AzureResult; phrases: number; timings: WsTimings; rawStatuses: string[] }> {
  const started = Date.now();
  const response = await fetch(
    `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`,
    {
      headers: {
        Upgrade: "websocket",
        "Ocp-Apim-Subscription-Key": key,
        "X-ConnectionId": id(),
      },
    },
  );
  const ws = response.webSocket;
  if (!ws) throw new Error(`azure websocket: upgrade refused (${response.status})`);
  ws.accept();
  const connectMs = Date.now() - started;

  const requestId = id();
  const assessment = {
    referenceText,
    gradingSystem: "HundredMark",
    granularity: "Word",
    dimension: "Comprehensive",
    enableMiscue: false, // not supported in continuous mode
    enableProsodyAssessment: true,
  };
  const phraseOutput = {
    format: "Detailed",
    detailed: { options: ["WordTimings", "PronunciationAssessment", "SNR"] },
  };
  const context =
    variant === "top-level"
      ? { pronunciationAssessment: assessment, phraseOutput }
      : { phraseDetection: { enrichment: { pronunciationAssessment: assessment } }, phraseOutput };

  const phrases: Phrase[] = [];
  let firstPhraseMs: number | null = null;
  const done = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("azure websocket: timed out")), timeoutMs);
    ws.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      const { path, body } = parseIncoming(event.data);
      if (path === "speech.phrase") {
        firstPhraseMs ??= Date.now() - started;
        phrases.push(JSON.parse(body) as Phrase);
      } else if (path === "turn.end") {
        clearTimeout(timer);
        resolve();
      }
    });
    ws.addEventListener("close", (event) => {
      clearTimeout(timer);
      reject(new Error(`azure websocket: closed ${event.code} ${event.reason}`));
    });
  });

  ws.send(
    textMessage("speech.config", requestId, {
      context: {
        system: { version: "1.0.00000" },
        os: { platform: "Cloudflare Workers", name: "workerd", version: "1" },
        audio: { source: { type: "File" } },
      },
    }),
  );
  ws.send(textMessage("speech.context", requestId, context));
  // The first audio message carries the WAV header; then raw PCM, as fast as the socket allows.
  const info = parseWav(wav);
  ws.send(audioMessage(requestId, wav.subarray(0, info.dataOffset)));
  for (let at = info.dataOffset; at < info.dataOffset + info.dataLength; at += AUDIO_CHUNK_BYTES) {
    ws.send(
      audioMessage(requestId, wav.subarray(at, Math.min(at + AUDIO_CHUNK_BYTES, wav.length))),
    );
  }
  ws.send(audioMessage(requestId, new Uint8Array(0))); // end of audio

  try {
    await done;
  } finally {
    ws.close(1000, "done");
  }

  return {
    result: aggregatePhrases(phrases, referenceText),
    phrases: phrases.length,
    timings: { connectMs, firstPhraseMs, totalMs: Date.now() - started },
    rawStatuses: phrases.map((phrase) => phrase.RecognitionStatus),
  };
}

/** Word-count-weighted phrase scores. Completeness comes from aligning all heard words to the text. */
export function aggregatePhrases(phrases: Phrase[], referenceText: string): AzureResult {
  const scored = phrases.flatMap((phrase) => {
    const best = phrase.NBest?.[0];
    return best?.PronunciationAssessment
      ? [{ assessment: best.PronunciationAssessment, words: best.Words ?? [] }]
      : [];
  });
  const words: AzureWord[] = scored.flatMap((phrase) =>
    phrase.words.map((word) => ({
      word: word.Word,
      accuracy: word.PronunciationAssessment?.AccuracyScore ?? 0,
      errorType: word.PronunciationAssessment?.ErrorType ?? "None",
      offsetSec: (word.Offset ?? 0) / TICKS_PER_SECOND,
      durationSec: (word.Duration ?? 0) / TICKS_PER_SECOND,
    })),
  );
  type Assessment = (typeof scored)[number]["assessment"];
  const total = scored.reduce((sum, phrase) => sum + phrase.words.length, 0) || 1;
  const weighted = (pick: (assessment: Assessment) => number) =>
    scored.reduce((sum, phrase) => sum + pick(phrase.assessment) * phrase.words.length, 0) / total;

  const reference = referenceWords(referenceText);
  const matched = spokenIndexByReference(
    alignWords(
      reference,
      words.map((w) => w.word),
    ),
    reference.length,
  ).filter((index) => index !== null).length;

  const prosodyKnown = scored.every((phrase) => phrase.assessment.ProsodyScore !== undefined);
  return {
    accuracy: weighted((pa) => pa.AccuracyScore),
    fluency: weighted((pa) => pa.FluencyScore),
    completeness: reference.length ? (100 * matched) / reference.length : 0,
    pronunciation: weighted((pa) => pa.PronScore),
    prosody: scored.length && prosodyKnown ? weighted((pa) => pa.ProsodyScore ?? 0) : null,
    words,
    recognitionStatus: scored.length ? "Success" : (phrases[0]?.RecognitionStatus ?? "NoPhrases"),
  };
}
