/**
 * GET /api/debug/prompt pulls this environment's feedback prompt from LangSmith Prompt Hub and
 * renders it with the fixture attempt (T0.6 acceptance: the prompt pulls from a Worker). Calls no
 * LLM. Not available in production.
 */
import { env } from "cloudflare:workers";

import { loadLangSmithConfig } from "~/lib/config";
import { apiError } from "~/lib/errors";
import { pullPrompt } from "~/lib/langsmith";
import { log } from "~/lib/log";
import { templateVariables } from "~/lib/mustache";
import { feedbackVariables, renderPrompt, SAMPLE_FEEDBACK_INPUT } from "~/lib/prompts";

export async function loader() {
  if (env.APP_ENV === "production") return apiError("NOT_FOUND", "Not found");
  const config = loadLangSmithConfig(env as unknown as Record<string, unknown>);

  const started = Date.now();
  try {
    const { commitHash, prompt } = await pullPrompt(config.apiKey, config.feedbackPromptId);
    const pullMs = Date.now() - started;
    const messages = renderPrompt(prompt, feedbackVariables(SAMPLE_FEEDBACK_INPUT));
    return Response.json({
      identifier: config.feedbackPromptId,
      commitHash,
      pullMs,
      variables: [...new Set(prompt.messages.flatMap((m) => templateVariables(m.template)))],
      outputSchema: prompt.outputSchema ?? null,
      messages,
    });
  } catch (error) {
    log.error("prompt_pull_failed", { identifier: config.feedbackPromptId, error });
    const message = error instanceof Error ? error.message : "Prompt pull failed";
    return apiError("PROVIDER_ERROR", message, { retryable: true });
  }
}
