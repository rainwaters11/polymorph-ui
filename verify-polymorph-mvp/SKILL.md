---
name: verify-polymorph-mvp
description: Verify the complete Polymorph UI hackathon MVP and produce a readiness report. Use before deployment, demo recording, pull-request merge, or Devpost submission.
---

# Verify the Polymorph UI MVP

1. Read `AGENTS.md`, `DESIGN.md`, and all open MVP issues.
2. Install dependencies and run:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
3. Exercise the primary journey:
   - baseline dense document
   - friction trigger
   - deterministic classification
   - one adaptation request
   - validated adapted UI
   - successful micro-quiz
   - recovery
   - reset to baseline
4. Repeat with the OpenAI route unavailable and verify local fallback.
5. Check keyboard navigation, visible focus, contrast, mobile layout, and reduced motion.
6. Confirm telemetry pause/reset and the absence of raw keystroke or sensitive-data collection.
7. Confirm no secret appears in client bundles, logs, fixtures, or committed files.
8. Verify the public deployment from a clean browser session.
9. Produce a readiness report with:
   - passed checks
   - failed checks
   - blockers
   - non-blocking risks
   - exact demo trigger sequence
   - recommended recording order
10. Do not mark ready when a blocker remains.
