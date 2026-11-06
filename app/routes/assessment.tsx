/**
 * /assessment?testId={id} (UC-1 steps 5-7): the microphone check, then the progressive steps
 * (T2.3). Progress lives in KV, so a reload resumes the current step. Scoring arrives in Epic E3;
 * until then the Gate A stub scorer passes every attempt where it is switched on.
 */
import { env } from "cloudflare:workers";
import { useCallback, useState, useSyncExternalStore } from "react";
import { data, Link, redirect, useRevalidator } from "react-router";

import { MicCheck, Recorder } from "~/components/recorder";
import { useHydrated } from "~/components/use-hydrated";
import { WordReview } from "~/components/word-review";
import type { AttemptResponse } from "~/lib/assessment";
import { readBrowserIdCookie } from "~/lib/browser-id";
import { getTest, parseTestId } from "~/lib/catalog";
import type { ApiErrorBody } from "~/lib/errors";
import { findParticipant } from "~/lib/session-start";
import { buildSteps } from "~/lib/steps";
import { loadTestSession } from "~/lib/test-session";

import type { Route } from "./+types/assessment";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData ? `${loaderData.test.title} · Read AI` : "Read AI" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const browserId = readBrowserIdCookie(request);
  const participant = browserId ? await findParticipant(env.DB, browserId, new Date()) : null;
  if (!participant) throw redirect("/start");

  const testId = parseTestId(new URL(request.url).searchParams.get("testId"));
  const test = testId === null ? null : await getTest(env.DB, testId);
  if (!test) throw data("Test not found", { status: 404 });

  const text = new Map(test.sentences.map((s) => [s.id, s.content]));
  const steps = buildSteps(test.sentences.map((s) => s.id)).map((step) => ({
    number: step.number,
    fullReadNumber: step.fullReadNumber,
    sentenceCount: step.sentenceIds.length,
    text: step.sentenceIds.map((id) => text.get(id)).join(" "),
  }));
  const session = await loadTestSession(env.KV, participant.id, test.id);
  return {
    test: { id: test.id, cefr: test.cefr, title: test.title, maxAttempts: test.maxAttemptsPerStep },
    steps,
    session: session && {
      stepNumber: session.stepNumber,
      attempt: session.attempt,
      done: session.done,
      highlightedWords: session.highlightedWords ?? [],
    },
  };
}

// The check is needed once per visit; a reload or the next test skips it.
const MIC_CHECK_KEY = "read-ai.mic-check-passed";

function readPassed(): boolean {
  try {
    return sessionStorage.getItem(MIC_CHECK_KEY) === "1";
  } catch {
    // Storage blocked: the participant does the check again, which is harmless.
    return false;
  }
}

const noSubscription = () => () => {};

function useMicCheckPassed() {
  // The server never knows, so the first render shows the check; the browser then reads storage.
  const stored = useSyncExternalStore(noSubscription, readPassed, () => false);
  const [passedNow, setPassedNow] = useState(false);
  const markPassed = () => {
    setPassedNow(true);
    try {
      sessionStorage.setItem(MIC_CHECK_KEY, "1");
    } catch {
      // See readPassed.
    }
  };
  return [stored || passedNow, markPassed] as const;
}

type StepView = Route.ComponentProps["loaderData"]["steps"][number];

/** POSTs and returns the JSON body, or throws with the S-1 message. */
async function post(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, { method: "POST", ...init });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (body as ApiErrorBody | null)?.error?.message;
    throw new Error(message ?? "Something went wrong. Please try again.");
  }
  return body;
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div>
      <p className="font-semibold text-gray-900">
        Step {current} of {total}
      </p>
      <div aria-hidden="true" className="mt-2 flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-control ${i < current ? "bg-primary" : "bg-gray-200"}`}
          />
        ))}
      </div>
    </div>
  );
}

function stepLabel(step: StepView): string {
  if (step.fullReadNumber) return `Read the whole story (${step.fullReadNumber} of 2)`;
  return step.sentenceCount === 1
    ? "Read the first sentence"
    : `Read sentences 1 to ${step.sentenceCount}`;
}

const primaryButton =
  "rounded-button bg-primary px-6 py-3 text-lg font-semibold text-white hover:bg-primary-hover active:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700";

export default function Assessment({ loaderData }: Route.ComponentProps) {
  const { test, steps, session } = loaderData;
  const [micPassed, markMicPassed] = useMicCheckPassed();
  const revalidator = useRevalidator();
  const [feedback, setFeedback] = useState<AttemptResponse | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [wordsReviewed, setWordsReviewed] = useState(false);
  const onReviewComplete = useCallback((complete: boolean) => setWordsReviewed(complete), []);
  const hydrated = useHydrated();

  async function begin() {
    setStarting(true);
    setError("");
    try {
      await post("/api/assessment/begin", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId: test.id }),
      });
      await revalidator.revalidate();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function submit(wav: Blob) {
    if (!session) return;
    setError("");
    const form = new FormData();
    form.set("testId", String(test.id));
    form.set("stepNumber", String(session.stepNumber));
    form.set("audio", wav, "recording.wav");
    try {
      setFeedback((await post("/api/attempts", { body: form })) as AttemptResponse);
    } catch (failure) {
      setError((failure as Error).message);
    }
    await revalidator.revalidate();
  }

  const step = session ? steps[session.stepNumber - 1] : null;
  // The latest attempt's words, or after a reload the ones kept on the session (T2.4).
  const highlightedWords =
    feedback && session && feedback.stepNumber === session.stepNumber
      ? feedback.highlightedWords
      : (session?.highlightedWords ?? []);
  const mustReview = highlightedWords.length > 0 && !wordsReviewed;

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-content px-8 py-12">
      <p className="w-fit rounded-control bg-primary-light px-2 py-1 text-sm font-semibold text-primary-dark">
        Level {test.cefr}
      </p>
      <h1 className="mt-3 text-h1 font-bold text-gray-900">{test.title}</h1>

      <div role="alert" className="mt-6 empty:hidden">
        {error && (
          <p className="rounded-control bg-danger-light px-4 py-3 font-medium text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {session?.done ? (
          <section className="rounded-card bg-gray-50 p-6">
            <h2 className="text-h2 font-semibold text-gray-900">You finished the test</h2>
            <p className="mt-2 text-gray-600">
              You read all {steps.length} steps. Your scores will appear here once scoring is
              switched on.
            </p>
            <Link to="/tests" className="mt-4 inline-block font-semibold text-primary underline">
              Choose another test
            </Link>
          </section>
        ) : session && step ? (
          <>
            <ProgressBar current={session.stepNumber} total={steps.length} />
            <p role="status" className="font-medium text-gray-900 empty:hidden">
              {feedback && !feedback.done ? feedback.message : ""}
            </p>
            <section
              aria-labelledby="step-title"
              className="rounded-card border-2 border-gray-200 p-6"
            >
              <h2 id="step-title" className="text-h3 font-semibold text-gray-900">
                {stepLabel(step)}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Attempt {session.attempt + 1} of {test.maxAttempts}
              </p>
              {highlightedWords.length > 0 ? (
                <WordReview
                  key={`${session.stepNumber}-${session.attempt}-${highlightedWords.join(" ")}`}
                  text={step.text}
                  words={highlightedWords}
                  onComplete={onReviewComplete}
                />
              ) : (
                <p className="mt-4 text-reading text-gray-900" data-testid="step-text">
                  {step.text}
                </p>
              )}
            </section>
            {micPassed ? (
              <Recorder
                key={`${session.stepNumber}-${session.attempt}`}
                onSubmit={submit}
                blockedReason={
                  mustReview ? "Review every highlighted word before you record again." : undefined
                }
              />
            ) : (
              <MicCheck onPassed={markMicPassed} />
            )}
          </>
        ) : (
          <>
            <section className="rounded-card bg-gray-50 p-6">
              <h2 className="text-h3 font-semibold text-gray-900">How it works</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-600">
                <li>
                  The story has {steps.length - 2} sentences. Each step adds one sentence, then you
                  read the whole story twice: {steps.length} steps in all.
                </li>
                <li>
                  Read each step aloud. You have up to {test.maxAttempts} tries per step, then the
                  test moves on.
                </li>
                <li>Your audio is scored and then discarded. It is never stored.</li>
              </ul>
            </section>
            {micPassed ? (
              <button
                type="button"
                onClick={begin}
                disabled={starting || !hydrated}
                className={primaryButton}
              >
                {starting ? "Starting…" : "Begin the test"}
              </button>
            ) : (
              <MicCheck onPassed={markMicPassed} />
            )}
          </>
        )}
      </div>
    </main>
  );
}
