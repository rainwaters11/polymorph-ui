---
name: implement-polymorph-issue
description: Implement one scoped Polymorph UI GitHub issue from start to tested pull-request-ready changes. Use for feature, fix, refactor, or documentation issues in this repository.
---

# Implement a Polymorph UI issue

1. Read the issue, root `AGENTS.md`, and `DESIGN.md`.
2. Restate the issue goal, acceptance criteria, dependencies, and files likely to change.
3. Confirm the requested work does not violate telemetry, accessibility, or arbitrary-code-execution guardrails.
4. Create or use a branch named `issue-<number>-<short-description>`.
5. Implement only the issue scope using shared contracts rather than duplicate types.
6. Add or update tests for changed behavior.
7. Run `npm run lint`, `npm run typecheck`, relevant tests, and `npm run build`.
8. Manually verify affected UI behavior when applicable.
9. Report:
   - files changed
   - acceptance criteria satisfied
   - commands run and results
   - known limitations
   - suggested PR title and body
10. Do not claim completion when checks have not run or acceptance criteria remain open.
