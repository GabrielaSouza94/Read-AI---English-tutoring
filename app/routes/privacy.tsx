import { env } from "cloudflare:workers";

import { loadPrivacyConfig } from "~/lib/config";

import type { Route } from "./+types/privacy";

/** Change this date whenever the notice changes (T1.2; reviewed against BRD §7). */
const LAST_UPDATED = "4 November 2026";

const THIRD_PARTIES = [
  {
    name: "Deepgram (United States)",
    receives: "Your recording",
    why: "Speech-to-text scoring",
  },
  {
    name: "Microsoft Azure AI Speech",
    receives: "Your recording and the story text",
    why: "Pronunciation scoring",
  },
  {
    name: "Google (Gemini API)",
    receives: "Transcript, scores, story text and ids, but never your name",
    why: "Writing your feedback",
  },
  {
    name: "LangSmith (LangChain)",
    receives: "The same as Google, but never your name",
    why: "Managing the feedback prompt and checking its quality",
  },
  {
    name: "Cloudflare",
    receives: "Everything Read AI stores, and your IP address while a request is handled",
    why: "Hosting, database and captcha (Turnstile)",
  },
];

export function meta() {
  return [
    { title: "Privacy notice · Read AI" },
    {
      name: "description",
      content: "What Read AI stores, why, for how long, and how to delete it.",
    },
  ];
}

export function loader() {
  return loadPrivacyConfig(env as unknown as Record<string, unknown>);
}

const h2 = "mt-8 text-xl font-semibold";
const list = "mt-2 list-disc space-y-1 pl-6";

export default function Privacy({ loaderData }: Route.ComponentProps) {
  const { contactEmail, retentionDays } = loaderData;
  const email = (
    <a className="underline" href={`mailto:${contactEmail}`}>
      {contactEmail}
    </a>
  );

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-content px-8 py-12 leading-relaxed">
      <h1 className="text-h1 font-bold text-gray-900">Privacy notice</h1>
      <p className="mt-4">
        Read AI is a public demo that scores how fluently you read English aloud. This notice
        explains what we collect, why, who receives it, how long we keep it and how to delete it. It
        follows Brazil&apos;s data protection law (LGPD, Law 13.709/2018).
      </p>

      <h2 className={h2}>Who is responsible</h2>
      <p className="mt-2">
        Gabriela Souza is responsible for your data (the data controller under the LGPD). For any
        question about your data, or to use your rights, write to {email}.
      </p>

      <h2 className={h2}>What we collect</h2>
      <ul className={list}>
        <li>
          <strong>Your name</strong>, stored only as a display name: your first name and the initial
          of your last name (for example &ldquo;Ana S.&rdquo;), with a short code. It is shown
          publicly on the professor portal.
        </li>
        <li>
          <strong>Your results</strong>: scores, a transcript of what you read, AI feedback, and
          reviews made by visitors of the portal.
        </li>
        <li>
          <strong>Your consent</strong>: the date and time you agreed.
        </li>
        <li>
          <strong>A random browser id</strong>, kept in your browser, so that this browser can
          delete your result.
        </li>
        <li>
          <strong>Your IP address</strong>, only as a salted hash that cannot be turned back into
          the address. It limits tests per day and helps stop abuse.
        </li>
        <li>
          <strong>Your recording</strong> is sent to the speech services for scoring and deleted
          straight after. It is never stored by Read AI and never played on the portal.
        </li>
      </ul>
      <p className="mt-2">
        We do not ask for an account, an email address or your full name, and we use no advertising
        or tracking cookies.
      </p>

      <h2 className={h2}>Why we use it</h2>
      <ul className={list}>
        <li>
          To score your reading, give you feedback and show your result on the public portal, where
          professors and visitors can review it. Legal basis: your consent (LGPD art. 7, I).
        </li>
        <li>
          To prevent abuse and keep costs under control, with the IP hash and a captcha. Legal
          basis: legitimate interest (LGPD art. 7, IX).
        </li>
      </ul>

      <h2 className={h2}>Who else receives it</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-4 font-semibold">Service</th>
              <th className="py-2 pr-4 font-semibold">What it receives</th>
              <th className="py-2 font-semibold">Why</th>
            </tr>
          </thead>
          <tbody>
            {THIRD_PARTIES.map((party) => (
              <tr key={party.name} className="border-b align-top">
                <td className="py-2 pr-4">{party.name}</td>
                <td className="py-2 pr-4">{party.receives}</td>
                <td className="py-2">{party.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2">
        These companies may process data outside Brazil, mainly in the United States (LGPD art. 33).
      </p>

      <h2 className={h2}>How long we keep it</h2>
      <p className="mt-2">
        Everything about your test is deleted automatically {retentionDays} days after you take it.
        Technical logs contain no names or IP addresses and are kept for at most 7 days.
      </p>

      <h2 className={h2}>Deleting your data</h2>
      <ul className={list}>
        <li>
          From the browser you used: open your result and choose &ldquo;Delete my result&rdquo;.
        </li>
        <li>
          From anywhere: email {email} with your display name and code. We delete it within 15 days.
        </li>
      </ul>

      <h2 className={h2}>Your rights</h2>
      <p className="mt-2">
        Under the LGPD you can ask us to confirm whether we hold your data, give you a copy, correct
        or delete it, and tell you who receives it. You can withdraw your consent at any time, which
        deletes your result. You can also complain to Brazil&apos;s data protection authority (ANPD,{" "}
        <a className="underline" href="https://www.gov.br/anpd">
          gov.br/anpd
        </a>
        ).
      </p>

      <h2 className={h2}>Age</h2>
      <p className="mt-2">Read AI is for adults. You must be 18 or older to take a test.</p>

      <p className="mt-8 text-sm text-gray-500">Last updated: {LAST_UPDATED}.</p>
    </main>
  );
}
