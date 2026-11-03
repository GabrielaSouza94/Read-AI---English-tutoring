import { describe, expect, it } from "vitest";

import { ConfigError, findConfigProblems, loadConfig } from "./config";

const VALID = {
  DEEPGRAM_API_KEY: "dg-key",
  AZURE_SPEECH_KEY: "az-key",
  AZURE_SPEECH_REGION: "eastus",
  GEMINI_API_KEY: "gm-key",
  LANGSMITH_API_KEY: "ls-key",
  TURNSTILE_SITE_KEY: "ts-site",
  TURNSTILE_SECRET_KEY: "ts-secret",
  IP_HASH_SALT: "salt",
  DAILY_STT_MINUTES_CAP: "80",
  RETENTION_DAYS: "90",
  PRIVACY_CONTACT_EMAIL: "privacy@example.com",
};

function without(name: keyof typeof VALID): Record<string, unknown> {
  return Object.fromEntries(Object.entries(VALID).filter(([key]) => key !== name));
}

describe("loadConfig", () => {
  it("returns typed settings when everything is present", () => {
    const config = loadConfig(VALID);
    expect(config.deepgramApiKey).toBe("dg-key");
    expect(config.azureSpeechRegion).toBe("eastus");
    expect(config.dailySttMinutesCap).toBe(80);
    expect(config.retentionDays).toBe(90);
    expect(config.privacyContactEmail).toBe("privacy@example.com");
  });

  it("accepts numbers given as numbers", () => {
    const config = loadConfig({ ...VALID, DAILY_STT_MINUTES_CAP: 40, RETENTION_DAYS: 30 });
    expect(config.dailySttMinutesCap).toBe(40);
    expect(config.retentionDays).toBe(30);
  });

  it("throws a clear error naming a missing variable", () => {
    expect(() => loadConfig(without("DEEPGRAM_API_KEY"))).toThrow(ConfigError);
    expect(() => loadConfig(without("DEEPGRAM_API_KEY"))).toThrow(
      "Invalid configuration: DEEPGRAM_API_KEY is missing",
    );
  });

  it("lists every problem at once", () => {
    const source = { ...without("GEMINI_API_KEY"), RETENTION_DAYS: "ninety" };
    try {
      loadConfig(source);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).problems).toEqual([
        "GEMINI_API_KEY is missing",
        "RETENTION_DAYS must be a positive whole number",
      ]);
    }
  });

  it("treats empty and whitespace-only values as missing", () => {
    expect(findConfigProblems({ ...VALID, IP_HASH_SALT: "", PRIVACY_CONTACT_EMAIL: "  " })).toEqual(
      ["IP_HASH_SALT is missing", "PRIVACY_CONTACT_EMAIL is missing"],
    );
  });

  it.each(["0", "-5", "1.5", "80 minutes"])("rejects %j as a daily cap", (value) => {
    expect(findConfigProblems({ ...VALID, DAILY_STT_MINUTES_CAP: value })).toEqual([
      "DAILY_STT_MINUTES_CAP must be a positive whole number",
    ]);
  });

  it("rejects a contact that is not an email address", () => {
    expect(findConfigProblems({ ...VALID, PRIVACY_CONTACT_EMAIL: "Gabriela" })).toEqual([
      "PRIVACY_CONTACT_EMAIL must be an email address",
    ]);
  });

  it("never puts a value in the error message", () => {
    const source = { ...without("AZURE_SPEECH_KEY"), RETENTION_DAYS: "secret-looking-value" };
    expect(() => loadConfig(source)).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("secret-looking-value") }),
    );
  });
});
