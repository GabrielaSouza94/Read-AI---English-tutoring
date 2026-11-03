import { describe, expect, it } from "vitest";

import { adminSeedStatement, contentSeedStatements } from "./seed";
import { SEED_TESTS, sentenceId } from "./seed-data";

// TRD §4.6 and §4.9. If a value changes during calibration, update the TRD and this table together.
const TRD_TABLE = [
  { id: 1, cefr: "A2", sentences: 5, words: 55, wcpm: 60, accuracy: 85, fluency: 60, retries: 3 },
  { id: 2, cefr: "B1", sentences: 6, words: 81, wcpm: 80, accuracy: 85, fluency: 65, retries: 3 },
  { id: 3, cefr: "B2", sentences: 6, words: 91, wcpm: 100, accuracy: 88, fluency: 70, retries: 2 },
  { id: 4, cefr: "C1", sentences: 7, words: 114, wcpm: 120, accuracy: 90, fluency: 75, retries: 2 },
];

describe("seed data", () => {
  it.each(TRD_TABLE)("test $id matches the TRD table", (row) => {
    const test = SEED_TESTS.find((t) => t.id === row.id);
    expect(test).toBeDefined();
    expect({
      cefr: test?.cefr,
      sentences: test?.sentences.length,
      words: test?.sentences.join(" ").split(/\s+/).length,
      wcpm: test?.fluencyThreshold,
      accuracy: test?.accuracyThreshold,
      fluency: test?.fluencyScoreThreshold,
      retries: test?.maxAttemptsPerStep,
    }).toEqual({
      cefr: row.cefr,
      sentences: row.sentences,
      words: row.words,
      wcpm: row.wcpm,
      accuracy: row.accuracy,
      fluency: row.fluency,
      retries: row.retries,
    });
  });

  it("has exactly the four tests and 24 sentences", () => {
    expect(SEED_TESTS.map((t) => t.id)).toEqual([1, 2, 3, 4]);
    expect(SEED_TESTS.flatMap((t) => t.sentences)).toHaveLength(24);
  });

  it("uses the starting mismatch limits from TRD §4.9", () => {
    for (const test of SEED_TESTS) {
      expect([test.mismatchAccuracyGap, test.mismatchWcpmPct]).toEqual([15, 25]);
    }
  });

  it("follows the content rules: no digits, 5-7 sentences", () => {
    for (const test of SEED_TESTS) {
      expect(test.sentences.join(" ")).not.toMatch(/\d/);
      expect(test.sentences.length).toBeGreaterThanOrEqual(5);
      expect(test.sentences.length).toBeLessThanOrEqual(7);
    }
  });

  it("gives every sentence a stable id", () => {
    expect(sentenceId(2, 3)).toBe(203);
  });
});

describe("seed statements", () => {
  it("are upserts, one per test and sentence", () => {
    const statements = contentSeedStatements();
    expect(statements).toHaveLength(4 + 24);
    for (const statement of statements) expect(statement).toMatch(/ON CONFLICT \(id\) DO UPDATE/);
  });

  it("escape apostrophes in story text", () => {
    const sql = contentSeedStatements().join("\n");
    expect(sql).toContain("'The Mapmaker''s Problem'");
    expect(sql).toContain("farmers'' market");
  });

  it("normalise the admin email and store only the hash", () => {
    const statement = adminSeedStatement(
      "  Admin@Example.com ",
      "pbkdf2_sha256$1$c2FsdA==$aGFzaA==",
    );
    expect(statement).toContain("'admin@example.com'");
    expect(statement).toContain(
      "ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash",
    );
  });
});
