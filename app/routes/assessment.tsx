/**
 * /assessment?testId={id} (UC-1 step 5). T2.2: the microphone check before the first recording,
 * then the recorder. The progressive steps (T2.3) and scoring (E3) build on this page.
 */
import { env } from "cloudflare:workers";
import { useState, useSyncExternalStore } from "react";
import { data, redirect } from "react-router";

import { MicCheck, Recorder } from "~/components/recorder";
import { readBrowserIdCookie } from "~/lib/browser-id";
import { getTest, parseTestId } from "~/lib/catalog";
import { findParticipant } from "~/lib/session-start";

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
  return { test };
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

export default function Assessment({ loaderData }: Route.ComponentProps) {
  const { test } = loaderData;
  const [micPassed, markMicPassed] = useMicCheckPassed();

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-content px-8 py-12">
      <p className="w-fit rounded-control bg-primary-light px-2 py-1 text-sm font-semibold text-primary-dark">
        Level {test.cefr}
      </p>
      <h1 className="mt-3 text-h1 font-bold text-gray-900">{test.title}</h1>
      <div className="mt-8 space-y-6">
        {micPassed ? (
          <>
            <p className="text-gray-600">
              Your microphone works. Try a recording: press Record, read a sentence aloud, then
              press Stop. Recordings stop by themselves at 2 minutes.
            </p>
            <Recorder />
          </>
        ) : (
          <MicCheck onPassed={markMicPassed} />
        )}
      </div>
    </main>
  );
}
