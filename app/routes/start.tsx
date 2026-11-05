/**
 * /start: name, consent, optional group code and captcha (T1.3, UC-1 steps 1-3). The form posts
 * JSON to /api/session/start; the server enforces every rule, the page only shows the result.
 */
import { env } from "cloudflare:workers";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";

import { loadStoredBrowserId, readBrowserIdCookie, storeBrowserId } from "~/lib/browser-id";
import { loadStartConfig } from "~/lib/config";
import type { ApiErrorBody } from "~/lib/errors";
import { NAME_MAX } from "~/lib/participant";
import { findParticipant, type StartResponse } from "~/lib/session-start";

import type { Route } from "./+types/start";

export function meta() {
  return [{ title: "Start · Read AI" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const config = loadStartConfig(env as unknown as Record<string, unknown>);
  const browserId = readBrowserIdCookie(request);
  const returning = browserId ? await findParticipant(env.DB, browserId, new Date()) : null;
  return {
    siteKey: config.turnstileSiteKey,
    returning: returning && { displayName: returning.displayName, code: returning.code },
  };
}

type Turnstile = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("no turnstile")),
    );
    script.addEventListener("error", () => reject(new Error("turnstile failed to load")));
  });
}

/** Renders the captcha and reports its token; `reset` gets a fresh one after a failed submit. */
function useTurnstile(siteKey: string) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !container.current) return;
        widget.current = turnstile.render(container.current, {
          sitekey: siteKey,
          action: "session-start",
          callback: (value) => {
            setToken(value);
            setFailed(false);
          },
          "expired-callback": () => setToken(""),
          "error-callback": () => setFailed(true),
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);

  const reset = () => {
    setToken("");
    if (widget.current) window.turnstile?.reset(widget.current);
  };
  return { container, token, failed, reset };
}

type Fields = Partial<Record<"name" | "consent" | "groupCode", string>>;

const input =
  "mt-2 block w-full rounded-button border-2 border-input-border px-4 py-3 text-lg focus:border-primary aria-invalid:border-danger";

export default function Start({ loaderData }: Route.ComponentProps) {
  const { siteKey, returning } = loaderData;
  const navigate = useNavigate();
  const ids = useId();
  const {
    container: captchaRef,
    token,
    failed: captchaFailed,
    reset: resetCaptcha,
  } = useTurnstile(siteKey);
  const [fields, setFields] = useState<Fields>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const fieldProps = (name: keyof Fields) => ({
    id: `${ids}-${name}`,
    name,
    "aria-invalid": fields[name] ? true : undefined,
    "aria-describedby": [`${ids}-${name}-hint`, fields[name] ? `${ids}-${name}-error` : ""]
      .filter(Boolean)
      .join(" "),
  });
  const fieldError = (name: keyof Fields) =>
    fields[name] && (
      <p id={`${ids}-${name}-error`} className="mt-2 text-sm font-medium text-danger">
        {fields[name]}
      </p>
    );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setFormError("");
    try {
      const response = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name") ?? undefined,
          consent: data.get("consent") === "on",
          groupCode: data.get("groupCode") ?? undefined,
          turnstileToken: token,
          browserId: loadStoredBrowserId() ?? undefined,
        }),
      });
      if (response.ok) {
        const body = (await response.json()) as StartResponse;
        storeBrowserId(body.browserId);
        await navigate("/tests");
        return;
      }
      const { error } = (await response.json()) as ApiErrorBody;
      setFields((error.fields ?? {}) as Fields);
      setFormError(error.message);
      // Tokens are single-use: get a new one for the next try.
      resetCaptcha();
      const firstInvalid = Object.keys(error.fields ?? {})[0];
      if (firstInvalid)
        formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
    } catch {
      setFormError("We could not reach Read AI. Check your connection and try again.");
      resetCaptcha();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-form px-8 py-12">
      <h1 className="text-h1 font-bold text-gray-900">
        {returning ? "Welcome back" : "Before you start"}
      </h1>
      <p className="mt-4 text-gray-600">
        {returning ? (
          <>
            This browser already has a participant:{" "}
            <strong className="text-gray-900">
              {returning.displayName} · {returning.code}
            </strong>
            . You will continue with the same name and code.
          </>
        ) : (
          "Your name and scores are shown publicly on the portal. No account or email is needed."
        )}
      </p>

      <div role="alert" className="mt-6 empty:hidden">
        {formError && (
          <p className="rounded-control bg-danger-light px-4 py-3 font-medium text-danger">
            {formError}
          </p>
        )}
      </div>

      <form ref={formRef} noValidate onSubmit={onSubmit} className="mt-6 space-y-6">
        {!returning && (
          <div>
            <label htmlFor={`${ids}-name`} className="block font-semibold text-gray-900">
              Name or nickname
            </label>
            <p id={`${ids}-name-hint`} className="mt-1 text-sm text-gray-600">
              Shown as first name and last initial: &ldquo;Ana Silva&rdquo; becomes &ldquo;Ana
              S.&rdquo;. Only that short form is stored.
            </p>
            <input
              {...fieldProps("name")}
              type="text"
              autoComplete="given-name"
              maxLength={NAME_MAX + 10}
              required
              className={input}
            />
            {fieldError("name")}
          </div>
        )}

        <div>
          <label htmlFor={`${ids}-groupCode`} className="block font-semibold text-gray-900">
            Group code <span className="font-normal text-gray-600">(optional)</span>
          </label>
          <p id={`${ids}-groupCode-hint`} className="mt-1 text-sm text-gray-600">
            Only if your professor gave you one.
          </p>
          <input
            {...fieldProps("groupCode")}
            type="text"
            autoComplete="off"
            className={`${input} uppercase`}
          />
          {fieldError("groupCode")}
        </div>

        <div>
          <div className="flex items-start gap-3">
            <input
              {...fieldProps("consent")}
              type="checkbox"
              required
              className="mt-1 size-5 accent-primary"
            />
            <label htmlFor={`${ids}-consent`} className="text-gray-900">
              I am 18 or older and agree my name and scores are public.
            </label>
          </div>
          <p id={`${ids}-consent-hint`} className="mt-1 pl-8 text-sm text-gray-600">
            Read the{" "}
            <Link to="/privacy" target="_blank" rel="noopener" className="text-primary underline">
              privacy notice (opens in a new tab)
            </Link>{" "}
            to see what is stored and for how long.
          </p>
          {fieldError("consent")}
        </div>

        <div>
          <div ref={captchaRef} data-testid="captcha" />
          {captchaFailed && (
            <p className="mt-2 text-sm font-medium text-danger">
              The captcha did not load. Reload the page to try again.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !token}
          className="rounded-button bg-primary px-6 py-3 text-lg font-semibold text-white hover:bg-primary-hover active:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700"
        >
          {submitting ? "Starting…" : "Continue"}
        </button>
        {!token && !captchaFailed && (
          <p className="text-sm text-gray-600">Continue is available once the captcha is done.</p>
        )}
      </form>
      <noscript>
        <p className="mt-6 font-medium text-danger">Read AI needs JavaScript to record audio.</p>
      </noscript>
    </main>
  );
}
