# Polymorph UI — Codex Working Agreement

## Start here

Before changing code, read this file and `DESIGN.md` in full. Then read the GitHub issue assigned to the task. The issue defines the immediate scope; `DESIGN.md` defines the product and architecture boundaries.

## Product mission

Polymorph UI is an adaptive technical-documentation reader. It detects privacy-safe signs of reading friction and transforms a dense learning page into a clearer, focused, interactive experience without diagnosing the learner or removing the learning challenge.

The MVP must demonstrate one complete journey:

1. A learner opens dense API documentation.
2. The learner shows observable friction, such as repeated highlighting, rapid scroll reversals, long jargon hover dwell, inactivity, or repeated quiz errors.
3. The app classifies telemetry-triggered friction using deterministic rules.
4. A session-level gate prevents repeated proactive prompts after declines.
5. Assistance consent routes an eligible episode to a manual offer, cancellable automatic notice, or no proactive transition.
6. The learner may also request help directly, even while telemetry is paused or proactive support is disabled.
7. GPT-5.6 returns a schema-validated adaptation plan.
8. The UI morphs through approved components into a simplified, focused view.
9. The learner completes a micro-quiz or advances through the material.
10. The app explains the adaptation and allows the learner to dismiss, pause, show original, or reset it.

## Architecture guardrails

- Do not execute arbitrary model-generated JavaScript, React, HTML, CSS, Tailwind classes, shell commands, or executable code.
- The model must return structured data validated on the server with Zod.
- Render adaptations through a controlled registry of approved React components and presets.
- Keep OpenAI API calls in server-only routes. Never expose API keys or secrets to the client.
- Implement deterministic classification before any telemetry-triggered AI adaptation.
- A direct learner request may authorize adaptation without telemetry eligibility.
- Provide deterministic fallback adaptations for both telemetry-triggered and learner-requested paths.
- Do not add authentication, databases, external document ingestion, or user accounts to the MVP unless an issue explicitly authorizes them.
- Do not add a production dependency without explaining why it is required in the pull request.

## Responsible telemetry rules

- Collect only interaction summaries required for the demo.
- Never record raw keystrokes, clipboard contents, full browsing history, camera data, microphone data, biometric data, wallet data, identity data, or medical information.
- Do not label or diagnose emotions, ADHD, dyslexia, disability, stress, or mental state.
- Use terms such as `reading friction`, `support state`, `possible confusion`, and `learning-state signal`.
- Prefer local aggregation in the browser. Send only compact numeric summaries to the server.
- Keep telemetry collection status separate from assistance consent mode.
- Pausing telemetry must stop collection immediately without disabling `Help me with this section`.
- Assistance consent and decline state must not change deterministic friction eligibility.
- Genuine and demo telemetry must use the same shared contract and state path.

## Consent, manual help, and decline rules

- The default consent mode is `offer`, which shows `Adapt now` and `Stay in standard view` before morphing.
- `automatic` requires explicit learner opt-in and a visible, cancellable notice containing `Stay in standard view`.
- `manual-only` must not show proactive offers or automatically transition.
- `Help me with this section` is a direct learner authorization and must work in every consent mode and while telemetry is paused.
- Manual help bypasses telemetry eligibility, consent routing, cooldowns, and proactive suppression.
- Manual help never bypasses grounding, Zod validation, safety rules, or fallback behavior.
- Declining an offer or automatic notice permanently suppresses that episode for the session.
- The first decline starts a five-minute proactive cooldown.
- The second decline disables proactive offers and automatic notices for the remainder of the session.
- Manual help remains available during cooldown and after proactive assistance is disabled.

## Dynamic adaptation UX rules

- A dynamic adaptation must change presentation, instruction, or interaction—not only color or font size.
- Every adaptation must preserve the source content, source-section identity, reading position, and keyboard focus.
- The learner must be able to dismiss, pause, reset, and view the original text.
- Respect `prefers-reduced-motion`; motion must never be required to understand the content.
- Adaptation modes must come from the approved enum in `DESIGN.md`.
- One plan may select one primary mode and no more than two supporting modes.
- Do not stack every adaptive component onto the screen. The result must remain coherent and calm.
- The model supplies structured content; React controls layout, transitions, component selection, and execution.
- The model may not choose CSS classes, animation values, arbitrary component names, or layout measurements.
- Demo mode must enter through the same telemetry, classifier, gate, consent, API, registry, and recovery state machine as genuine telemetry.
- Every diagram must have a text alternative.
- Every adaptation must include a plain-language reason.

## UX and accessibility rules

- Meet keyboard, focus, contrast, semantic HTML, 200% zoom, and reduced-motion expectations.
- Do not rely on color alone to communicate state.
- Preserve the learner's place in the document when the layout changes.
- Avoid surprise audio. Audio is outside the MVP.
- The adapted view should reduce cognitive load without infantilizing the learner.
- Every adaptation must include a plain-language reason.
- The learner must never be trapped in an adapted state.

## Engineering conventions

- Use Next.js App Router, React, strict TypeScript, Tailwind CSS, Zod, and the official OpenAI JavaScript/TypeScript SDK.
- Use npm and commit `package-lock.json`. Do not introduce another package manager.
- Prefer server components by default; add `"use client"` only where browser events or state require it.
- Keep shared types in `src/lib/contracts/` and avoid duplicating telemetry, consent, gate, or adaptation interfaces.
- Keep model prompts in `src/lib/ai/` rather than embedding long prompt strings in route handlers.
- Keep demo content in version-controlled fixtures under `src/content/`.
- Keep components small, composable, and typed. Avoid `any`.
- Use descriptive names that reflect learning behavior rather than psychological assumptions.

## Expected project structure

```text
src/
  app/
    api/adapt/route.ts
    page.tsx
  components/
    reader/
    adaptive/
    controls/
  content/
  hooks/
  lib/
    ai/
    contracts/
    telemetry/
    adaptation/
  test/
```

Codex may adjust this structure only when the issue requires it and the change remains consistent with `DESIGN.md`.

## Validation requirements

Run the relevant commands before completing a task:

```bash
npm ci
npx prettier --check AGENTS.md DESIGN.md
npm run lint
npm run typecheck
npm test
NODE_ENV=production npm run build
```

Do not claim validation that was not run.

For UI work, verify at minimum:

- Keyboard-only navigation
- Mobile and desktop layouts
- 200% zoom
- Reduced-motion behavior
- Baseline-to-adapted transition
- Manual offer acceptance and decline
- Automatic notice acceptance and decline
- Manual-only behavior with no proactive transition
- Manual help while telemetry is paused
- Manual help while proactive assistance is suppressed
- Same-episode and session-level decline suppression
- Reset, dismiss, show-original, and pause controls
- Scroll and focus restoration
- Diagram text alternatives
- AI failure fallback for both request paths

## Git and pull-request expectations

- Work from one GitHub issue per branch.
- Name branches `issue-<number>-<short-description>`.
- Keep changes within issue scope.
- Do not commit secrets, generated build folders, or `.env.local`.
- Pull requests must explain what changed, why, how it was tested, and any remaining risk.
- Update `DESIGN.md` when an accepted architectural decision changes.
- Reference the issue in the pull request body with `Closes #<number>` when appropriate.

## Definition of done

A task is complete only when its acceptance criteria are met, formatting, TypeScript, lint, relevant tests, and production build checks pass, the UI has been manually exercised where applicable, and the implementation preserves the privacy, accessibility, learner-control, decline-suppression, and architecture guardrails above.
