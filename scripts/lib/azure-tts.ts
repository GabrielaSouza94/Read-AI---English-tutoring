/**
 * Azure neural text to speech for the offline scripts (instruction audio, T2.4; fixtures, T3.8).
 * AZURE_SPEECH_KEY and AZURE_SPEECH_REGION come from the environment, or else from .dev.vars.
 * The key is never printed.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import { callWithRetry } from "../../app/lib/http";

const ROOT = join(import.meta.dirname, "..", "..");

export const VOICE = "en-US-AvaNeural";

export type TtsFormat = "audio-24khz-48kbitrate-mono-mp3" | "riff-16khz-16bit-mono-pcm";

export function loadAzureSpeech(): { key: string; region: string } | null {
  const devVars = join(ROOT, ".dev.vars");
  if (!process.env.AZURE_SPEECH_KEY && existsSync(devVars)) process.loadEnvFile(devVars);
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  return key && region ? { key, region } : null;
}

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** SSML for `text`; with `wordBreakMs`, a pause after every word (for slow-reading fixtures). */
export function ssml(
  text: string,
  { rate = "0%", wordBreakMs }: { rate?: string; wordBreakMs?: number } = {},
) {
  const body = wordBreakMs
    ? text.split(/\s+/).map(escapeXml).join(`<break time="${wordBreakMs}ms"/> `)
    : escapeXml(text);
  return `<speak version="1.0" xml:lang="en-US"><voice name="${VOICE}"><prosody rate="${rate}">${body}</prosody></voice></speak>`;
}

export async function synthesise(
  account: { key: string; region: string },
  markup: string,
  format: TtsFormat,
): Promise<Uint8Array<ArrayBuffer>> {
  const response = await callWithRetry(
    "azure-tts",
    `https://${account.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": account.key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": format,
        "User-Agent": "read-ai-scripts",
      },
      body: markup,
    },
    { timeoutMs: 20_000 },
  );
  return new Uint8Array(await response.arrayBuffer());
}
