import { describe, expect, it } from "vitest";

import { alignWords, normaliseWord, referenceWords, spokenIndexByReference } from "./align";

describe("normaliseWord", () => {
  it.each([
    ["Don't,", "don't"],
    ["“Hello!”", "hello"],
    ["Maria’s", "maria's"],
    ["—", ""],
  ])("%j → %j", (input, expected) => {
    expect(normaliseWord(input)).toBe(expected);
  });
});

describe("alignWords", () => {
  const reference = referenceWords("Maria takes the bus to work.");

  it("matches a perfect read", () => {
    const ops = alignWords(reference, ["maria", "takes", "the", "bus", "to", "work"]);
    expect(ops.every((op) => op.op === "match")).toBe(true);
  });

  it("finds omissions, insertions and substitutions", () => {
    const ops = alignWords(reference, ["maria", "um", "takes", "a", "bus", "work"]);
    expect(ops.map((op) => op.op)).toEqual([
      "match",
      "insertion",
      "match",
      "substitution",
      "match",
      "omission",
      "match",
    ]);
    expect(spokenIndexByReference(ops, reference.length)).toEqual([0, 2, 3, 4, null, 5]);
  });

  it("handles an empty read", () => {
    expect(spokenIndexByReference(alignWords(reference, []), reference.length)).toEqual(
      Array(6).fill(null),
    );
  });
});
