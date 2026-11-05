import { describe, expect, it } from "vitest";

import {
  BROWSER_ID_COOKIE,
  browserIdCookie,
  isBrowserId,
  newBrowserId,
  readBrowserIdCookie,
} from "./browser-id";

const ID = "3f6c2d1e-8a4b-4c5d-9e7f-0a1b2c3d4e5f";
const request = (cookie?: string, url = "https://read-ai.example/api/session/start") =>
  new Request(url, { headers: cookie ? { cookie } : {} });

describe("browser id", () => {
  it("is a random UUID", () => {
    const id = newBrowserId();
    expect(isBrowserId(id)).toBe(true);
    expect(newBrowserId()).not.toBe(id);
    expect(isBrowserId("not-an-id")).toBe(false);
    expect(isBrowserId(`${ID}x`)).toBe(false);
  });

  it("is read from the cookie, ignoring other cookies and bad values", () => {
    expect(readBrowserIdCookie(request(`theme=dark; ${BROWSER_ID_COOKIE}=${ID}`))).toBe(ID);
    expect(readBrowserIdCookie(request(`${BROWSER_ID_COOKIE}=<script>`))).toBeNull();
    expect(readBrowserIdCookie(request())).toBeNull();
  });

  it("cookie is host-only, HttpOnly, Lax and lasts the retention period", () => {
    const cookie = browserIdCookie(ID, 90, request());
    expect(cookie).toBe(
      `${BROWSER_ID_COOKIE}=${ID}; Path=/; Max-Age=7776000; HttpOnly; SameSite=Lax; Secure`,
    );
    expect(cookie).not.toMatch(/Domain=/i);
  });

  it("cookie is not Secure over plain http (local development)", () => {
    expect(browserIdCookie(ID, 90, request(undefined, "http://localhost:5173/"))).not.toContain(
      "Secure",
    );
  });
});
