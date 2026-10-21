# Setting up VS Code + Claude Code for Read AI

## 1. One-time machine setup

1. Install **VS Code**, **Git** and **Node.js 22+**.
2. In VS Code → Extensions, install **Claude Code** (by Anthropic). When you open this folder, VS Code also suggests
   the other recommended extensions: ESLint, Prettier, Tailwind CSS, Vitest, Playwright and GitLens. Accept them.
3. Open the Claude Code panel and sign in with your Claude account (Pro/Max) or an API key.
4. Optional: copy `global/CLAUDE.md` to `~/.claude/CLAUDE.md` (Windows: `%USERPROFILE%\.claude\CLAUDE.md`)
   for preferences that apply to every project, then delete the `global/` folder from the project.

## 2. First run

```bash
npm install
npx playwright install           # browsers for the E2E tests
cp .dev.vars.example .dev.vars   # local secrets (filled in from T0.2)
npm test && npm run dev
```

For CI and deployment setup (GitHub secrets, environments, approvals), see `docs/DEPLOYMENT.md`.

## 3. The daily loop

1. `/plan <task id or feature>` → Claude proposes small tasks → approve → they land in `docs/PLAN.md`.
2. `/next` → Claude implements one task with a test and runs typecheck, lint and tests.
3. Review the diff in VS Code, then commit (`git commit`). Small commits make it easy to undo.
4. `/review` before merging or pushing.
5. `/clear` between unrelated tasks to keep Claude's context clean.

Tip: press **Shift+Tab** in Claude to switch to Plan Mode for anything big.

## 4. What each file does

| File                          | Purpose                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| `CLAUDE.md`                   | Project memory: stack, commands, rules. Read every session.              |
| `.claude/settings.json`       | Permissions (allowed / ask / denied commands) and hooks. Shared via git. |
| `.claude/settings.local.json` | Your personal overrides (create if needed; git-ignored).                 |
| `.claude/hooks/format.mjs`    | Auto-runs Prettier on every file Claude edits.                           |
| `.claude/commands/*.md`       | Custom slash commands: `/plan`, `/next`, `/review`, `/fix-tests`.        |
| `.claude/agents/*.md`         | Subagents: `code-reviewer`, `test-writer`.                               |
| `.mcp.json`                   | MCP servers (external tools). Empty by default.                          |
| `docs/SPEC.md`                | Points to the specification in `Product materials/`.                     |
| `docs/PLAN.md`                | Task checklist Claude works through.                                     |
| `docs/DECISIONS.md`           | Why things were built the way they are.                                  |
| `docs/DEPLOYMENT.md`          | Environments, CI, rollback and migration rules.                          |
| `.vscode/`                    | Recommended extensions and format-on-save.                               |

## 5. Adding MCP servers (optional)

Add tools with the CLI, for example `claude mcp add --scope project <name> -- <command>`. This writes to `.mcp.json`.
Run `/mcp` inside Claude to see the connected servers.

## Notes

- If the format hook fails, check that `node` is on PATH. Otherwise, remove the `hooks` block from `.claude/settings.json`.
- Treat `CLAUDE.md` as a living file: every time Claude repeats a mistake, add a rule.
