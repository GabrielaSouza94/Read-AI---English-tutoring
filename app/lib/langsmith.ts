/**
 * LangSmith Prompt Hub client (TR-13). Runtime-neutral: the Worker pulls prompts, and
 * scripts/push-prompt.ts uses the same calls to upload them. Endpoints follow the LangSmith SDK.
 */
import { callWithRetry, type CallPolicy, ProviderError } from "./http";
import { parsePromptManifest, type Prompt } from "./prompts";

export const LANGSMITH_API_URL = "https://api.smith.langchain.com";

/** S-2: a prompt pull waits at most 5 seconds (then T3.5 falls back to the cached copy). */
export const PROMPT_PULL_TIMEOUT_MS = 5_000;

/** `name`, `name:tag` or `name:commit` → owner "-" (the key's own workspace), name and ref. */
export function parsePromptId(identifier: string): { name: string; ref: string } {
  const [name, ref = "latest", ...rest] = identifier.split(":");
  if (!name || !/^[\w-]+$/.test(name) || !/^[\w-]+$/.test(ref) || rest.length > 0) {
    throw new ProviderError("langsmith", "invalid prompt identifier");
  }
  return { name, ref };
}

export type PulledPrompt = { commitHash: string; prompt: Prompt };

/** Pulls one prompt commit (a tag such as `staging`, a commit hash, or `latest`). */
export async function pullPrompt(
  apiKey: string,
  identifier: string,
  policy: Partial<CallPolicy> = {},
): Promise<PulledPrompt> {
  const { name, ref } = parsePromptId(identifier);
  const response = await callWithRetry(
    "langsmith",
    `${LANGSMITH_API_URL}/commits/-/${name}/${ref}`,
    { headers: { "x-api-key": apiKey, accept: "application/json" } },
    { timeoutMs: PROMPT_PULL_TIMEOUT_MS, ...policy },
  );
  const body = (await response.json()) as { commit_hash?: unknown; manifest?: unknown };
  if (typeof body.commit_hash !== "string") {
    throw new ProviderError("langsmith", "response has no commit hash");
  }
  return { commitHash: body.commit_hash, prompt: parsePromptManifest(body.manifest) };
}
