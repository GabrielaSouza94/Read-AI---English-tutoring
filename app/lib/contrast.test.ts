import { describe, expect, it } from "vitest";

import { contrastRatio, themeColors } from "./contrast";

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for a colour on itself", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#2563eb", "#2563EB")).toBe(1);
  });

  it("is symmetric and accepts short hex", () => {
    expect(contrastRatio("#fff", "#2563EB")).toBeCloseTo(contrastRatio("#2563EB", "#ffffff"), 10);
    expect(contrastRatio("#2563EB", "#fff")).toBeCloseTo(5.17, 2);
  });

  it("rejects colours that are not hex", () => {
    expect(() => contrastRatio("blue", "#fff")).toThrow(/hex colour/);
  });
});

describe("themeColors", () => {
  it("reads --color-* hex tokens from the @theme block", () => {
    expect(themeColors("@theme {\n  --color-primary: #2563EB;\n  --font-sans: x;\n}")).toEqual({
      primary: "#2563EB",
    });
  });
});
