/**
 * T2.1: the test picker's list, from the seeded tests and sentences.
 */
import { afterEach, beforeEach, expect, it } from "vitest";

import { contentSeedStatements } from "../app/db/seed";
import { getTest, listTests } from "../app/lib/catalog";
import { applyMigrations, createTestDatabase, runStatements, type TestD1 } from "./d1";

let db: TestD1;
let dispose: () => Promise<void>;

beforeEach(async () => {
  ({ db, dispose } = await createTestDatabase());
  await applyMigrations(db);
  await runStatements(db, contentSeedStatements());
});

afterEach(async () => {
  await dispose();
});

it("lists the 4 tests from easiest to hardest, with sentence counts and time", async () => {
  expect(await listTests(db)).toEqual([
    { id: 1, cefr: "A2", title: "The Lost Umbrella", sentences: 5, minutes: 6 },
    { id: 2, cefr: "B1", title: "A Market Morning", sentences: 6, minutes: 7 },
    { id: 3, cefr: "B2", title: "The Night Shift", sentences: 6, minutes: 7 },
    { id: 4, cefr: "C1", title: "The Mapmaker's Problem", sentences: 7, minutes: 8 },
  ]);
});

it("finds one test with its retry limit and sentences in order, and null for an unknown one", async () => {
  const test = await getTest(db, 4);
  expect(test).toMatchObject({
    id: 4,
    cefr: "C1",
    title: "The Mapmaker's Problem",
    maxAttemptsPerStep: 2,
  });
  expect(test?.sentences.map((s) => s.id)).toEqual([401, 402, 403, 404, 405, 406, 407]);
  expect((await getTest(db, 1))?.maxAttemptsPerStep).toBe(3);
  expect(await getTest(db, 99)).toBeNull();
});
