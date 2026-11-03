import { describe, expect, it } from "vitest";

import { checkHealth, type HealthDeps } from "./health";

const workingDb: HealthDeps["db"] = { prepare: () => ({ first: async () => ({ ok: 1 }) }) };
const workingKv: HealthDeps["kv"] = { get: async () => null };
const failing = async () => {
  throw new Error("binding unavailable");
};

function deps(overrides: Partial<HealthDeps> = {}): HealthDeps {
  return { appEnv: "staging", db: workingDb, kv: workingKv, configProblems: [], ...overrides };
}

describe("checkHealth", () => {
  it("is ok when the database, storage and config all work", async () => {
    expect(await checkHealth(deps())).toEqual({
      status: "ok",
      environment: "staging",
      checks: { database: "ok", storage: "ok", config: "ok" },
    });
  });

  it("is degraded when the database query fails", async () => {
    const report = await checkHealth(deps({ db: { prepare: () => ({ first: failing }) } }));
    expect(report.status).toBe("degraded");
    expect(report.checks.database).toBe("error");
  });

  it("is degraded when storage fails", async () => {
    const report = await checkHealth(deps({ kv: { get: failing } }));
    expect(report.status).toBe("degraded");
    expect(report.checks.storage).toBe("error");
  });

  it("reports incomplete config without naming the missing settings", async () => {
    const report = await checkHealth(deps({ configProblems: ["DEEPGRAM_API_KEY is missing"] }));
    expect(report.status).toBe("degraded");
    expect(report.checks.config).toBe("incomplete");
    expect(JSON.stringify(report)).not.toContain("DEEPGRAM");
  });
});
