/**
 * Generates the participant instruction audio (T2.4) with an Azure neural voice and writes it to
 * public/audio/, where the page loads it by relative URL. Run it again after changing a text.
 *
 *   npm run audio:instructions
 *
 * AZURE_SPEECH_KEY and AZURE_SPEECH_REGION come from the environment, or else from .dev.vars.
 * The key is never printed.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { callWithRetry, ProviderError } from "../app/lib/http";

const ROOT = join(import.meta.dirname, "..");
const OUT_DIR = join(ROOT, "public", "audio");

/** File name → what the voice says. Plain adult tone (TR-07). */
export const INSTRUCTIONS = {
  "word-review-instruction.mp3":
    "Some words are highlighted. Click each one to mark it as reviewed. Then record the text again.",
};

const VOICE = "en-US-AvaNeural";
const RATE = "-5%";

const devVars = join(ROOT, ".dev.vars");
if (!process.env.AZURE_SPEECH_KEY && existsSync(devVars)) process.loadEnvFile(devVars);
const key = process.env.AZURE_SPEECH_KEY;
const region = process.env.AZURE_SPEECH_REGION;

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function synthesise(text: string): Promise<Uint8Array> {
  const ssml = `<speak version="1.0" xml:lang="en-US"><voice name="${VOICE}"><prosody rate="${RATE}">${escapeXml(text)}</prosody></voice></speak>`;
  const response = await callWithRetry(
    "azure-tts",
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key ?? "",
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "read-ai-instruction-audio",
      },
      body: ssml,
    },
    { timeoutMs: 20_000 },
  );
  return new Uint8Array(await response.arrayBuffer());
}

async function main() {
  if (!key || !region) {
    console.error(
      "AZURE_SPEECH_KEY and AZURE_SPEECH_REGION must be set (environment or .dev.vars).",
    );
    process.exitCode = 1;
    return;
  }
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [file, text] of Object.entries(INSTRUCTIONS)) {
    const audio = await synthesise(text);
    writeFileSync(join(OUT_DIR, file), audio);
    console.log(`public/audio/${file}: ${audio.length} bytes`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof ProviderError ? error.message : String(error);
  console.error(`Instruction audio failed: ${message}`);
  if (error instanceof ProviderError && (error.status === 401 || error.status === 403)) {
    console.error("Check AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .dev.vars.");
  }
  process.exitCode = 1; // not process.exit(): open fetch handles crash Node on Windows
});
