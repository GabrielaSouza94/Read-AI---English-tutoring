/**
 * Generates the participant instruction audio (T2.4) with an Azure neural voice and writes it to
 * public/audio/, where the page loads it by relative URL. Run it again after changing a text.
 *
 *   npm run audio:instructions
 *
 * AZURE_SPEECH_KEY and AZURE_SPEECH_REGION come from the environment, or else from .dev.vars.
 * The key is never printed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ProviderError } from "../app/lib/http";
import { loadAzureSpeech, ssml, synthesise } from "./lib/azure-tts";

const OUT_DIR = join(import.meta.dirname, "..", "public", "audio");

/** File name → what the voice says. Plain adult tone (TR-07). */
export const INSTRUCTIONS = {
  "word-review-instruction.mp3":
    "Some words are highlighted. Click each one to mark it as reviewed. Then record the text again.",
};

async function main() {
  const account = loadAzureSpeech();
  if (!account) {
    console.error(
      "AZURE_SPEECH_KEY and AZURE_SPEECH_REGION must be set (environment or .dev.vars).",
    );
    process.exitCode = 1;
    return;
  }
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [file, text] of Object.entries(INSTRUCTIONS)) {
    const audio = await synthesise(
      account,
      ssml(text, { rate: "-5%" }),
      "audio-24khz-48kbitrate-mono-mp3",
    );
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
