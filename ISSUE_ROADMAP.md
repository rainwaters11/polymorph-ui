# Polymorph UI — Live GitHub Roadmap

Use case: **Self-Pacing Complex Documentation Reader**

This file is a high-level dependency map. The live GitHub issue body is the authoritative task specification.

## Locked architecture

- Education track
- Adaptive technical-documentation reader
- API rate-limiting and exponential-backoff lesson
- npm and `package-lock.json`
- Next.js App Router
- Structured GPT-5.6 output validated with Zod
- Deterministic classifier and fallback
- Controlled React component registry
- Public no-login demo
- No authentication, database, persistent learner profiling, or arbitrary generated code execution

## Execution order

| Order | GitHub issue | Suggested owner | Dependency | Outcome |
|---:|---|---|---|---|
| 1 | #4 Foundation scaffold | Misty | Complete | Next.js, TypeScript, Tailwind, tests, environment safety |
| 2 | #14 Dynamic UX contracts | Misty; Vanessa and Dante review | #4 | Shared modes, consent flow, contracts, learner-control rules |
| 3 | #5 Baseline reader | Vanessa | #4 and #14 | Dense documentation stage and adaptation-ready shell |
| 4 | #8 GPT-5.6 endpoint | Dante | #4 and #14; consumes #7 contract | Validated structured adaptation and fallback |
| 5 | #6 Reading telemetry | Ed | #5 section/glossary contracts | Privacy-safe genuine and demo signals |
| 6 | #7 Friction classifier | Ed; Dante review | #6 | Deterministic scoring, recommendations, recovery |
| 7 | #9 Adaptive registry | Vanessa | #5, #8, #14 | Dynamic presentation, instruction, and interaction components |
| 8 | #10 Integration | Dante and Vanessa | #5–#9 | One end-to-end learner journey and recovery state machine |
| 9 | #11 Quality and deployment | Ed; Vanessa support | #10 | Mandatory E2E, accessibility, security, public deployment |
| 10 | #12 Submission package | Misty; Vanessa backup | #11 | README, Codex evidence, video, Devpost submission |

## Dynamic UX requirement

The final demo must visibly include at least:

1. One **presentation adaptation** — for example, collapsing navigation and focusing one section.
2. One **instructional adaptation** — for example, plain language, glossary, steps, or a visual map.
3. One **interaction adaptation** — for example, adaptation consent, one-step progression, show original, dismiss, pause, or reset.

## Team workload

- **Misty:** #14 and #12 after completing #4; no Sunday or Monday implementation dependency.
- **Vanessa (`atlanticsunrise`):** #5 and #9; co-owner of #10 and UI/deployment support for #11 and #12.
- **Dante (`divineasalways`):** #8; reviewer of #7; co-owner of #10.
- **Ed (`gvoudzon`):** #6 and #7; QA lead for #11.

Formal assignment requires each collaborator to accept the repository invitation.

## Branch convention

Use one short-lived branch per issue:

```text
issue-<number>-<short-description>
```

All pull requests target `main`, include validation evidence, and must not merge automatically.

## Required validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Issue #11 additionally owns the mandatory end-to-end test, dependency audit, clean-browser deployment verification, and final readiness report.
