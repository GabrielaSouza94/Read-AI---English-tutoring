import { createRequestHandler } from "react-router";

import { runAlertCheck } from "~/lib/alerts";
import { loadMonitoringConfig } from "~/lib/config";
import { alertNotifier } from "~/lib/email";
import { internalError } from "~/lib/errors";
import { clientIp } from "~/lib/ip";
import { checkApiRateLimit } from "~/lib/limits";
import { log } from "~/lib/log";
import { recordRequest } from "~/lib/metrics";
import { finaliseResponse, isApiPath, routeOf, withRequestId } from "~/lib/request";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    const started = new Date();
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    const requestLog = log.with({ requestId, route: routeOf(url), method: request.method });

    let response: Response;
    try {
      response =
        (await checkApiRateLimit(env.API_RATE_LIMITER, url, clientIp(request))) ??
        (await requestHandler(withRequestId(request, requestId)));
    } catch (error) {
      // Errors inside loaders and actions are logged by handleError in entry.server.tsx.
      requestLog.error("unhandled_exception", { error });
      response = isApiPath(url.pathname)
        ? internalError(requestId)
        : new Response("Something went wrong.", { status: 500 });
    }
    response = finaliseResponse(response, url, requestId);

    const status = response.status;
    const fields = { status, latencyMs: Date.now() - started.getTime() };
    if (status >= 500) requestLog.error("request", fields);
    else requestLog.info("request", fields);

    ctx.waitUntil(
      recordRequest(env.DB, started, status).catch((error: unknown) =>
        requestLog.warn("metrics_write_failed", { error }),
      ),
    );
    return response;
  },

  async scheduled(controller, env, ctx) {
    const { dailySttMinutesCap } = loadMonitoringConfig(env as unknown as Record<string, unknown>);
    const cronLog = log.with({ cron: controller.cron });
    ctx.waitUntil(
      runAlertCheck({
        db: env.DB,
        kv: env.KV,
        notify: alertNotifier(env as unknown as Record<string, unknown>, env.APP_ENV),
        dailySttMinutesCap,
        now: new Date(controller.scheduledTime),
        log: cronLog,
      })
        .then((sent) => cronLog.info("alert_check", { sent: sent.map((alert) => alert.kind) }))
        .catch((error: unknown) => cronLog.error("alert_check_failed", { error })),
    );
  },
} satisfies ExportedHandler<Env>;
