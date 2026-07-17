#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-rainwaters11/polymorph-ui}"

command -v gh >/dev/null 2>&1 || { echo "GitHub CLI (gh) is required."; exit 1; }
gh auth status >/dev/null

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

cat > "$tmpdir/issue-1.md" <<'POLYMORPH_ISSUE_1'
## Goal
Create the minimum project foundation so the rest of the team can build in parallel without waiting on Misty during her Sunday–Monday travel window.

## Suggested owner
**Misty — setup lead (lightweight, front-loaded responsibility)**

## Target
Complete by **Saturday, July 18, 2026 at 12:00 PM Central**. After this handoff, no Sunday or Monday implementation task should depend on Misty.

## Scope
- Scaffold a Next.js App Router project with React, strict TypeScript, Tailwind CSS, and npm.
- Commit `package-lock.json` and scripts for `dev`, `lint`, `typecheck`, `test`, and `build`.
- Add `AGENTS.md`, `DESIGN.md`, and repo-scoped Codex skills under `.agents/skills/`.
- Add `.env.example` with `OPENAI_API_KEY=`.
- Add a basic README shell with setup commands and links to the architecture documents.
- Use `main` as the integration branch and one issue branch per task.

## Locked MVP decisions
- Adaptive technical-documentation reader
- No authentication or database
- No arbitrary generated-code execution
- Structured GPT output validated with Zod
- Approved adaptive component registry
- Aggregated privacy-safe telemetry

## Acceptance criteria
- [ ] `npm install` succeeds.
- [ ] `npm run dev` starts the app.
- [ ] Lint, typecheck, test, and build scripts exist.
- [ ] `AGENTS.md`, `DESIGN.md`, and all required `SKILL.md` files are committed.
- [ ] `.env.example` exists and `.env.local` remains ignored.
- [ ] README setup instructions work from a fresh clone.
- [ ] The PR records exact dependency versions.

## Out of scope
Authentication, persistence, multiple documents, production analytics, and deployment.

## Handoff
Once merged, Vanessa leads frontend coordination, Dante leads AI/backend coordination, and Ed leads telemetry and QA. Misty shifts to architecture and final-submission review only.
POLYMORPH_ISSUE_1
gh issue create --repo "$REPO" --title "foundation: scaffold the MVP and repository standards" --body-file "$tmpdir/issue-1.md"

cat > "$tmpdir/issue-2.md" <<'POLYMORPH_ISSUE_2'
## Goal
Create the convincing baseline experience that judges see before Polymorph UI transforms the page.

## Suggested owner
**Vanessa — frontend lead**

## Depends on
Foundation scaffold.

## Demo lesson
**API rate limiting and exponential backoff**

## Scope
- Create a version-controlled technical-document fixture.
- Include dense prose, a table of contents, jargon, a `429 Too Many Requests` explanation, a code example, jitter, and one baseline quiz.
- Build the responsive baseline reader.
- Add section IDs and glossary-term markers required by telemetry.
- Include a visible progress indicator.
- Preserve semantic document structure.

## Acceptance criteria
- [ ] The document looks intentionally dense but professional.
- [ ] Every tracked paragraph has a stable section ID.
- [ ] Glossary terms have stable identifiers.
- [ ] The baseline quiz records correct and incorrect attempts through a typed callback.
- [ ] The reader works on desktop and mobile.
- [ ] Keyboard navigation and visible focus work.
- [ ] Content is local and does not depend on an external API.
- [ ] Component tests cover navigation and quiz basics.

## Out of scope
Adapted layouts, GPT requests, friction scoring, and deployment.
POLYMORPH_ISSUE_2
gh issue create --repo "$REPO" --title "content-ui: build the dense documentation lesson and baseline reader" --body-file "$tmpdir/issue-2.md"

cat > "$tmpdir/issue-3.md" <<'POLYMORPH_ISSUE_3'
## Goal
Capture the smallest set of observable interaction summaries required to demonstrate reading friction.

## Suggested owner
**Ed — telemetry developer**

## Scope
Build `useReadingTelemetry` and supporting utilities for:
- Repeated selection of the same section
- Scroll-direction reversals
- Extended hover or focus on glossary terms
- Inactivity while a section remains visible
- Incorrect quiz attempts
- Section visibility duration
- Pause and reset behavior

## Privacy requirements
- No raw keystrokes
- No clipboard contents
- No full browsing history
- No camera, microphone, or biometric inputs
- No emotion, disability, or medical labels
- Aggregate raw browser events locally

## Acceptance criteria
- [ ] Emits the shared `ReadingTelemetry` type.
- [ ] Uses stable section IDs from the content fixture.
- [ ] Events are debounced or batched.
- [ ] Pause immediately stops collection.
- [ ] Reset clears counters and timers.
- [ ] Cleanup removes listeners and timers.
- [ ] Unit tests cover each signal and combined behavior.
- [ ] A small development-only telemetry inspector can be toggled for the demo team.

## Out of scope
AI calls, psychological inference, database storage, and cross-session tracking.
POLYMORPH_ISSUE_3
gh issue create --repo "$REPO" --title "telemetry: implement privacy-safe reading-friction signals" --body-file "$tmpdir/issue-3.md"

cat > "$tmpdir/issue-4.md" <<'POLYMORPH_ISSUE_4'
## Goal
Decide when an adaptation is appropriate before involving GPT-5.6.

## Suggested owner
**Ed — implementation; Dante — contract and integration review**

## Scope
- Implement the shared `FrictionAssessment` contract.
- Add configurable signal weights and thresholds.
- Return `steady`, `possible-confusion`, or `high-friction`.
- Return explainable reason codes.
- Add cooldown and duplicate-request prevention.
- Add recovery/reset behavior.

## Starting scoring proposal
- Repeated selection: +2
- Four or more scroll reversals: +2
- Jargon dwell over four seconds: +1
- Inactivity over 30 seconds: +1
- Repeated quiz failure: +3

Thresholds:
- 0–2: steady
- 3–5: possible confusion
- 6+: eligible for adaptation

## Acceptance criteria
- [ ] Pure deterministic function with no network dependency.
- [ ] Every non-steady result includes reason codes.
- [ ] One friction episode causes at most one adaptation request during cooldown.
- [ ] Thresholds live in one configuration module.
- [ ] Unit tests cover boundaries, combined signals, cooldown, and recovery.
- [ ] Naming avoids diagnosis or emotional certainty.

## Out of scope
Rendering adaptations and generating simplified content.
POLYMORPH_ISSUE_4
gh issue create --repo "$REPO" --title "engine: implement deterministic friction scoring and reason codes" --body-file "$tmpdir/issue-4.md"

cat > "$tmpdir/issue-5.md" <<'POLYMORPH_ISSUE_5'
## Goal
Turn an eligible friction assessment and source section into a safe, validated adaptation plan.

## Suggested owner
**Dante — lead developer and AI/backend owner**

## Scope
- Create `POST /api/adapt`.
- Add the official OpenAI SDK server configuration.
- Define the `AdaptationPlan` Zod schema.
- Add the strategic prompt filter:
  1. observed learning need
  2. instructional tension
  3. high-impact approved response
- Ground the response only in the supplied source section.
- Add a deterministic local fallback plan.
- Handle missing keys, timeouts, malformed output, and model errors.

## Safety constraints
- No arbitrary JSX, JavaScript, HTML, CSS, or Tailwind generation.
- No diagnosis or certainty about feelings.
- Only approved adaptation-mode enum values.
- Do not reveal quiz answers outside the structured quiz field.
- Never expose the API key to the client.

## Acceptance criteria
- [ ] Valid requests return a schema-valid plan.
- [ ] Invalid input returns a controlled 4xx response.
- [ ] Model errors produce a usable fallback response.
- [ ] Prompt and schema live outside the route handler.
- [ ] Tests mock valid, invalid, timeout, and fallback paths.
- [ ] Server logs contain no source secrets or sensitive raw events.

## Out of scope
UI rendering and telemetry capture.
POLYMORPH_ISSUE_5
gh issue create --repo "$REPO" --title "ai: build the GPT-5.6 structured adaptation endpoint" --body-file "$tmpdir/issue-5.md"

cat > "$tmpdir/issue-6.md" <<'POLYMORPH_ISSUE_6'
## Goal
Deliver the dramatic visual transformation without executing generated code.

## Suggested owner
**Vanessa — frontend lead**

## Scope
Implement approved adaptive components:
- `FocusReader`
- `PlainLanguagePanel`
- `GlossaryAccordion`
- `ConceptDiagram`
- `VisualStepper`
- `AdaptiveQuiz`
- `AdaptationReason`
- `ResetViewButton`
- `PauseTelemetryControl`

Build a typed registry that maps `AdaptationPlan.mode` to approved components.

## UX requirements
- Preserve the learner's source position.
- Provide `Show original wording`.
- Explain why the view changed.
- Make reset and dismissal immediate.
- Support reduced motion.
- Do not rely on color alone.
- Keep the transformation visually strong enough for the demo.

## Acceptance criteria
- [ ] Every allowed plan mode renders.
- [ ] Unknown or invalid modes fail safely.
- [ ] No `dangerouslySetInnerHTML` for model output.
- [ ] No runtime evaluation of generated code or styles.
- [ ] Keyboard and screen-size behavior is verified.
- [ ] Component tests cover mode selection, reset, dismissal, and original-text restoration.

## Out of scope
Model prompting, classifier rules, and deployment.
POLYMORPH_ISSUE_6
gh issue create --repo "$REPO" --title "ui: implement the controlled adaptive component registry" --body-file "$tmpdir/issue-6.md"

cat > "$tmpdir/issue-7.md" <<'POLYMORPH_ISSUE_7'
## Goal
Complete the one polished end-to-end story required for the hackathon demonstration.

## Suggested owners
**Dante — data and API flow**
**Vanessa — state orchestration and visual transition**

## Required flow
1. Load dense documentation.
2. Generate a repeatable friction sequence.
3. Classify it locally.
4. Send one adaptation request.
5. Validate and render the plan.
6. Complete the adaptive quiz.
7. Enter recovery state.
8. Reset to baseline.

## Scope
- Add a clear client state machine.
- Connect classifier eligibility to the API route.
- Prevent duplicate requests and stale responses.
- Add loading, success, failure, fallback, recovery, and reset states.
- Add an optional demo trigger that uses the same production state path.
- Preserve the original source text throughout.

## Acceptance criteria
- [ ] The full journey works without manual page refresh.
- [ ] Only one request occurs per friction episode.
- [ ] Stale responses cannot overwrite a reset or newer state.
- [ ] API failure renders the deterministic fallback.
- [ ] The learner can pause, dismiss, show original, and reset.
- [ ] Recovery is visually clear.
- [ ] The demo sequence is documented and repeatable.

## Out of scope
Additional use cases, multiple documents, authentication, and persistence.
POLYMORPH_ISSUE_7
gh issue create --repo "$REPO" --title "integration: connect telemetry, classification, AI, and UI recovery" --body-file "$tmpdir/issue-7.md"

cat > "$tmpdir/issue-8.md" <<'POLYMORPH_ISSUE_8'
## Goal
Make the MVP reliable enough to record and submit.

## Suggested owners
**Ed — QA and privacy verification**
**Vanessa — UI fixes and deployment support**

## Scope
- Complete unit and component test gaps.
- Add one end-to-end happy-path test if time permits.
- Verify AI-disabled fallback.
- Audit client telemetry fields.
- Test pause/reset controls.
- Test keyboard navigation, visible focus, contrast, mobile layout, and reduced motion.
- Run lint, typecheck, test, and build.
- Deploy a public production preview.
- Verify the deployment in a clean browser session.

## Acceptance criteria
- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] Tests pass.
- [ ] Production build passes.
- [ ] Public deployment loads.
- [ ] Primary demo journey works on the deployed URL.
- [ ] AI failure fallback works on the deployed URL.
- [ ] No API key or secret appears in the client.
- [ ] No raw keystrokes or sensitive data are collected.
- [ ] Accessibility blockers are resolved or documented.

## Deliverable
Post a concise readiness report with blockers, risks, exact demo trigger steps, and deployment URL.
POLYMORPH_ISSUE_8
gh issue create --repo "$REPO" --title "quality: verify accessibility, privacy, fallback, tests, and deployment" --body-file "$tmpdir/issue-8.md"

cat > "$tmpdir/issue-9.md" <<'POLYMORPH_ISSUE_9'
## Goal
Package the finished MVP into a clear, compliant, persuasive submission without making Misty a Sunday or Monday engineering blocker.

## Suggested owner
**Misty — submission owner and final architecture/governance reviewer**
**Vanessa — backup for screenshots, deployment details, and implementation updates**

## Misty's workload boundary
- Draft the README and submission outline before travel when possible.
- No Sunday or Monday implementation dependency.
- Conduct the final review and submission on Tuesday.
- Teammates add their technical notes directly to the shared draft.

## Scope
- Complete the README:
  - problem
  - solution
  - architecture
  - responsible telemetry
  - GPT-5.6 role
  - Codex role
  - local setup
  - deployed demo
  - limitations
- Preserve Codex collaboration evidence and required feedback/session information.
- Draft and record a public video no longer than three minutes.
- Capture baseline, friction, morph, quiz, recovery, and fallback visuals.
- Verify all Devpost fields, links, credits, and team information.
- Confirm the authorized submitter.

## Suggested three-minute narrative
1. Problem and learner friction
2. Dense baseline document
3. Observable friction signals
4. Deterministic classification
5. GPT-5.6 structured adaptation
6. Dramatic UI morph
7. Learner recovery
8. Privacy, safety, and Codex contribution
9. Closing impact statement

## Acceptance criteria
- [ ] README is complete and accurate.
- [ ] Deployment and repository links work publicly.
- [ ] Video is public and within the runtime limit.
- [ ] Codex and GPT-5.6 usage is concrete and visible.
- [ ] Privacy and architectural guardrails are explained.
- [ ] Required session/feedback evidence is captured.
- [ ] Submission is reviewed by at least one teammate.
- [ ] Devpost submission is completed before the deadline.
POLYMORPH_ISSUE_9
gh issue create --repo "$REPO" --title "submission: finalize README, Codex evidence, demo script, and Devpost package" --body-file "$tmpdir/issue-9.md"

echo "Created all Polymorph UI MVP issues in $REPO."
