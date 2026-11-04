/**
 * T0.5 spike: POST a 16 kHz mono WAV to
 *   /api/debug/azure-spike?test=4&from=1&to=6&mode=whole|chunked|ws&maxChunk=25&variant=top-level
 * and get Azure scores plus timings. Not in production. See docs/spikes/T0.5-azure-long-audio.md.
 */
import { env } from "cloudflare:workers";

import { type AzureScores, assessPronunciation } from "~/lib/azure";
import { combineChunkResults, DEFAULT_MAX_CHUNK_SEC, planChunks } from "~/lib/azure-chunks";
import { assessContinuous, type WsVariant } from "~/lib/azure-ws";
import { loadSpeechConfig } from "~/lib/config";
import { transcribe } from "~/lib/deepgram";
import { apiError } from "~/lib/errors";
import { log } from "~/lib/log";
import { spikeGuard, spikeSentences } from "~/lib/spike";
import { parseWav, sliceWav } from "~/lib/wav";

const round = (value: number) => Math.round(value * 10) / 10;
const scores = (r: AzureScores) => ({
  accuracy: round(r.accuracy),
  fluency: round(r.fluency),
  completeness: round(r.completeness),
  pronunciation: round(r.pronunciation),
  prosody: r.prosody === null ? null : round(r.prosody),
});

export async function action({ request }: { request: Request }) {
  const blocked = await spikeGuard(env.APP_ENV, env.KV);
  if (blocked) return blocked;
  const url = new URL(request.url);
  const sentences = spikeSentences(url);
  if (sentences instanceof Response) return sentences;
  const mode = url.searchParams.get("mode") ?? "chunked";
  const maxChunk = Number(url.searchParams.get("maxChunk") ?? DEFAULT_MAX_CHUNK_SEC);

  const started = Date.now();
  const wav = new Uint8Array(await request.arrayBuffer());
  const info = parseWav(wav);
  const config = loadSpeechConfig(env as unknown as Record<string, unknown>);
  const azure = { key: config.azureSpeechKey, region: config.azureSpeechRegion };
  const referenceText = sentences.join(" ");
  const base = { mode, durationSec: round(info.durationSec), sentences: sentences.length };

  try {
    if (mode === "whole") {
      const result = await assessPronunciation(azure, wav, referenceText);
      return Response.json({
        ...base,
        status: result.recognitionStatus,
        scores: scores(result),
        timings: { totalMs: Date.now() - started },
      });
    }

    if (mode === "ws") {
      const variant = (url.searchParams.get("variant") ?? "enrichment") as WsVariant;
      const run = await assessContinuous(azure, wav, referenceText, { variant });
      return Response.json({
        ...base,
        variant,
        phrases: run.phrases,
        rawStatuses: run.rawStatuses,
        scores: scores(run.result),
        timings: { ...run.timings, totalMs: Date.now() - started },
      });
    }

    // Chunked: Deepgram word timings → sentence-boundary chunks → Azure chunks in parallel.
    const deepgramStarted = Date.now();
    const deepgram = await transcribe(config.deepgramApiKey, wav);
    const deepgramMs = Date.now() - deepgramStarted;
    const chunks = planChunks(sentences, deepgram.words, info.durationSec, maxChunk);
    const azureStarted = Date.now();
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const chunkStarted = Date.now();
        const audio = sliceWav(wav, chunk.startSec, chunk.endSec, info);
        const result = await assessPronunciation(azure, audio, chunk.referenceText);
        return { chunk, result, ms: Date.now() - chunkStarted };
      }),
    );
    return Response.json({
      ...base,
      maxChunk,
      scores: scores(combineChunkResults(results)),
      chunks: results.map(({ chunk, result, ms }) => ({
        startSec: round(chunk.startSec),
        endSec: round(chunk.endSec),
        words: chunk.wordCount,
        ms,
        status: result.recognitionStatus,
        scores: scores(result),
      })),
      timings: { deepgramMs, azureMs: Date.now() - azureStarted, totalMs: Date.now() - started },
    });
  } catch (error) {
    log.error("azure_spike_failed", { mode, error });
    const message = error instanceof Error ? error.message : "Spike failed";
    return apiError("PROVIDER_ERROR", message, { retryable: true });
  }
}
