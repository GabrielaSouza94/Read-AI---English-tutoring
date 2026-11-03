import { defineConfig } from "vitest/config";

// Unit tests live next to the code in app/; integration tests (Miniflare D1, *.int.test.ts) in test/.
export default defineConfig({
  test: {
    include: ["app/**/*.test.ts", "test/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    tsconfigPaths: true,
  },
});
