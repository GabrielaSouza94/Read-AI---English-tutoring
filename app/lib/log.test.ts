import { describe, expect, it } from "vitest";

import { createLogger, REDACTED, redact } from "./log";

describe("redact", () => {
  it("removes names, reviewer names and IP fields at any depth", () => {
    const input = {
      name: "Ana Souza",
      code: "4821",
      review: { reviewerName: "Prof. Lima", notes: "good pacing" },
      request: { headers: { "cf-connecting-ip": "203.0.113.9", "user-agent": "Firefox" } },
      clientIp: "198.51.100.1",
      participants: [{ display_name: "Bruno" }, { displayName: "Carla" }],
    };
    expect(redact(input)).toEqual({
      name: REDACTED,
      code: "4821",
      review: { reviewerName: REDACTED, notes: "good pacing" },
      request: { headers: { "cf-connecting-ip": REDACTED, "user-agent": "Firefox" } },
      clientIp: REDACTED,
      participants: [{ display_name: REDACTED }, { displayName: REDACTED }],
    });
  });

  it("removes secrets and binary audio", () => {
    expect(
      redact({ password: "x", Authorization: "Bearer y", apiKey: "z", chunk: new Uint8Array(4) }),
    ).toEqual({ password: REDACTED, Authorization: REDACTED, apiKey: REDACTED, chunk: "[binary]" });
  });

  it("turns errors into plain objects without a redacted `name` key", () => {
    const result = redact({ error: new TypeError("boom") }) as { error: Record<string, unknown> };
    expect(result.error).toMatchObject({ type: "TypeError", message: "boom" });
    expect(result.error.stack).toEqual(expect.stringContaining("boom"));
  });

  it("does not modify its input", () => {
    const input = { name: "Ana" };
    redact(input);
    expect(input.name).toBe("Ana");
  });
});

describe("createLogger", () => {
  it("writes one JSON line with level, event, time and base fields", () => {
    const lines: [string, string][] = [];
    const logger = createLogger({ requestId: "req-1" }, (level, line) => lines.push([level, line]));

    logger.with({ route: "/api/health" }).warn("slow", { latencyMs: 900, ip: "203.0.113.9" });

    expect(lines).toHaveLength(1);
    const [level, line] = lines[0];
    expect(level).toBe("warn");
    expect(JSON.parse(line)).toEqual({
      requestId: "req-1",
      route: "/api/health",
      latencyMs: 900,
      ip: REDACTED,
      level: "warn",
      event: "slow",
      time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });
});
