import { describe, expect, it } from "vitest";

import {
  CODE_ALPHABET,
  displayName,
  normaliseGroupCode,
  pickUniqueCode,
  randomCode,
  validateName,
} from "./participant";

describe("validateName", () => {
  it.each(["Ana", "Ana Silva", "José da Costa", "Mary-Jane O'Neil", "D’Angelo", "Zoë", "Lê Văn"])(
    "accepts %s",
    (name) => {
      expect(validateName(name)).toEqual({ ok: true, name });
    },
  );

  it("trims and collapses spaces", () => {
    expect(validateName("  Ana    Silva ")).toEqual({ ok: true, name: "Ana Silva" });
  });

  it.each([
    ["A", "at least 2"],
    ["A".repeat(41), "at most 40"],
    ["", "Enter a name"],
    ["   ", "Enter a name"],
    ["Ana2", "letters"],
    ["<script>", "letters"],
    ["ana@mail.com", "letters"],
    ["-Ana", "start with a letter"],
    ["Ana ' Silva", "start with a letter"],
  ])("rejects %j", (name, message) => {
    const result = validateName(name);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(message);
  });

  it("accepts exactly 2 and exactly 40 characters", () => {
    expect(validateName("Al").ok).toBe(true);
    expect(validateName("A".repeat(40)).ok).toBe(true);
  });

  it.each(["Fuck", "ana SHIT", "Fuuuck You", "Merda", "Admin", "Porra Silva", "Cú"])(
    "rejects the blocked word in %j",
    (name) => {
      const result = validateName(name);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toBe("Please choose a different name.");
    },
  );

  it("does not block words that only contain a blocked word", () => {
    expect(validateName("Cassandra Hassan").ok).toBe(true);
    expect(validateName("Scunthorpe").ok).toBe(true);
  });
});

describe("displayName", () => {
  it.each([
    ["Ana Silva", "Ana S."],
    ["Maria", "Maria"],
    ["José da Costa", "José C."],
    ["  Ana   Silva  ", "Ana S."],
    ["ana silva", "Ana S."],
    ["Mary-Jane O'Neil", "Mary-Jane O."],
    ["Élodie émile", "Élodie É."],
  ])("%j → %j", (name, expected) => {
    expect(displayName(name)).toBe(expected);
  });
});

describe("codes", () => {
  it("uses an alphabet without 0, O, 1, I or L", () => {
    for (const ambiguous of ["0", "O", "1", "I", "L"]) {
      expect(CODE_ALPHABET).not.toContain(ambiguous);
    }
  });

  it("generates 4 characters from the alphabet", () => {
    for (let i = 0; i < 1000; i++) {
      expect(randomCode()).toMatch(new RegExp(`^[${CODE_ALPHABET}]{4}$`));
    }
  });

  it("gives 10,000 codes for the same name with no duplicates", async () => {
    const taken = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const code = await pickUniqueCode(async (candidate) => taken.has(candidate));
      expect(taken.has(code)).toBe(false);
      taken.add(code);
    }
    expect(taken.size).toBe(10_000);
  });

  it("retries on collision and gives up after the attempt limit", async () => {
    const sequence = ["AAAA", "AAAA", "BBBB"];
    const random = () => sequence.shift() ?? "CCCC";
    expect(await pickUniqueCode(async (code) => code === "AAAA", random)).toBe("BBBB");
    await expect(
      pickUniqueCode(
        async () => true,
        () => "AAAA",
      ),
    ).rejects.toThrow(/no free code/);
  });
});

describe("normaliseGroupCode", () => {
  it("is optional", () => {
    expect(normaliseGroupCode(undefined)).toEqual({ ok: true, groupCode: null });
    expect(normaliseGroupCode("  ")).toEqual({ ok: true, groupCode: null });
  });

  it("uppercases and trims", () => {
    expect(normaliseGroupCode(" turma-3b ")).toEqual({ ok: true, groupCode: "TURMA-3B" });
  });

  it.each(["a b", "<x>", "X".repeat(21), "ção"])("rejects %j", (code) => {
    expect(normaliseGroupCode(code).ok).toBe(false);
  });
});
