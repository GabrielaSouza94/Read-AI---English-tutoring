/** WCAG 2.1 AA minimums: normal text, and UI parts such as focus rings and input borders. */
export const AA_TEXT = 4.5;
export const AA_NON_TEXT = 3;

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function channels(hex: string): [number, number, number] {
  const match = HEX.exec(hex);
  if (!match) throw new Error(`not a hex colour: ${hex}`);
  let digits = match[1];
  if (digits.length === 3) digits = [...digits].map((d) => d + d).join("");
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}

/** Relative luminance as defined by WCAG 2.1. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two hex colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** The hex `--color-*` tokens declared in a stylesheet's `@theme` block, keyed without the prefix. */
export function themeColors(css: string): Record<string, string> {
  const theme = /@theme\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
  const colors: Record<string, string> = {};
  for (const [, name, value] of theme.matchAll(/--color-([\w-]+)\s*:\s*(#[0-9a-f]+)\s*;/gi)) {
    colors[name] = value;
  }
  return colors;
}
