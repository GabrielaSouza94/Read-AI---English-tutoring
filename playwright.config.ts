import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { defineConfig, devices } from "@playwright/test";

import { encodeWav } from "./app/lib/wav";

const PORT = 4173;

/**
 * Chromium's built-in fake microphone only beeps briefly twice a second, which sits right at the
 * microphone check's threshold. Instead it plays this file on a loop: 0.6 s of a voice-like tone,
 * then 0.4 s of silence, like speech with pauses. Written at startup, so nothing binary is committed.
 */
function fakeVoiceFile(): string {
  const rate = 16_000;
  const samples = new Float32Array(rate * 2);
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    const voiced = t % 1 < 0.6;
    const tone = Math.sin(2 * Math.PI * 180 * t) + 0.5 * Math.sin(2 * Math.PI * 360 * t);
    samples[i] = voiced ? 0.2 * tone : 0;
  }
  const path = join(tmpdir(), "read-ai-fake-voice.wav");
  writeFileSync(path, encodeWav([samples], rate));
  return path;
}

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // One test at a time in CI: fake microphones, audio and the Worker share a small runner, and
  // parallel Firefox runs there time out (T2.2). Locally, Playwright picks the worker count.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  // Chromium and Firefox get a fake microphone (Chromium plays the file above, Firefox a tone) with the
  // permission already granted, for the recorder tests (T2.2). WebKit has no fake device.
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["microphone"],
        launchOptions: {
          args: [
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
            `--use-file-for-fake-audio-capture=${fakeVoiceFile()}`,
          ],
        },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        launchOptions: {
          firefoxUserPrefs: {
            "media.navigator.streams.fake": true,
            "media.navigator.permission.disabled": true,
          },
        },
      },
    },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  // `vite preview` serves the production build inside the local workerd runtime.
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
