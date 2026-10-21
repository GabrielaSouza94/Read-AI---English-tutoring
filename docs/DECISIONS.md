# Decision log

> One entry per significant technical choice. Helps Claude (and teammates) understand _why_.
> Product and scope decisions are logged in the BRD (`Product materials/business-requirements.md` §12).

## 2026-10-21: React Router 8 instead of 7

- **Context:** The TRD names React Router 7. By October 2026, React Router 8.4 is the current major, and it is what Cloudflare's scaffolder generates.
- **Decision:** Build on React Router 8 in framework mode with server-side rendering.
- **Alternatives:** Pinning React Router 7 would start a new project one major version behind.
- **Consequences:** The architecture in the TRD is unchanged. When the TRD's stack table is next revised, update it to version 8.

## 2026-10-21: Standalone repository

- **Context:** The product documents live in the `past-products` portfolio repo. GitHub Actions only runs workflows from a repo's root.
- **Decision:** This folder is its own git repository, with CI in its own `.github/workflows`.
- **Alternatives:** A subfolder of `past-products`, with a path-filtered workflow at its root.
- **Consequences:** `past-products` must ignore this folder, or reference it as a submodule, so that it does not commit the nested repo by accident.

## 2026-10-21: Python starter template replaced

- **Context:** A generic Python/FastAPI starter template (Ollama, Chroma) had been copied into the folder.
- **Decision:** Remove the Python code and keep the workflow parts: the `/plan`, `/next`, `/review` and `/fix-tests` commands, the subagents, `docs/` and the format hook. Adapt them to npm, Vitest, ESLint and Prettier.
- **Consequences:** `global/CLAUDE.md` holds personal preferences from the template and is left as is.
