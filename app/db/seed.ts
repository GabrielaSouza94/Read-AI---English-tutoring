/**
 * Builds the seed as SQL statements, so the same seed runs against local D1, remote D1 (through
 * `wrangler d1 execute --file`) and the Miniflare database in integration tests.
 *
 * Every statement is an upsert keyed on a stable id, so the seed can run any number of times:
 * a second run changes nothing, and edited values in seed-data.ts overwrite the old ones.
 */
import { SEED_TESTS, sentenceId, type SeedTest } from "./seed-data";

/** SQL literal for trusted seed values. Not for user input: use bound parameters for that. */
function literal(value: string | number): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Cannot seed a non-finite number: ${value}`);
    return String(value);
  }
  return `'${value.replaceAll("'", "''")}'`;
}

function upsert(
  table: string,
  conflictColumns: string[],
  row: Record<string, string | number>,
): string {
  const columns = Object.keys(row);
  const updates = columns
    .filter((column) => !conflictColumns.includes(column))
    .map((column) => `${column} = excluded.${column}`);
  return (
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map((c) => literal(row[c])).join(", ")}) ` +
    `ON CONFLICT (${conflictColumns.join(", ")}) DO UPDATE SET ${updates.join(", ")};`
  );
}

function testStatements(test: SeedTest): string[] {
  return [
    upsert("tests", ["id"], {
      id: test.id,
      title: test.title,
      level: test.level,
      cefr: test.cefr,
      fluency_threshold: test.fluencyThreshold,
      accuracy_threshold: test.accuracyThreshold,
      fluency_score_threshold: test.fluencyScoreThreshold,
      max_attempts_per_step: test.maxAttemptsPerStep,
      mismatch_accuracy_gap: test.mismatchAccuracyGap,
      mismatch_wcpm_pct: test.mismatchWcpmPct,
    }),
    ...test.sentences.map((content, index) =>
      upsert("sentences", ["id"], {
        id: sentenceId(test.id, index + 1),
        test_id: test.id,
        content,
        sequence_number: index + 1,
      }),
    ),
  ];
}

/** The tests and their sentences. Safe to run on every deploy. */
export function contentSeedStatements(tests: SeedTest[] = SEED_TESTS): string[] {
  return tests.flatMap(testStatements);
}

/** Creates the admin account, or resets its password if the email already exists. */
export function adminSeedStatement(email: string, passwordHash: string): string {
  return upsert("admins", ["email"], {
    email: email.trim().toLowerCase(),
    password_hash: passwordHash,
  });
}
