/**
 * Health report for GET /api/health: proves an environment's D1 and KV bindings work and that its
 * configuration is complete. The report is public, so it never names which settings are missing.
 */

export type HealthDeps = {
  appEnv: string;
  db: { prepare(sql: string): { first(): Promise<unknown> } };
  kv: { get(key: string): Promise<unknown> };
  configProblems: string[];
};

export type HealthReport = {
  status: "ok" | "degraded";
  environment: string;
  checks: {
    database: "ok" | "error";
    storage: "ok" | "error";
    config: "ok" | "incomplete";
  };
};

async function succeeds(probe: () => Promise<unknown>): Promise<"ok" | "error"> {
  try {
    await probe();
    return "ok";
  } catch {
    return "error";
  }
}

export async function checkHealth({
  appEnv,
  db,
  kv,
  configProblems,
}: HealthDeps): Promise<HealthReport> {
  const [database, storage] = await Promise.all([
    succeeds(() => db.prepare("SELECT 1 AS ok").first()),
    succeeds(() => kv.get("health:probe")),
  ]);
  const config = configProblems.length === 0 ? "ok" : "incomplete";
  const healthy = database === "ok" && storage === "ok" && config === "ok";
  return {
    status: healthy ? "ok" : "degraded",
    environment: appEnv,
    checks: { database, storage, config },
  };
}
