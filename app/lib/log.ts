/**
 * Structured JSON logs (T0.4). One JSON object per line, so Workers Logs can filter on any field.
 * Every entry passes through `redact()`: participant names, reviewer names, IP addresses and
 * secrets never reach the logs (BR-15, S-3).
 */

export type LogLevel = "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

/** Keys whose values are replaced, at any depth. Compared without case, `-` or `_`. */
const REDACTED_KEYS = new Set(
  [
    "name",
    "displayName",
    "participantName",
    "reviewerName",
    "ip",
    "ipAddress",
    "clientIp",
    "remoteAddr",
    "cf-connecting-ip",
    "x-forwarded-for",
    "x-real-ip",
    "password",
    "passwordHash",
    "token",
    "authorization",
    "cookie",
    "set-cookie",
    "apiKey",
    "secret",
    "audio",
  ].map(normaliseKey),
);

export const REDACTED = "[redacted]";
const MAX_DEPTH = 6;

function normaliseKey(key: string): string {
  return key.replace(/[-_]/g, "").toLowerCase();
}

export function isRedactedKey(key: string): boolean {
  return REDACTED_KEYS.has(normaliseKey(key));
}

/** A copy of `value` with sensitive keys replaced. Errors become plain objects. */
export function redact(value: unknown, depth = 0): unknown {
  if (value instanceof Error) return redact(serialiseError(value), depth);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) return "[binary]";
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isRedactedKey(key) ? REDACTED : redact(item, depth + 1),
    ]),
  );
}

export function serialiseError(error: unknown): LogFields {
  if (error instanceof Error) {
    return { type: error.name, message: error.message, stack: error.stack };
  }
  return { type: typeof error, message: String(error) };
}

export type Logger = {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
  /** A logger whose entries also carry `fields`, such as a request id. */
  with(fields: LogFields): Logger;
};

type Sink = (level: LogLevel, line: string) => void;

const consoleSink: Sink = (level, line) => {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

export function createLogger(base: LogFields = {}, sink: Sink = consoleSink): Logger {
  const write = (level: LogLevel, event: string, fields: LogFields = {}) => {
    const entry = redact({ ...base, ...fields, level, event, time: new Date().toISOString() });
    sink(level, JSON.stringify(entry));
  };
  return {
    info: (event, fields) => write("info", event, fields),
    warn: (event, fields) => write("warn", event, fields),
    error: (event, fields) => write("error", event, fields),
    with: (fields) => createLogger({ ...base, ...fields }, sink),
  };
}

export const log = createLogger();
