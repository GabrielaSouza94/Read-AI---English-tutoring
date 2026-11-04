/**
 * Alert email through Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Without a verified domain, Resend only delivers from onboarding@resend.dev to the account
 * owner's own address, which is all alerts need.
 * External call policy (S-2): 10 s timeout, one retry after 500 ms on a network error, 429 or 5xx.
 */

import { loadMonitoringConfig } from "./config";

const ENDPOINT = "https://api.resend.com/emails";
const FROM = "Read AI alerts <onboarding@resend.dev>";
const TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 500;

export type EmailMessage = { to: string; subject: string; text: string };

type Fetch = (input: string, init: RequestInit) => Promise<Response>;

export class EmailError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "EmailError";
  }
}

const retryable = (status: number) => status === 429 || status >= 500;

export async function sendEmail(
  apiKey: string,
  message: EmailMessage,
  {
    fetchImpl = fetch,
    retryDelayMs = RETRY_DELAY_MS,
  }: { fetchImpl?: Fetch; retryDelayMs?: number } = {},
): Promise<void> {
  const attempt = async () => {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      // The body is not logged: it can echo the recipient address.
      throw new EmailError(`Resend returned ${response.status}`, response.status);
    }
  };

  try {
    await attempt();
  } catch (error) {
    if (error instanceof EmailError && error.status !== undefined && !retryable(error.status)) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    await attempt();
  }
}

/** The alert channel: an email to ALERT_EMAIL, with the environment in the subject. */
export function alertNotifier(source: Record<string, unknown>, appEnv: string) {
  const { alertEmail, resendApiKey } = loadMonitoringConfig(source);
  return async (alert: { subject: string; text: string }) => {
    if (!alertEmail || !resendApiKey) {
      throw new Error("ALERT_EMAIL or RESEND_API_KEY is not set");
    }
    await sendEmail(resendApiKey, {
      to: alertEmail,
      subject: `[Read AI ${appEnv}] ${alert.subject}`,
      text: alert.text,
    });
  };
}
