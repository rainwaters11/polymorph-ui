---
name: build-adaptive-reader-ui
description: Build or refine the Polymorph UI documentation reader and approved adaptive React components. Use for baseline reader, focus mode, glossary, diagrams, steppers, quizzes, and layout morphing.
---

# Build the adaptive reader UI

1. Read `DESIGN.md`, especially the primary journey and controlled component registry.
2. Preserve the learner's document position and access to original wording.
3. Build the baseline dense reader before the adapted state.
4. Implement adaptations as typed, approved components. Never render arbitrary model-generated JSX, HTML, scripts, CSS, or Tailwind classes.
5. Support keyboard navigation, semantic HTML, visible focus, responsive layout, and reduced motion.
6. Include:
   - adaptation reason
   - reset control
   - pause telemetry control
   - show-original control
7. Ensure the visual transformation is obvious enough for a three-minute demo.
8. Add component tests for interactions and state restoration.
9. Run lint, typecheck, tests, and build before reporting completion.
