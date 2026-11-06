import { describe, expect, it } from "vitest";

import { matchHighlights, tokenize, wordKey } from "./highlight";

const SENTENCE = "Maria takes the bus to work every morning.";

/** The highlighted words as they appear in the text. */
const shown = (text: string, words: string[]) => {
  const tokens = tokenize(text).filter((t) => t.wordIndex !== null);
  return matchHighlights(text, words).map((i) => tokens[i].text);
};

describe("tokenize", () => {
  it("keeps the text exactly, splitting words from spaces", () => {
    const tokens = tokenize("The farmers'  market.");
    expect(tokens.map((t) => t.text).join("")).toBe("The farmers'  market.");
    expect(tokens.filter((t) => t.wordIndex !== null).map((t) => [t.text, t.wordIndex])).toEqual([
      ["The", 0],
      ["farmers'", 1],
      ["market.", 2],
    ]);
  });
});

describe("wordKey", () => {
  it("ignores capitals, punctuation and apostrophes", () => {
    expect(wordKey("Morning.")).toBe("morning");
    expect(wordKey("farmers'")).toBe(wordKey("farmers"));
    expect(wordKey("don't")).toBe(wordKey("dont"));
    expect(wordKey("“Hello,”")).toBe("hello");
    expect(wordKey("José")).toBe("josé");
  });
});

describe("matchHighlights", () => {
  it("finds words by position, case-insensitive, punctuation stripped", () => {
    expect(matchHighlights(SENTENCE, ["maria", "BUS", "morning"])).toEqual([0, 3, 7]);
    expect(shown(SENTENCE, ["maria", "BUS", "morning"])).toEqual(["Maria", "bus", "morning."]);
  });

  it('matches "farmers\'" in the text with "farmers" from the scorer, and the reverse', () => {
    expect(shown("The farmers' market opens early.", ["farmers"])).toEqual(["farmers'"]);
    expect(shown("The farmers market opens early.", ["farmers'"])).toEqual(["farmers"]);
  });

  it("handles repeated words in text order", () => {
    const text = "The cat saw the dog and the bird.";
    expect(matchHighlights(text, ["the"])).toEqual([0]);
    expect(matchHighlights(text, ["the", "the"])).toEqual([0, 3]);
    expect(matchHighlights(text, ["dog", "the"])).toEqual([4, 6]);
    expect(matchHighlights(text, ["the", "the", "the", "the"])).toEqual([0, 3, 6]);
  });

  it("still finds a word listed out of order", () => {
    expect(matchHighlights(SENTENCE, ["morning", "Maria"])).toEqual([0, 7]);
  });

  it("ignores words that are not in the text, empty strings and duplicates beyond the text", () => {
    expect(matchHighlights(SENTENCE, ["umbrella", "", "...", "bus"])).toEqual([3]);
    expect(matchHighlights(SENTENCE, [])).toEqual([]);
  });
});
