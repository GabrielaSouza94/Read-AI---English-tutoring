import { expect, test, type Page } from "@playwright/test";

import { passMicCheck, startAsParticipant } from "./helpers";

const WAV_HEADER_BYTES = 44;
const BYTES_PER_SECOND = 16_000 * 2; // 16 kHz, 16-bit, mono

/** The recording's bytes, read back from the <audio> element's blob URL. */
async function recordedWav(page: Page) {
  const src = await page.getByLabel("Your recording").getAttribute("src");
  if (!src?.startsWith("blob:")) throw new Error(`expected a blob URL, got ${src}`);
  return page.evaluate<{ size: number; header: number[] }, string>(async (url) => {
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    return { size: bytes.length, header: Array.from(bytes.subarray(0, 44)) };
  }, src);
}

function readHeader(header: number[]) {
  const view = new DataView(Uint8Array.from(header).buffer);
  const text = (offset: number) => String.fromCharCode(...header.slice(offset, offset + 4));
  return {
    riff: text(0),
    wave: text(8),
    format: view.getUint16(20, true),
    channels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    bitsPerSample: view.getUint16(34, true),
    dataLength: view.getUint32(40, true),
  };
}

// Playwright's WebKit has no audio capture at all (the page reports an unsupported browser), so the
// microphone tests run in Chromium and Firefox. Safari is checked by hand (T2.2 manual test).
test.describe("with a microphone", () => {
  test.skip(
    ({ browserName }) => browserName === "webkit",
    "WebKit in Playwright cannot capture audio",
  );

  test("microphone check, then a 5-second recording gives a 16 kHz mono WAV", async ({ page }) => {
    await startAsParticipant(page);
    await page.goto("/assessment?testId=1");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Lost Umbrella");

    await passMicCheck(page);
    await page.getByRole("button", { name: "Begin the test" }).click();

    await page.getByRole("button", { name: "Record", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText(/^Recording 0:0\d$/);
    await expect(page.getByRole("meter", { name: "Microphone level" })).toBeVisible();
    await page.waitForTimeout(5000);
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByRole("status")).toHaveText(/^Recording ready: 0:0[45]\./);

    const wav = await recordedWav(page);
    const header = readHeader(wav.header);
    expect(header).toMatchObject({
      riff: "RIFF",
      wave: "WAVE",
      format: 1,
      channels: 1,
      sampleRate: 16_000,
      bitsPerSample: 16,
    });
    expect(header.dataLength).toBe(wav.size - WAV_HEADER_BYTES);
    // 5 seconds, give or take the time the clicks take.
    expect(wav.size).toBeGreaterThan(WAV_HEADER_BYTES + 4.5 * BYTES_PER_SECOND);
    expect(wav.size).toBeLessThan(WAV_HEADER_BYTES + 6 * BYTES_PER_SECOND);

    await page.getByRole("button", { name: "Record again" }).click();
    await expect(page.getByRole("status")).toHaveText("Press Record when you are ready.");
    await expect(page.getByLabel("Your recording")).toHaveCount(0);
  });

  test("the microphone check is not repeated after a reload", async ({ page }) => {
    await startAsParticipant(page);
    await page.goto("/assessment?testId=2");
    await passMicCheck(page);
    await page.reload();
    await expect(page.getByRole("button", { name: "Begin the test" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Check my microphone" })).toHaveCount(0);
  });

  for (const [name, title] of [
    ["NotAllowedError", "Read AI cannot use your microphone."],
    ["NotFoundError", "No microphone was found."],
  ] as const) {
    test(`${name} shows what to do`, async ({ page }) => {
      await page.addInitScript({
        content: `navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("", "${name}"));`,
      });
      await startAsParticipant(page);
      await page.goto("/assessment?testId=1");
      await page.getByRole("button", { name: "Check my microphone" }).click();

      const alert = page.getByRole("alert");
      await expect(alert).toContainText(title);
      if (name === "NotAllowedError") await expect(alert).toContainText("set Microphone to Allow");
      await alert.getByRole("button", { name: "Try again" }).click();
      await expect(page.getByRole("button", { name: "Check my microphone" })).toBeVisible();
    });
  }
});

test("a browser that cannot record says so", async ({ page }) => {
  await page.addInitScript({ content: "delete window.AudioWorkletNode;" });
  await startAsParticipant(page);
  await page.goto("/assessment?testId=1");
  await page.getByRole("button", { name: "Check my microphone" }).click();
  await expect(page.getByRole("alert")).toContainText("This browser cannot record audio.");
});

test("an unknown test is not found, and no session redirects to /start", async ({ page }) => {
  await page.goto("/assessment?testId=1");
  await expect(page).toHaveURL(/\/start$/);

  await startAsParticipant(page);
  for (const testId of ["99", "abc"]) {
    const response = await page.goto(`/assessment?testId=${testId}`);
    expect(response?.status()).toBe(404);
  }
});
