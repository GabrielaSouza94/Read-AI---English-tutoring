/**
 * Validated settings for the Worker. Secrets come from `wrangler secret` (or `.dev.vars` locally),
 * plain settings from `vars` in wrangler.jsonc. See docs/SECRETS.md.
 *
 * Error messages name the problem variables but never include their values.
 */

const SECRETS = {
  deepgramApiKey: "DEEPGRAM_API_KEY",
  azureSpeechKey: "AZURE_SPEECH_KEY",
  azureSpeechRegion: "AZURE_SPEECH_REGION",
  geminiApiKey: "GEMINI_API_KEY",
  langsmithApiKey: "LANGSMITH_API_KEY",
  turnstileSiteKey: "TURNSTILE_SITE_KEY",
  turnstileSecretKey: "TURNSTILE_SECRET_KEY",
  ipHashSalt: "IP_HASH_SALT",
} as const;

export type AppConfig = { [K in keyof typeof SECRETS]: string } & {
  dailySttMinutesCap: number;
  retentionDays: number;
  privacyContactEmail: string;
};

export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid configuration: ${problems.join("; ")}`);
    this.name = "ConfigError";
  }
}

type Source = Record<string, unknown>;

function text(source: Source, name: string): string | undefined {
  const value = source[name];
  if (typeof value === "number") return String(value);
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return value.trim();
}

function positiveInteger(value: string | undefined): number | undefined {
  return value !== undefined && /^[1-9]\d*$/.test(value) ? Number(value) : undefined;
}

function check(source: Source): { problems: string[]; config: AppConfig } {
  const problems: string[] = [];
  const required = (name: string) => {
    const value = text(source, name);
    if (value === undefined) problems.push(`${name} is missing`);
    return value ?? "";
  };
  const wholeNumber = (name: string) => {
    const raw = text(source, name);
    if (raw === undefined) {
      problems.push(`${name} is missing`);
      return 0;
    }
    const value = positiveInteger(raw);
    if (value === undefined) problems.push(`${name} must be a positive whole number`);
    return value ?? 0;
  };

  const secrets = Object.fromEntries(
    Object.entries(SECRETS).map(([key, name]) => [key, required(name)]),
  ) as { [K in keyof typeof SECRETS]: string };
  const dailySttMinutesCap = wholeNumber("DAILY_STT_MINUTES_CAP");
  const retentionDays = wholeNumber("RETENTION_DAYS");
  const privacyContactEmail = required("PRIVACY_CONTACT_EMAIL");
  if (privacyContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privacyContactEmail)) {
    problems.push("PRIVACY_CONTACT_EMAIL must be an email address");
  }

  return {
    problems,
    config: { ...secrets, dailySttMinutesCap, retentionDays, privacyContactEmail },
  };
}

/** Every configuration problem, in a stable order. An empty list means the config is valid. */
export function findConfigProblems(source: Source): string[] {
  return check(source).problems;
}

/** Reads and validates the configuration, throwing a ConfigError that lists every problem. */
export function loadConfig(source: Source): AppConfig {
  const { problems, config } = check(source);
  if (problems.length > 0) throw new ConfigError(problems);
  return config;
}
