import { env } from "cloudflare:workers";

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

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-4xl font-semibold">Read AI</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300">
        Hello! The English reading fluency assessment is under construction.
      </p>
      <p className="text-sm text-gray-500" data-testid="environment">
        {loaderData.environment}
      </p>
    </main>
  );
}
