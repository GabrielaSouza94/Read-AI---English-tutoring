export type AppEnv = "local" | "staging" | "production";

const LABELS: Record<AppEnv, string> = {
  local: "Local development",
  staging: "Staging",
  production: "Production",
};

/** Human-readable name of the environment a Worker runs in. Unknown values are reported as-is. */
export function environmentLabel(appEnv: string): string {
  return appEnv in LABELS ? LABELS[appEnv as AppEnv] : `Unknown environment (${appEnv})`;
}
