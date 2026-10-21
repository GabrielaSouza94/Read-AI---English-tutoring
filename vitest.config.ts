import { defineConfig } from "vitest/config";

// Unit tests only. Integration tests against D1/KV (Miniflare) are added with the schema in T0.3.
export default defineConfig({
  test: {
    include: ["app/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    tsconfigPaths: true,
  },
});
