# Polymorph UI Foundation Package

This package contains the repository-level Codex instructions, the MVP architecture, project-specific Codex skills, and nine GitHub issues for the chosen documentation-reader use case.

## Files

```text
AGENTS.md
DESIGN.md
ISSUE_ROADMAP.md
create_issues.sh
.agents/
  skills/
    implement-polymorph-issue/SKILL.md
    build-adaptive-reader-ui/SKILL.md
    implement-reading-telemetry/SKILL.md
    build-adaptation-engine/SKILL.md
    verify-polymorph-mvp/SKILL.md
```

## Add the foundation files

Copy `AGENTS.md`, `DESIGN.md`, and the `.agents` directory into the repository root.

The filename must be **`AGENTS.md`**, not `agent.md`. Codex discovers repository instructions using the plural uppercase filename.

## Create the issues

### Through Codex

Give Codex this instruction from the repository:

> Read `AGENTS.md`, `DESIGN.md`, and `ISSUE_ROADMAP.md`. Use GitHub write access to create the nine issues exactly as written. Do not assign users until their GitHub usernames are confirmed.

### Through GitHub CLI

After authenticating `gh`:

```bash
chmod +x create_issues.sh
./create_issues.sh rainwaters11/polymorph-ui
```

## Team allocation

- Misty: Issue 1 and Issue 9 only
- Vanessa: Issues 2 and 6; co-owner of Issues 7 and 8
- Ed: Issues 3 and 4; lead on Issue 8 QA
- Dante: Issue 5; co-owner of Issue 7 and reviewer of Issue 4

Misty's work is intentionally front-loaded before travel and limited to final review after travel.
