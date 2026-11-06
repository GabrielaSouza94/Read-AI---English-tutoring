/**
 * The test picker's list (T2.1, TR-06): the 4 tests from easiest to hardest, with their sentence
 * count and an estimated time. Runtime-neutral: the integration test runs it against Miniflare D1.
 */
import type { D1Like } from "./metrics";

export type TestCard = {
  id: number;
  cefr: string;
  title: string;
  sentences: number;
  minutes: number;
};

/** n progressive steps (one more sentence each time) plus 2 full reads of the story. */
export function stepCount(sentences: number): number {
  return sentences + 2;
}

// About 45 seconds per step (listen, read, see the result), plus a minute for the microphone check.
const SECONDS_PER_STEP = 45;
const MIC_CHECK_SECONDS = 60;

/** Whole minutes: 6 for test 1 up to 8 for test 4, matching the walkthrough's "5 to 8 minutes". */
export function estimatedMinutes(sentences: number): number {
  return Math.round((stepCount(sentences) * SECONDS_PER_STEP + MIC_CHECK_SECONDS) / 60);
}

export type TestSummary = Pick<TestCard, "id" | "cefr" | "title">;

/** One test by id, or null for an unknown id. */
export async function getTest(db: D1Like, id: number): Promise<TestSummary | null> {
  return db
    .prepare("SELECT id, cefr, title FROM tests WHERE id = ?1")
    .bind(id)
    .first<TestSummary>();
}

/** The `testId` query value as a test id, or null when it is not a positive whole number. */
export function parseTestId(value: string | null): number | null {
  return value !== null && /^[1-9]d{0,5}$/.test(value) ? Number(value) : null;
}

export async function listTests(db: D1Like): Promise<TestCard[]> {
  const { results } = await db
    .prepare(
      `SELECT t.id, t.cefr, t.title, count(s.id) AS sentences
       FROM tests t LEFT JOIN sentences s ON s.test_id = t.id
       GROUP BY t.id ORDER BY t.level, t.id`,
    )
    .bind()
    .all<{ id: number; cefr: string; title: string; sentences: number }>();
  return results.map((row) => ({ ...row, minutes: estimatedMinutes(row.sentences) }));
}
