import { env } from "cloudflare:workers";
import { Link } from "react-router";

import { environmentLabel } from "~/lib/environment";

import type { Route } from "./+types/home";

export function meta() {
  return [
    { title: "Read AI" },
    {
      name: "description",
      content: "Read a short story aloud and see how fluently you read English.",
    },
  ];
}

export function loader() {
  return { environment: environmentLabel(env.APP_ENV) };
}

const SIDES = [
  {
    title: "For participants",
    points: [
      "Choose one of four short stories, from level A2 to C1.",
      "Read it aloud step by step. Each step adds a sentence.",
      "Get your reading speed, accuracy and fluency, with tips on the words to practise.",
    ],
  },
  {
    title: "For professors",
    points: [
      "See tests in progress, finished results and results that need a review.",
      "Open a result to compare what was read with the story.",
      "Add a review, and export the attempts as a CSV file.",
    ],
  },
];

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-wide px-8 py-12">
      <h1 className="max-w-content text-display font-bold text-gray-900">
        Read English aloud. See how fluently you read.
      </h1>
      <p className="mt-4 max-w-content text-xl text-gray-600">
        Read AI listens to you read a short story and scores your reading speed, accuracy and
        fluency. A test takes 5 to 8 minutes and needs a microphone.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          to="/start"
          className="rounded-button bg-primary px-6 py-3 text-lg font-semibold text-white hover:bg-primary-hover active:bg-primary-dark"
        >
          Take a test
        </Link>
        <Link
          to="/portal"
          className="rounded-button border-2 border-primary px-6 py-3 text-lg font-semibold text-primary hover:bg-primary-light hover:text-primary-dark"
        >
          Open the portal
        </Link>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {SIDES.map((side) => (
          <section key={side.title} className="rounded-card bg-gray-50 p-6">
            <h2 className="text-h3 font-semibold text-gray-900">{side.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-600">
              {side.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-8 text-sm text-gray-600" data-testid="environment">
        {loaderData.environment}
      </p>
    </main>
  );
}
