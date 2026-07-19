# Polymorph UI — Codex Working Agreement

## Start here

Before changing code, read this file and `DESIGN.md` in full. Then read the GitHub issue assigned to the task. The issue defines the immediate scope; `DESIGN.md` defines the product and architecture boundaries.

## Product mission

Polymorph UI is an adaptive technical-documentation reader. It detects privacy-safe signs of reading friction and transforms a dense learning page into a clearer, focused, interactive experience without diagnosing the learner or removing the learning challenge.

The MVP must demonstrate one complete journey:

1. A learner opens dense API documentation.
2. The learner shows observable friction, such as repeated highlighting, rapid scroll reversals, long jargon hover dwell, inactivity, or repeated quiz errors.
3. The app classifies the friction using deterministic rules.
4. The learner receives an adaptation offer unless automatic assistance was explicitly enabled.
5. GPT-5.6 returns a schema-validated adaptation plan.
6. The UI morphs through approved components into a simplified, focused view.
7. The learner completes a micro-quiz or advances through the material.
8. The app explains the adaptation and allows the learner to dismiss, pause, show original, or reset it.

## Architecture guardrails

- Do not execute arbitrary model-generated JavaScript, React, HTML, CSS, Tailwind classes, shell commands, or executable code.
- The model must return structured data validated on the server with Zod.
- Render adaptations through a controlled registry of approved React components and presets.
- Keep OpenAI API calls in server-only routes. Never expose API keys or secrets to the client.
- Implement deterministic classification before requesting an AI adaptation.
- Provide a deterministic fallback adaptation when the AI route is unavailable or invalid.
- Do not add authentication, databases, external document ingestion, or user accounts to the MVP unless an issue explicitly authorizes them.
- Do not add a production dependency without explaining why it is required in the pull request.

## Responsible telemetry rules

- Collect only interaction summaries required for the demo.
- Never record raw keystrokes, clipboard contents, full browsing history, camera data, microphone data, biometric data, wallet data, identity data, or medical information.
- Do not label or diagnose emotions, ADHD, dyslexia, disability, stress, or mental state.
- Use terms such as `reading friction`, `support state`, `possible confusion`, and `learning-state signal`.
- Prefer local aggregation in the browser. Send only compact numeric summaries to the server.
- Make adaptation visible and reversible. Include controls to pause telemetry, reset the view, and return to the original document.
- Genuine and demo telemetry must use the same shared contract and state path.

## Dynamic adaptation UX rules

- A dynamic adaptation must change presentation, instruction, or interaction—not only color or font size.
- Every adaptation must preserve the source content, source-section identity, reading position, and keyboard focus.
- The learner must be able to dismiss, pause, reset, and view the original text.
- Keep an explicit assistance consent mode: the default manual-offer mode must show an `Adapt now` or `Stay in standard view` choice before morphing, while automatic mode requires explicit learner opt-in and a short visible notice.
- Do not let assistance consent change deterministic friction eligibility; it determines the post-eligibility transition path only.
- Respect `prefers-reduced-motion`; motion must never be required to understand the content.
- Adaptation modes must come from the approved enum in `DESIGN.md`.
- One plan may select one primary mode and no more than two supporting modes.
- Do not stack every adaptive component onto the screen. The result must remain coherent and calm.
- The model supplies structured content; React controls layout, transitions, component selection, and execution.
- The model may not choose CSS classes, animation values, arbitrary component names, or layout measurements.
- Demo mode must enter through the same telemetry, classifier, consent, API, registry, and recovery state machine as genuine telemetry.
- Every diagram must have a text alternative.
- Every adaptation must include a plain-language reason.

## UX and accessibility rules

- Meet keyboard, focus, contrast, semantic HTML, 200% zoom, and reduced-motion expectations.
- Do not rely on color alone to communicate state.
- Preserve the learner's place in the document when the layout changes.
- Avoid surprise audio. Audio is outside the MVP.
- The adapted view should reduce cognitive load without infantilizing the learner.
- Every adaptation must include a plain-language reason, for example: `We simplified this section because you revisited it several times.`
- The learner must never be trapped in an adapted state.

## Engineering conventions

- Use Next.js App Router, React, strict TypeScript, Tailwind CSS, Zod, and the official OpenAI JavaScript/TypeScript SDK.
- Use npm and commit `package-lock.json`. Do not introduce another package manager.
- Prefer server components by default; add `"use client"` only where browser events or state require it.
- Keep types in `src/lib/contracts/` and avoid duplicating telemetry or adaptation interfaces.
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

After the scaffold exists, run the relevant commands before completing a task:

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

If a script does not yet exist, add it when it belongs to the issue or clearly report that it is missing. Do not claim validation that was not run.

For UI work, verify at minimum:

- Keyboard-only navigation
- Mobile and desktop layouts
- 200% zoom
- Reduced-motion behavior
- Baseline-to-adapted transition
- Adaptation offer and decline path
- Reset, dismiss, show-original, and pause controls
- Scroll and focus restoration
- Diagram text alternatives
- AI failure fallback

## Git and pull-request expectations

- Work from one GitHub issue per branch.
- Name branches `issue-<number>-<short-description>`.
- Keep changes within issue scope.
- Do not commit secrets, generated build folders, or `.env.local`.
- Pull requests must explain what changed, why, how it was tested, and any remaining risk.
- Update `DESIGN.md` when an accepted architectural decision changes.
- Reference the issue in the pull request body with `Closes #<number>` when appropriate.

## Definition of done

A task is complete only when its acceptance criteria are met, TypeScript and lint checks pass, relevant tests pass, the UI has been manually exercised where applicable, and the implementation preserves the privacy, accessibility, learner-control, and architecture guardrails above.
