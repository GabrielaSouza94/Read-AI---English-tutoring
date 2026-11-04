/**
 * A fresh, in-memory D1 database (and KV namespace) from Wrangler's local runtime (the same engine as `npm run dev`),
 * using the local `DB` binding in wrangler.jsonc, with the real migrations from drizzle/migrations.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getPlatformProxy } from "wrangler";

const ROOT = join(import.meta.dirname, "..");
const MIGRATIONS_DIR = join(ROOT, "drizzle", "migrations");

// The parts of the D1 API these tests use (the Workers types are not loaded in Node).
type Statement = {
  bind(...values: unknown[]): Statement;
  first<T = unknown>(column?: string): Promise<T | null>;
  run(): Promise<unknown>;
};
export type TestD1 = {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown>;
};
export type TestKV = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

export async function createTestDatabase() {
  const { env, dispose } = await getPlatformProxy<{ DB: TestD1; KV: TestKV }>({
    configPath: join(ROOT, "wrangler.jsonc"),
    persist: false,
    envFiles: [],
    remoteBindings: false,
  });
  return { db: env.DB, kv: env.KV, dispose };
}

export async function applyMigrations(db: TestD1): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    await runStatements(db, sql.split("--> statement-breakpoint"));
  }
}

export async function runStatements(db: TestD1, statements: string[]): Promise<void> {
  const prepared = statements
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => db.prepare(statement));
  if (prepared.length > 0) await db.batch(prepared);
}

export async function count(db: TestD1, table: string): Promise<number> {
  const row = await db.prepare(`SELECT count(*) AS n FROM ${table}`).first<{ n: number }>();
  return row?.n ?? 0;
}
