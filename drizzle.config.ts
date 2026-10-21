import { defineConfig } from "drizzle-kit";

// Generates SQL migrations from the schema; Wrangler applies them to D1 (wired up in T0.3).
export default defineConfig({
  dialect: "sqlite",
  schema: "./app/db/schema.ts",
  out: "./drizzle/migrations",
});
