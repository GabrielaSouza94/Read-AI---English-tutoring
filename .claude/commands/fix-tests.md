---
description: Run the test suite and fix failures without weakening tests
---

Run `npm test` (and `npm run test:e2e` if the change touches pages). For each failure: explain the root cause in one line, then fix the CODE (not the test),
unless the test itself is clearly wrong — in that case explain why and ask before changing it.
Re-run until green, then summarize what changed.
