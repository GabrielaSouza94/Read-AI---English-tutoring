import { describe, expect, it } from "vitest";

import { estimatedMinutes, parseTestId, stepCount } from "./catalog";

describe("parseTestId", () => {
  it.each([
    ["1", 1],
    ["4", 4],
    ["12", 12],
    ["0", null],
    ["-1", null],
    ["1.5", null],
    ["abc", null],
    ["", null],
    [null, null],
    ["1e3", null],
  ])("%j → %j", (value, id) => {
    expect(parseTestId(value)).toBe(id);
  });
});

describe("test catalogue", () => {
  it("has n progressive steps plus 2 full reads", () => {
    expect(stepCount(5)).toBe(7);
    expect(stepCount(7)).toBe(9);
  });

  it.each([
    [5, 6],
    [6, 7],
    [7, 8],
  ])(
    "estimates %i sentences at about %i minutes, within the walkthrough's 5 to 8",
    (n, minutes) => {
      expect(estimatedMinutes(n)).toBe(minutes);
    },
  );
});
