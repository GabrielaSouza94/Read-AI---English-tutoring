import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { adminSeedStatement, contentSeedStatements } from "../app/db/seed";
import { applyMigrations, count, createTestDatabase, runStatements, type TestD1 } from "./d1";

const ROOT = join(import.meta.dirname, "..");
let db: TestD1;
let dispose: () => Promise<void>;

beforeEach(async () => {
  ({ db, dispose } = await createTestDatabase());
  await applyMigrations(db);
});

afterEach(async () => {
  await dispose();
});

describe("migrations and seed", () => {
  it("seeds 4 tests and 24 sentences, and a second run changes nothing", async () => {
    await runStatements(db, contentSeedStatements());
    await runStatements(db, contentSeedStatements());

    expect(await count(db, "tests")).toBe(4);
    expect(await count(db, "sentences")).toBe(24);
    const umbrella = await db
      .prepare("SELECT title, fluency_threshold, max_attempts_per_step FROM tests WHERE id = 1")
      .first();
    expect(umbrella).toEqual({
      title: "The Lost Umbrella",
      fluency_threshold: 60,
      max_attempts_per_step: 3,
    });
  });

  it("creates one admin, and re-seeding the same email only replaces the hash", async () => {
    await runStatements(db, [adminSeedStatement("admin@example.com", "hash-one")]);
    await runStatements(db, [adminSeedStatement("Admin@Example.com", "hash-two")]);

    expect(await count(db, "admins")).toBe(1);
    expect(await db.prepare("SELECT password_hash FROM admins").first("password_hash")).toBe(
      "hash-two",
    );
  });
});

describe("down migrations", () => {
  it("every migration has a down script, and running them newest first drops every table", async () => {
    const tables = () =>
      db
        .prepare(
          "SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
        )
        .first<number>("n");
    await runStatements(db, contentSeedStatements());
    expect(await tables()).toBe(13);

    const migrations = readdirSync(join(ROOT, "drizzle", "migrations"))
      .filter((file) => file.endsWith(".sql"))
      .sort()
      .reverse();
    for (const migration of migrations) {
      const file = join(ROOT, "drizzle", "down", migration.replace(/\.sql$/, ".down.sql"));
      const down = readFileSync(file, "utf8");
      await runStatements(db, down.replace(/^--.*$/gm, "").split(";"));
    }

    expect(await tables()).toBe(0);
  });
});

describe("participant deletion", () => {
  const PARTICIPANT_TABLES = [
    "participants",
    "attempts",
    "attempt_step",
    "attempt_stt",
    "test_results",
    "test_step_result",
    "review_events",
  ];

  async function insertParticipantWithData(id: string, attemptId: string) {
    const now = Date.now();
    await db.batch([
      db
        .prepare(
          "INSERT INTO participants (id, display_name, code, browser_id, consent_at, ip_hash, delete_after) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          id,
          `Ana ${id.slice(0, 1).toUpperCase()}.`,
          "K7Q2",
          `browser-${id}`,
          now,
          "iphash",
          now,
        ),
      db
        .prepare(
          "INSERT INTO attempts (id, participant_id, test_id, step_number, attempt_number) VALUES (?, ?, 1, 1, 1)",
        )
        .bind(attemptId, id),
      db
        .prepare(
          "INSERT INTO attempt_step (id, attempt_id, sentence_id, step_type) VALUES (?, ?, 101, 'progressive')",
        )
        .bind(`${attemptId}-step`, attemptId),
      db
        .prepare("INSERT INTO attempt_stt (attempt_id, raw_deepgram) VALUES (?, '{}')")
        .bind(attemptId),
      db
        .prepare(
          "INSERT INTO test_results (participant_id, test_id, review_status) VALUES (?, 1, 'needs_review')",
        )
        .bind(id),
    ]);
    const resultId = await db
      .prepare("SELECT id FROM test_results WHERE participant_id = ?")
      .bind(id)
      .first<number>("id");
    await db.batch([
      db
        .prepare(
          "INSERT INTO test_step_result (test_results_id, sentence_id, step_type, attempts) VALUES (?, 101, 'progressive', 1)",
        )
        .bind(resultId),
      db
        .prepare(
          "INSERT INTO review_events (test_results_id, reviewer_name, ip_hash) VALUES (?, 'Bea L.', 'iphash')",
        )
        .bind(resultId),
    ]);
  }

  it("removes every row that belongs to the participant and nothing else", async () => {
    await runStatements(db, contentSeedStatements());
    await insertParticipantWithData("ana", "attempt-ana");
    await insertParticipantWithData("bob", "attempt-bob");
    for (const table of PARTICIPANT_TABLES) expect(await count(db, table)).toBe(2);

    await db.prepare("DELETE FROM participants WHERE id = ?").bind("ana").run();

    for (const table of PARTICIPANT_TABLES) expect(await count(db, table), table).toBe(1);
    expect(await count(db, "tests")).toBe(4);
    expect(await count(db, "sentences")).toBe(24);
  });

  it("rejects an attempt for a participant that does not exist", async () => {
    await runStatements(db, contentSeedStatements());
    await expect(
      db
        .prepare(
          "INSERT INTO attempts (id, participant_id, test_id, step_number, attempt_number) VALUES ('x', 'nobody', 1, 1, 1)",
        )
        .run(),
    ).rejects.toThrow(/FOREIGN KEY/);
  });
});
