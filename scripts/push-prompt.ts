/**
 * Uploads the feedback prompt in app/lib/prompts.ts to LangSmith Prompt Hub and points tags at it.
 * Also creates the tracing projects. Safe to re-run: an unchanged prompt makes no new commit.
 *
 *   npm run prompt:push                          # commit if changed, tag "staging"
 *   npm run prompt:push -- --tag production      # also move "production" to the latest commit
 *
 * LANGSMITH_API_KEY comes from the environment, or else from .dev.vars. It is never printed.
 * Prompts edited in the Hub afterwards are not overwritten unless this file changes and is pushed.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { callWithRetry, ProviderError } from "../app/lib/http";
import { LANGSMITH_API_URL } from "../app/lib/langsmith";
import { feedbackManifest, FEEDBACK_PROMPT_NAME } from "../app/lib/prompts";

const ROOT = join(import.meta.dirname, "..");
const PROJECTS = ["read-ai-local", "read-ai-staging", "read-ai-production"];
const POLICY = { timeoutMs: 15_000 };

const { values } = parseArgs({
  options: { tag: { type: "string", multiple: true, default: ["staging"] } },
});
const tags = [...new Set(values.tag)];

const devVars = join(ROOT, ".dev.vars");
if (!process.env.LANGSMITH_API_KEY && existsSync(devVars)) process.loadEnvFile(devVars);
const apiKey = process.env.LANGSMITH_API_KEY?.trim();
if (!apiKey) {
  console.error("LANGSMITH_API_KEY is not set (environment or .dev.vars).");
  process.exit(1);
}

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const response = await callWithRetry(
    `langsmith ${method} ${path.split("?")[0]}`,
    `${LANGSMITH_API_URL}${path}`,
    {
      method,
      headers: { "x-api-key": apiKey ?? "", "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    POLICY,
  );
  const text = await response.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

const statusOf = (error: unknown) => (error instanceof ProviderError ? error.status : undefined);

/** JSON with sorted keys, so two manifests compare equal regardless of key order. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

type Commit = { id: string; commit_hash: string; manifest?: unknown };

async function latestCommit(): Promise<Commit | undefined> {
  const list = (await call("GET", `/commits/-/${FEEDBACK_PROMPT_NAME}/?limit=1&offset=0`)) as {
    commits: Commit[];
  };
  const latest = list.commits[0];
  if (!latest) return undefined;
  const full = (await call("GET", `/commits/-/${FEEDBACK_PROMPT_NAME}/${latest.commit_hash}`)) as {
    manifest: unknown;
  };
  return { ...latest, manifest: full.manifest };
}

async function main() {
  // LangSmith also creates a project on its first trace, so a refusal here is only a warning.
  try {
    for (const name of PROJECTS) {
      await call("POST", "/sessions?upsert=true", {
        name,
        description: "Read AI feedback calls (T3.5). Ids only, never participant names.",
      });
    }
    console.log(`Projects ready: ${PROJECTS.join(", ")}`);
  } catch (error) {
    console.warn(`Projects not created (${error instanceof Error ? error.message : error})`);
  }

  try {
    await call("GET", `/repos/-/${FEEDBACK_PROMPT_NAME}`);
  } catch (error) {
    if (statusOf(error) !== 404) throw error;
    await call("POST", "/repos/", {
      repo_handle: FEEDBACK_PROMPT_NAME,
      is_public: false,
      description: "Read AI: feedback on one scorer result (BR-14). Source: app/lib/prompts.ts.",
    });
    console.log(`Created prompt ${FEEDBACK_PROMPT_NAME}`);
  }

  const manifest = feedbackManifest();
  let commit = await latestCommit();
  if (commit && canonical(commit.manifest) === canonical(manifest)) {
    console.log(`Prompt unchanged (latest commit ${commit.commit_hash.slice(0, 8)})`);
  } else {
    const created = (await call("POST", `/commits/-/${FEEDBACK_PROMPT_NAME}`, {
      manifest,
      parent_commit: commit?.commit_hash,
    })) as { commit?: Commit } & Partial<Commit>;
    commit = created.commit ?? (created as Commit);
    console.log(`Committed ${commit.commit_hash.slice(0, 8)}`);
  }

  for (const tag of tags) {
    try {
      await call("POST", `/repos/-/${FEEDBACK_PROMPT_NAME}/tags`, {
        tag_name: tag,
        commit_id: commit.id,
      });
    } catch (error) {
      if (statusOf(error) !== 409) throw error;
      await call("PATCH", `/repos/-/${FEEDBACK_PROMPT_NAME}/tags/${tag}`, { commit_id: commit.id });
    }
    console.log(`Tag ${tag} → ${commit.commit_hash.slice(0, 8)}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const hint =
    statusOf(error) === 401 || statusOf(error) === 403
      ? " (check LANGSMITH_API_KEY: LangSmith → Settings → API Keys)"
      : "";
  console.error(message + hint);
  process.exitCode = 1; // not process.exit(): open fetch handles crash Node on Windows
});
