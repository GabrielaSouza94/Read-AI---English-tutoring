import { describe, expect, it } from "vitest";

import { environmentLabel } from "./environment";

describe("environmentLabel", () => {
  it.each([
    ["local", "Local development"],
    ["staging", "Staging"],
    ["production", "Production"],
  ])("labels %s", (appEnv, label) => {
    expect(environmentLabel(appEnv)).toBe(label);
  });

  it("reports an unknown environment instead of hiding it", () => {
    expect(environmentLabel("prod")).toBe("Unknown environment (prod)");
  });
});
