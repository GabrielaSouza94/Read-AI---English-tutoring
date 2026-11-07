/**
 * Builds the audio fixture library (T3.8) in test/fixtures/:
 *
 *   npm run fixtures                       # synthetic audio, then saved responses, for every fixture
 *   npm run fixtures -- --audio            # only (re)make the synthetic WAV files
 *   npm run fixtures -- --responses        # only (re)save Deepgram and Azure responses
 *   npm run fixtures -- --only t1-clean    # one fixture
 *
 * Recorded fixtures (source "recorded") are never overwritten; --responses still saves theirs.
 * Keys (AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, DEEPGRAM_API_KEY) come from the environment or
 * .dev.vars and are never printed. A full run costs a few cents.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { SEED_TESTS } from "../app/db/seed-data";
import { fetchAssessment } from "../app/lib/azure";
import { DEFAULT_MAX_CHUNK_SEC, planChunks } from "../app/lib/azure-chunks";
import {
  DEEPGRAM_LISTEN_URL,
  fetchTranscription,
  parseDeepgramResponse,
} from "../app/lib/deepgram";
import { ProviderError } from "../app/lib/http";
import { parseWav, sliceWav, wavHeader } from "../app/lib/wav";
import {
  addNoise,
  AUDIO_DIR,
  audioPath,
  FIXTURES,
  RESPONSES_DIR,
  responsesPath,
  type Fixture,
  type FixtureResponses,
} from "../test/fixtures/fixtures";
import { loadAzureSpeech, ssml, synthesise } from "./lib/azure-tts";

const RATE = 16_000;

const { values } = parseArgs({
  options: {
    audio: { type: "boolean", default: false },
    responses: { type: "boolean", default: false },
    only: { type: "string" },
  },
});
const doAudio = values.audio || !values.responses;
const doResponses = values.responses || !values.audio;
const selected = FIXTURES.filter((f) => !values.only || f.id === values.only);

/** A fresh 44-byte header around the PCM data, whatever extra chunks the input had. */
function pcmWav(samples: Int16Array): Uint8Array<ArrayBuffer> {
  const header = wavHeader({
    sampleRate: RATE,
    channels: 1,
    bitsPerSample: 16,
    dataLength: samples.length * 2,
  });
  const out = new Uint8Array(header.length + samples.length * 2);
  out.set(header);
  out.set(new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength), header.length);
  return out;
}

function samplesOf(wav: Uint8Array): Int16Array {
  const info = parseWav(wav);
  if (info.sampleRate !== RATE || info.channels !== 1 || info.bitsPerSample !== 16) {
    throw new Error(`expected 16 kHz mono 16-bit, got ${info.sampleRate} Hz, ${info.channels} ch`);
  }
  const data = wav.slice(info.dataOffset, info.dataOffset + info.dataLength);
  return new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
}

async function makeAudio(fixture: Fixture, account: { key: string; region: string }) {
  let samples: Int16Array;
  if (fixture.kind === "silence") {
    samples = new Int16Array(RATE * (fixture.silenceSec ?? 4));
  } else {
    if (!fixture.spokenText) throw new Error(`${fixture.id} has no spoken text`);
    const wav = await synthesise(
      account,
      ssml(fixture.spokenText, fixture.tts),
      "riff-16khz-16bit-mono-pcm",
    );
    samples = samplesOf(wav);
    if (fixture.noiseSnrDb !== undefined) samples = addNoise(samples, fixture.noiseSnrDb);
  }
  const wav = pcmWav(samples);
  writeFileSync(audioPath(fixture), wav);
  return wav;
}

/** The step's sentences, for chunking at sentence boundaries. */
function stepSentences(fixture: Fixture): string[] {
  const test = SEED_TESTS.find((t) => t.id === fixture.testId);
  if (!test) throw new Error(`unknown test ${fixture.testId}`);
  return test.sentences.slice(0, Math.min(fixture.stepNumber, test.sentences.length));
}

async function saveResponses(
  fixture: Fixture,
  azure: { key: string; region: string },
  deepgramKey: string,
): Promise<FixtureResponses> {
  const wav = new Uint8Array(readFileSync(audioPath(fixture)));
  const durationSec = parseWav(wav).durationSec;
  const deepgram = await fetchTranscription(deepgramKey, wav);

  const pieces =
    durationSec <= DEFAULT_MAX_CHUNK_SEC
      ? [{ startSec: 0, endSec: durationSec, referenceText: fixture.referenceText }]
      : planChunks(stepSentences(fixture), parseDeepgramResponse(deepgram).words, durationSec);
  const azureResults = await Promise.all(
    pieces.map(async (piece) => ({
      startSec: piece.startSec,
      endSec: piece.endSec,
      referenceText: piece.referenceText,
      response: await fetchAssessment(
        azure,
        sliceWav(wav, piece.startSec, piece.endSec),
        piece.referenceText,
      ),
    })),
  );

  const saved: FixtureResponses = {
    fixtureId: fixture.id,
    savedAt: new Date().toISOString(),
    deepgramUrl: DEEPGRAM_LISTEN_URL,
    deepgram,
    azure: azureResults,
  };
  writeFileSync(responsesPath(fixture), `${JSON.stringify(saved, null, 2)}\n`);
  return saved;
}

async function main() {
  const azure = loadAzureSpeech();
  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  if (!azure || (doResponses && !deepgramKey)) {
    console.error(
      "AZURE_SPEECH_KEY, AZURE_SPEECH_REGION and DEEPGRAM_API_KEY must be set (environment or .dev.vars).",
    );
    process.exitCode = 1;
    return;
  }
  mkdirSync(AUDIO_DIR, { recursive: true });
  mkdirSync(RESPONSES_DIR, { recursive: true });

  for (const fixture of selected) {
    if (doAudio && fixture.source === "synthetic") await makeAudio(fixture, azure);
    const wav = new Uint8Array(readFileSync(audioPath(fixture)));
    const seconds = parseWav(wav).durationSec;
    let summary = `${fixture.id.padEnd(22)} ${seconds.toFixed(1).padStart(5)} s ${(wav.length / 1024).toFixed(0).padStart(5)} KB`;
    if (doResponses && deepgramKey) {
      const saved = await saveResponses(fixture, azure, deepgramKey);
      const heard = parseDeepgramResponse(saved.deepgram).transcript;
      const status = saved.azure.map((a) => a.response.RecognitionStatus).join("+");
      summary += `  azure ${saved.azure.length} chunk(s) ${status}  heard "${heard.slice(0, 40)}"`;
    }
    console.log(summary);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof ProviderError ? error.message : String(error);
  console.error(`Fixtures failed: ${message}`);
  process.exitCode = 1; // not process.exit(): open fetch handles crash Node on Windows
});
