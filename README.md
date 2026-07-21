# Polymorph UI

> **A living learning interface that safely reshapes presentation, instruction, and interaction around the learner’s current needs.**

[**Open the live demo**](https://polymorph-ui-gamma.vercel.app/) · [Demo runbook](#repeatable-demo-runbook)

Polymorph UI is an adaptive technical-learning experience built for learners who may benefit from different levels of focus, pacing, explanation, visualization, or guided practice.

Most AI learning tools adapt the answer. **Polymorph UI adapts the learning environment itself.**

The system responds to privacy-safe, observable interaction friction—or to a direct learner request—and returns a controlled, reversible interface adaptation. It does not diagnose ADHD, disability, emotion, ability, or medical conditions, and it never executes model-generated React, JavaScript, HTML, CSS, or Tailwind code.

## The problem

Traditional software assumes that every learner can process the same information density, navigation structure, terminology, and interaction model.

A learner may understand the goal but still struggle because the interface presents too much competing information, unfamiliar language, unclear sequencing, or an interaction pattern that does not match what they need in that moment.

Polymorph UI treats the interface as part of the learning experience—not as a fixed container around it.

## The hackathon MVP

The MVP proves the larger platform vision through one polished use case:

**A self-paced technical-documentation reader teaching API rate limiting and exponential backoff.**

The complete demo journey is:

1. A learner opens dense but professional API documentation.
2. The learner navigates, rereads, pauses on terminology, retries a question, or selects **Help me with this section**.
3. Privacy-safe interaction summaries are evaluated by deterministic rules before any telemetry-triggered model request.
4. The learner is offered help according to their assistance preference.
5. GPT-5.6 returns a schema-validated adaptation plan.
6. React recomposes the same interface through an approved component registry.
7. Repeated check difficulty opens a **Focus Mission** that quiets the workspace and gates support from one clue, to a visual, to a short explanation with optional browser-native audio.
8. The learner can dismiss the adaptation, pause telemetry, show the original wording, reset the view, and return to the same reading position.

The transformation must be visibly meaningful. It can collapse secondary navigation, emphasize the active section, increase spacing, explain terminology, render an approved diagram, introduce ordered steps, or present one grounded knowledge check.

## What makes it different

Polymorph UI changes three layers of the experience:

### Presentation

- Reduce competing information
- Collapse secondary navigation
- Focus the current section
- Increase spacing and improve hierarchy
- Preserve scroll position and keyboard focus

### Instruction

- Explain technical terminology
- Provide plain-language support
- Render an approved visual map
- Break a process into ordered steps
- Add a grounded example or knowledge check

### Interaction

- Present one immediate action at a time
- Offer original-versus-adapted comparison
- Explain why the interface changed
- Preserve dismissal, pause, reset, and restoration controls

A meaningful adaptation changes the environment—not only its color or font size.

## Learner control

Polymorph UI supports three session-only assistance preferences:

| Learner-facing option              | Contract value | Behavior                                         |
| ---------------------------------- | -------------- | ------------------------------------------------ |
| Ask before changing                | `offer`        | Default; offer support before adapting           |
| Adapt automatically after a notice | `automatic`    | Explicit opt-in; show a cancellable notice first |
| Only adapt when I ask              | `manual-only`  | No proactive transition                          |

**Help me with this section** remains available in every mode, including when telemetry is paused or proactive assistance has been suppressed.

Manual help may bypass telemetry eligibility and consent routing, but it never bypasses source grounding, Zod validation, approved modes, safe rendering, or deterministic fallback behavior.

## Safe living-interface architecture

```text
Dense local lesson
        ↓
Baseline reader + learner preferences + manual help
        ├─────────────────────────────────────────────┐
        ↓                                             ↓
Privacy-safe local telemetry                    Direct learner request
        ↓                                             ↓
Deterministic friction classifier               ManualHelpRequest
        ↓ eligible                                    ↓
Proactive decline gate                          Direct authorization
        ↓ open                                        │
Consent router                                       │
        └───────────────────────┬─────────────────────┘
                                ↓
                         POST /api/adapt
                                ↓
                    GPT-5.6 structured output
                                ↓
                         Zod validation
                                ↓
                  Approved React component registry
                                ↓
            Reversible adapted interface or fallback
```

### Core guardrails

- No arbitrary model-generated frontend code is executed.
- Model output is structured data validated on the server.
- React controls components, layout, styling, transitions, and execution.
- Telemetry-triggered paths use deterministic classification before AI.
- Direct learner help remains available without telemetry eligibility.
- Invalid or unavailable AI output uses a deterministic fallback.
- Original content, learning objective, source identity, position, and learner control are preserved.

## Approved adaptation modes

| Mode                  | Learner-facing purpose                 |
| --------------------- | -------------------------------------- |
| `focus`               | Reduce competing information           |
| `plain-language`      | Clarify terminology and explanation    |
| `visual-map`          | Show relationships or process visually |
| `step-by-step`        | Break the concept into ordered stages  |
| `check-understanding` | Provide one grounded practice question |

One plan selects one primary mode and no more than two supporting modes so the experience stays coherent and calm.

## Demo lesson

The local lesson covers:

- Why APIs enforce rate limits
- Rate-limit headers
- `429 Too Many Requests`
- `Retry-After`
- Exponential backoff
- Jitter
- A TypeScript retry example
- A technical reference table
- Glossary terms
- A baseline knowledge check

The lesson is intentionally dense enough to create a meaningful before-and-after transformation while remaining professional and accessible in standard mode.

## Repeatable demo runbook

1. Open a clean session and select **Adapt after a notice**.
2. Follow **Try the genuine quiz trigger** to the baseline check.
3. Choose an incorrect answer and select **Check answer** twice.
4. Verify the decision trace shows **Score 6 · support threshold 6** and **Repeated knowledge-check attempts**.
5. Let the cancellable notice finish. Confirm the dense layout dims before the single-column **Focus Mission** appears.
6. Miss once, choose **Reveal visual cue**, miss again, then choose **Show short explanation**.
7. Toggle **Reading comfort** and briefly demonstrate **Listen to explanation** and **Stop audio**.
8. Use **Show original text** and **Pause telemetry**, then answer correctly.
9. Verify **Momentum restored** appears and the original position and keyboard focus return.

To demonstrate resilience, stop the app, remove `OPENAI_API_KEY` from `.env.local`, restart, and repeat the same sequence. The route returns a complete deterministic fallback through the same validated registry path. Direct **Help me with this section** requests also remain available when proactive support is disabled or telemetry is paused.

## Technology

- Next.js App Router
- React
- Strict TypeScript
- Tailwind CSS
- Official OpenAI JavaScript/TypeScript SDK
- Zod
- Browser-native Speech Synthesis API
- Vitest and Testing Library
- GitHub Actions CI

The MVP intentionally excludes authentication, databases, external document ingestion, persistent learner profiles, and arbitrary content uploads.

## Current project status

Completed:

- Application foundation and strict TypeScript scaffold
- MVP architecture and dynamic-UX specification
- Privacy, accessibility, consent, manual-help, and decline-suppression contracts
- Continuous integration for formatting, linting, type checking, tests, and production builds
- Polished dense-documentation lesson and adaptation-ready baseline reader
- Privacy-safe reading telemetry and deterministic friction classification
- Structured adaptation API with Zod validation and deterministic fallback
- Approved adaptive-component registry
- Explicit end-to-end learner-journey state machine and recovery path
- Progressive Focus Mission, Reading comfort, native read-aloud, and production decision trace

Final submission work:

- Verify deployment, capture the under-three-minute demo, and submit to Devpost

## Local setup

### Requirements

- Node.js 20.19 or newer
- npm 10 or newer

### Run locally

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3000`.

Add an OpenAI API key to `.env.local` only when working on the server-side adaptation route. Never expose it to client components or commit it to the repository.

## Validation

```bash
npm ci
npx prettier --check AGENTS.md DESIGN.md
npm run lint
npm run typecheck
npm test
NODE_ENV=production npm run build
```

## Project documentation

- [Working agreement](./AGENTS.md)
- [MVP design specification](./DESIGN.md)
- [Issue roadmap](./ISSUE_ROADMAP.md)
- [Repository-scoped Codex skills](./.agents/skills)

## Team workflow

- Start each issue from the latest `main` branch.
- Work only on the branch named in the issue.
- Keep shared contracts under `src/lib/contracts/`.
- Document every production dependency and open-source reuse decision.
- Open a pull request with validation evidence and screenshots when applicable.
- Do not merge without tech-lead approval.

## Team

- **Misty Waters (`rainwaters11`)** — product vision, technical direction, governance, repository administration, integration, and submission
- **Vanessa (`atlanticsunrise`)** — frontend and baseline learning experience
- **Dante (`divineasalways`)** — structured adaptation API and backend integration
- **Ed (`gvoudzon`)** — telemetry, deterministic classification, and quality support

## Platform vision

The technical-learning MVP is the first vertical slice of a broader adaptive-application framework. The same controlled architecture can later support complex personal finance, workplace, public-service, and other Web2 experiences without diagnosing users or surrendering frontend execution to a model.

> **Polymorph UI demonstrates that the same application can present the same underlying task through multiple interface structures while preserving consent, transparency, accessibility, and control.**
