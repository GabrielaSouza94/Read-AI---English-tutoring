/** API error responses in the S-1 format (task-breakdown.md §3). */

export const ERROR_STATUS = {
  VALIDATION_FAILED: 400,
  CAPTCHA_FAILED: 403,
  CONSENT_REQUIRED: 403,
  NOT_FOUND: 404,
  STALE_REVIEW: 409,
  AUDIO_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  PROVIDER_ERROR: 502,
  DEMO_PAUSED: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    fields?: Record<string, string>;
    /** Quoted by a user reporting a problem; matches the `requestId` in the logs. */
    requestId?: string;
  };
};

export function apiError(
  code: ErrorCode,
  message: string,
  options: { retryable?: boolean; fields?: Record<string, string>; requestId?: string } = {},
): Response {
  const body: ApiErrorBody = {
    error: { code, message, retryable: options.retryable ?? false },
  };
  if (options.fields) body.error.fields = options.fields;
  if (options.requestId) body.error.requestId = options.requestId;
  return Response.json(body, {
    status: ERROR_STATUS[code],
    headers: { "Cache-Control": "no-store" },
  });
}

export function internalError(requestId: string): Response {
  return apiError("INTERNAL", "Something went wrong. Please try again.", {
    retryable: true,
    requestId,
  });
}
