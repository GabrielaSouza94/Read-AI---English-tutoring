import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the password it hashed", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("Correct horse battery staple", hash)).toBe(false);
  });

  it("uses a new salt every time and never stores the password", async () => {
    const [a, b] = await Promise.all([
      hashPassword("same-password"),
      hashPassword("same-password"),
    ]);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^pbkdf2_sha256\$100000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(a).not.toContain("same-password");
  });

  it.each(["", "not-a-hash", "md5$1$abc$def", "pbkdf2_sha256$abc$c2FsdA==$aGFzaA=="])(
    "rejects a malformed stored hash %j instead of throwing",
    async (stored) => {
      expect(await verifyPassword("anything", stored)).toBe(false);
    },
  );

  it("refuses passwords shorter than 12 characters", async () => {
    await expect(hashPassword("short")).rejects.toThrow("at least 12 characters");
  });
});
