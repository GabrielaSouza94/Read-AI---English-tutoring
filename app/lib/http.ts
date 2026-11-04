/**
 * External call policy (S-2): a timeout per attempt, and one retry after a short delay on a
 * network error, timeout, 429 or 5xx. A 4xx other than 429 is not retried.
 */

export type Fetch = (input: string, init: RequestInit) => Promise<Response>;

export type CallPolicy = { timeoutMs: number; retryDelayMs?: number; fetchImpl?: Fetch };

export class ProviderError extends Error {
  constructor(
    readonly provider: string,
    message: string,
    readonly status?: number,
  ) {
    super(`${provider}: ${message}`);
    this.name = "ProviderError";
  }
}

const retryable = (status: number) => status === 429 || status >= 500;

/**
 * Calls `url` and returns the first OK response. Throws ProviderError after the retry fails.
 * Error bodies are never included: they can echo request data.
 */
export async function callWithRetry(
  provider: string,
  url: string,
  init: RequestInit,
  { timeoutMs, retryDelayMs = 500, fetchImpl = fetch }: CallPolicy,
): Promise<Response> {
  const attempt = async () => {
    let response: Response;
    try {
      response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw new ProviderError(
        provider,
        timedOut ? `timed out after ${timeoutMs} ms` : "network error",
      );
    }
    if (!response.ok) {
      throw new ProviderError(provider, `returned ${response.status}`, response.status);
    }
    return response;
  };

  try {
    return await attempt();
  } catch (error) {
    if (error instanceof ProviderError && error.status !== undefined && !retryable(error.status)) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    return attempt();
  }
}
