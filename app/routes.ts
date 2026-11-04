import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/health", "routes/api.health.ts"),
  route("api/debug/error", "routes/api.debug.error.ts"),
  route("api/debug/alert", "routes/api.debug.alert.ts"),
] satisfies RouteConfig;
