import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { AA_NON_TEXT, AA_TEXT, contrastRatio, themeColors } from "../app/lib/contrast";

const colors = themeColors(readFileSync(new URL("../app/app.css", import.meta.url), "utf8"));

// Text and background pairs the UI uses. Every pair must pass WCAG 2.1 AA (manual check in T1.1, automated here).
const TEXT_PAIRS: [text: string, background: string][] = [
  ["gray-900", "white"],
  ["gray-800", "white"],
  ["gray-600", "white"],
  ["gray-500", "white"],
  ["gray-600", "gray-50"],
  ["gray-500", "gray-50"],
  ["primary", "white"],
  ["primary-hover", "white"],
  ["white", "primary"],
  ["white", "primary-hover"],
  ["white", "primary-dark"],
  ["primary-dark", "primary-light"],
  ["banner-text", "banner"],
  ["success", "white"],
  ["success", "success-light"],
  ["warning", "white"],
  ["warning", "warning-light"],
  ["danger", "white"],
  ["danger", "danger-light"],
  // Disabled button.
  ["gray-700", "gray-300"],
];

// Focus rings, input borders and other UI parts need 3:1 against the page (WCAG 1.4.11).
const NON_TEXT_PAIRS: [part: string, background: string][] = [
  ["focus", "white"],
  ["focus", "banner"],
  ["input-border", "white"],
  ["recording", "white"],
];

describe("theme tokens meet WCAG AA", () => {
  it.each(TEXT_PAIRS)("text %s on %s is at least 4.5:1", (fg, bg) => {
    expect(colors[fg], `--color-${fg}`).toBeDefined();
    expect(colors[bg], `--color-${bg}`).toBeDefined();
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(NON_TEXT_PAIRS)("%s on %s is at least 3:1", (fg, bg) => {
    expect(colors[fg], `--color-${fg}`).toBeDefined();
    expect(colors[bg], `--color-${bg}`).toBeDefined();
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});
