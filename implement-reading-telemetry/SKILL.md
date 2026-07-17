---
name: implement-reading-telemetry
description: Implement privacy-safe reading-friction telemetry and deterministic classification for Polymorph UI. Use for selection repeats, scroll reversals, jargon dwell, inactivity, quiz retries, thresholds, and reason codes.
---

# Implement reading telemetry

1. Read the telemetry and privacy sections of `AGENTS.md` and `DESIGN.md`.
2. Capture only aggregated interaction counts and durations required by the MVP.
3. Never capture raw keystrokes, clipboard data, camera, microphone, biometrics, browsing history, diagnoses, or emotional labels.
4. Track:
   - repeated selection by section
   - scroll direction reversals
   - glossary-term hover duration
   - inactivity duration
   - incorrect quiz attempts
   - section visibility duration
5. Keep raw browser events local and emit compact `ReadingTelemetry` snapshots.
6. Implement deterministic scoring with configurable thresholds and explainable reason codes.
7. Debounce or rate-limit snapshots so the AI route is not called for every event.
8. Reset counters correctly when the learner changes sections, pauses telemetry, resets the view, or recovers.
9. Add unit tests for each signal, threshold boundary, pause/reset behavior, and combined score.
10. Run lint, typecheck, tests, and build.
