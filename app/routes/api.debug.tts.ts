/**
 * T0.5 spike: GET /api/debug/tts?test=4&from=1&to=6&rate=-20%&pauseMs=600 returns a 16 kHz mono
 * WAV of the sentences read by an Azure neural voice, as fixture audio. Not in production.
 */
import { env } from "cloudflare:workers";

import { loadSpeechConfig } from "~/lib/config";
import { callWithRetry } from "~/lib/http";
import { spikeGuard, spikeSentences } from "~/lib/spike";

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function loader({ request }: { request: Request }) {
  const blocked = await spikeGuard(env.APP_ENV, env.KV);
  if (blocked) return blocked;
  const url = new URL(request.url);
  const sentences = spikeSentences(url);
  if (sentences instanceof Response) return sentences;

  const { azureSpeechKey, azureSpeechRegion } = loadSpeechConfig(
    env as unknown as Record<string, unknown>,
  );
  const rateParam = url.searchParams.get("rate") ?? "";
  const rate = /^[+-]?\d{1,2}%$/.test(rateParam) ? rateParam : "0%";
  const pauseMs = Math.min(Number(url.searchParams.get("pauseMs") ?? 400) || 0, 5000);
  const voice = url.searchParams.get("voice") === "male" ? "en-US-AndrewNeural" : "en-US-AvaNeural";
  const body = sentences.map(escapeXml).join(`<break time="${pauseMs}ms"/>`);
  const ssml = `<speak version="1.0" xml:lang="en-US"><voice name="${voice}"><prosody rate="${rate}">${body}</prosody></voice></speak>`;

  const response = await callWithRetry(
    "azure-tts",
    `https://${azureSpeechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": azureSpeechKey,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "riff-16khz-16bit-mono-pcm",
        "User-Agent": "read-ai-spike",
      },
      body: ssml,
    },
    { timeoutMs: 30_000 },
  );
  return new Response(response.body, { headers: { "Content-Type": "audio/wav" } });
}
