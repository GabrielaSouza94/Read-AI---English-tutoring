/**
 * /tests: choose one of the 4 tests (T2.1, UC-1 step 4). Needs a participant: a browser without
 * one is sent to /start.
 */
import { env } from "cloudflare:workers";
import { Link, redirect } from "react-router";

import { readBrowserIdCookie } from "~/lib/browser-id";
import { listTests } from "~/lib/catalog";
import { findParticipant } from "~/lib/session-start";

import type { Route } from "./+types/tests";

export function meta() {
  return [{ title: "Choose a test · Read AI" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const browserId = readBrowserIdCookie(request);
  const participant = browserId ? await findParticipant(env.DB, browserId, new Date()) : null;
  if (!participant) throw redirect("/start");
  return {
    participant: { displayName: participant.displayName, code: participant.code },
    tests: await listTests(env.DB),
  };
}

export default function Tests({ loaderData }: Route.ComponentProps) {
  const { participant, tests } = loaderData;
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-wide px-8 py-12">
      <h1 className="text-h1 font-bold text-gray-900">Choose a test</h1>
      <p className="mt-4 text-gray-600">
        You are taking part as{" "}
        <strong className="text-gray-900">
          {participant.displayName} · {participant.code}
        </strong>
        . The stories go from easiest (A2) to hardest (C1). Pick the one that fits your level.
      </p>
      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {tests.map((test) => (
          <li key={test.id} className="flex flex-col rounded-card bg-gray-50 p-6">
            <p className="w-fit rounded-control bg-primary-light px-2 py-1 text-sm font-semibold text-primary-dark">
              Level {test.cefr}
            </p>
            <h2 className="mt-3 text-h3 font-semibold text-gray-900">{test.title}</h2>
            <p className="mt-2 text-gray-600">
              {test.sentences} sentences · about {test.minutes} minutes
            </p>
            <Link
              to={`/assessment?testId=${test.id}`}
              aria-label={`Start ${test.title}`}
              className="mt-6 w-fit rounded-button bg-primary px-5 py-2 font-semibold text-white hover:bg-primary-hover active:bg-primary-dark"
            >
              Start
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
