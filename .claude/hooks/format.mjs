// Claude Code hook: auto-format any file Claude edits with Prettier.
// Receives the tool call as JSON on stdin. Always exits 0 so it never blocks Claude.
import { spawnSync } from "node:child_process";

const FORMATTABLE = /\.(ts|tsx|js|mjs|cjs|json|jsonc|css|md|yml|yaml)$/;

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const path = JSON.parse(input)?.tool_input?.file_path ?? "";
    if (FORMATTABLE.test(path)) {
      spawnSync("npx", ["--no-install", "prettier", "--write", "--ignore-unknown", path], {
        cwd: process.env.CLAUDE_PROJECT_DIR,
        shell: process.platform === "win32",
        stdio: "ignore",
      });
    }
  } catch {
    // Never block Claude on a formatting failure.
  }
  process.exit(0);
});
