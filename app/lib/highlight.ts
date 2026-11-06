/**
 * Word highlighting (T2.4; BR-07, TR-07). The scorer returns the words to practise in text order;
 * they are matched to the step's text by position, ignoring capitals and punctuation, so that
 * "farmers'" in the story matches "farmers" from the scorer and a repeated word marks the right
 * occurrence.
 */

export type TextToken = {
  text: string;
  /** The word's position among the words of the text, or null for spaces. */
  wordIndex: number | null;
};

/** The text as words and the spaces between them; joining every token gives the text back. */
export function tokenize(text: string): TextToken[] {
  let words = 0;
  return text
    .split(/(\s+)/)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, wordIndex: /^\s+$/.test(part) ? null : words++ }));
}

/** Lowercase letters and digits only: "Morning." → "morning", "farmers'" → "farmers". */
export function wordKey(word: string): string {
  return word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * The word positions to highlight. Each scorer word takes the next unused matching word after the
 * previous match; if there is none, the first unused match anywhere. Unknown words are ignored.
 */
export function matchHighlights(text: string, words: string[]): number[] {
  const keys = tokenize(text)
    .filter((token) => token.wordIndex !== null)
    .map((token) => wordKey(token.text));
  const used = new Set<number>();
  let cursor = 0;
  const find = (key: string, from: number) =>
    keys.findIndex((k, i) => i >= from && k === key && !used.has(i));

  for (const word of words) {
    const key = wordKey(word);
    if (key === "") continue;
    let index = find(key, cursor);
    if (index === -1) index = find(key, 0);
    if (index === -1) continue;
    used.add(index);
    cursor = index + 1;
  }
  return [...used].sort((a, b) => a - b);
}
