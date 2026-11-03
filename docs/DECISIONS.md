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

## 2026-11-02: Open model instead of Gemini (to revisit in T0.6 / T3.5)

- **Status:** Bookmarked, not decided. The project stays on Gemini 2.5 Flash Lite for now.
- **Context:** Gemini writes the feedback and picks the words to highlight (BR-14; two calls per attempt). It does not decide pass or fail, and a fallback covers outages. The question was whether an open model, such as Nous Research's Hermes, could replace it.
- **Options:**
  - **A. Open model on Cloudflare Workers AI.** An `AI` binding instead of an API key, with no extra vendor. The catalog has about 40 open models (Llama 3.3 70B, Gemma 4 26B, Qwen3 30B, gpt-oss and more) but **no Hermes** (checked 2026-11-02). This is the best fit.
  - **B. Hermes through a hosted provider** (OpenRouter, Nous API). Still an outside vendor with a key; little gain over Gemini.
  - **C. Hermes on a personal computer** behind a Cloudflare Tunnel. Not viable for a public site: it needs the machine online 24/7, and it adds latency and security risk.
- **Trade-offs:** Cost barely changes (Gemini is under $1 a month in the TRD). Privacy improves slightly with option A, since Google is no longer a third party. The risk is quality: the model must return valid JSON (feedback, plus highlighted words in text order) within the 15-second timeout.
- **To verify:** In T0.6 or T3.5, run the same fixture attempts through two or three Workers AI models, with Gemini as the baseline, and compare JSON validity, feedback quality and latency. If an open model wins, update BR-14, the BRD restrictions and decisions log, TRD §3.2, §6.3, costs and third parties, `product-documentation.md`, `task-breakdown.md` (T3.5, S-2, T0.2), the privacy notice and `app/lib/config.ts`.
