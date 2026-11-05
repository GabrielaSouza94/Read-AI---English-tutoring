import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("start", "routes/start.tsx"),
  route("api/session/start", "routes/api.session.start.ts"),
  route("api/health", "routes/api.health.ts"),
  route("api/debug/error", "routes/api.debug.error.ts"),
  route("api/debug/alert", "routes/api.debug.alert.ts"),
  route("api/debug/tts", "routes/api.debug.tts.ts"),
  route("api/debug/azure-spike", "routes/api.debug.azure-spike.ts"),
  route("api/debug/prompt", "routes/api.debug.prompt.ts"),
] satisfies RouteConfig;
