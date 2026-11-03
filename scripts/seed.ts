/**
 * Seeds an environment's D1 database with the four tests and their sentences, and optionally the
 * admin account. Every statement is an upsert, so running it again is safe.
 *
 *   npm run db:seed:local
 *   npm run db:seed:staging -- --admin     # also create the admin (asks for email and password)
 *
 * With --admin, ADMIN_EMAIL and ADMIN_PASSWORD are read from the environment when set (for scripts);
 * otherwise the script asks, and the password is not echoed. Only the hash is sent to D1. The SQL is
 * written to a temporary file outside the repository and deleted afterwards.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

import { adminSeedStatement, contentSeedStatements } from "../app/db/seed";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../app/lib/password";

const ROOT = join(import.meta.dirname, "..");
const WRANGLER = join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");
const ENVIRONMENTS = ["local", "staging", "production"] as const;
type Environment = (typeof ENVIRONMENTS)[number];

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

function askHidden(question: string): Promise<string> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) {
    return Promise.reject(new Error("Not a terminal: set ADMIN_PASSWORD instead."));
  }
  return new Promise((resolve) => {
    let value = "";
    const finish = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      resolve(value);
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") return finish();
        if (char === "\u0003") process.exit(130); // Ctrl+C
        value = char === "\u007f" || char === "\b" ? value.slice(0, -1) : value + char;
      }
    };
    stdout.write(question);
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function adminStatement(): Promise<string> {
  const email = process.env.ADMIN_EMAIL ?? (await ask("Admin email: "));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That is not an email address.");
  const password =
    process.env.ADMIN_PASSWORD ??
    (await askHidden(`Admin password (${MIN_PASSWORD_LENGTH}+ characters, not shown): `));
  return adminSeedStatement(email, await hashPassword(password));
}

async function main() {
  const { values } = parseArgs({
    options: {
      env: { type: "string", default: "local" },
      admin: { type: "boolean", default: false },
    },
  });
  const env = values.env as Environment;
  if (!ENVIRONMENTS.includes(env)) {
    throw new Error(`--env must be one of ${ENVIRONMENTS.join(", ")}`);
  }

  const statements = contentSeedStatements();
  if (values.admin) statements.push(await adminStatement());

  const dir = mkdtempSync(join(tmpdir(), "read-ai-seed-"));
  const file = join(dir, "seed.sql");
  try {
    writeFileSync(file, statements.join("\n") + "\n");
    // Runs Wrangler's entry file with Node directly: no shell, so paths with spaces stay intact.
    // --config skips the redirect a local build leaves in .wrangler/deploy (see docs/DEPLOYMENT.md).
    const args = [WRANGLER, "d1", "execute", "DB", "--config", join(ROOT, "wrangler.jsonc")];
    args.push(...(env === "local" ? ["--local"] : ["--remote", "--env", env]));
    args.push("--file", file, "--yes");
    const result = spawnSync(process.execPath, args, { stdio: "inherit", cwd: ROOT });
    if (result.status !== 0) throw new Error(`wrangler exited with status ${result.status}`);
    console.log(
      `Seeded ${env}: ${statements.length} statements${values.admin ? " (including the admin)" : ""}.`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
