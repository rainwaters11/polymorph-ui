---
name: build-adaptation-engine
description: Build the server-side GPT-5.6 adaptation endpoint for Polymorph UI using structured output, Zod validation, prompt guardrails, and deterministic fallback behavior.
---

# Build the adaptation engine

1. Read the contracts, strategic filter, safety model, and fallback requirements in `DESIGN.md`.
2. Keep all OpenAI calls server-side.
3. Accept only a compact friction assessment plus the relevant source-document section.
4. Use the official OpenAI SDK and the model required by the hackathon environment.
5. Require a structured `AdaptationPlan` and validate it with Zod.
6. Prompt the model to:
   - reason from observed interaction summaries
   - preserve instructional challenge
   - select a high-impact approved adaptation
   - avoid diagnosis and emotional certainty
   - stay grounded in the supplied source text
7. Do not return executable code, arbitrary HTML, styles, or component names outside the approved enum.
8. Handle missing keys, timeouts, malformed output, and model errors.
9. Return a deterministic fallback plan when validation or the API fails.
10. Add tests with mocked model responses for valid, invalid, timeout, and fallback paths.
11. Run lint, typecheck, tests, and build.
