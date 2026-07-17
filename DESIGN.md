# Polymorph UI — MVP Design Specification

## 1. Product summary

Polymorph UI is an adaptive learning interface that recognizes observable reading friction and transforms dense technical documentation into a clearer, more interactive experience.

### Chosen hackathon use case

**The Self-Pacing Complex Documentation Reader**

The learner reads a dense API-documentation page and completes short knowledge checks. When interaction patterns suggest that the learner is not progressing, Polymorph UI changes the presentation rather than forcing the learner to continue inside the same static layout.

## 2. Demo promise

The three-minute demonstration must show a clear before-and-after transformation:

1. A dense technical document fills the screen.
2. The learner repeatedly revisits a difficult section.
3. Polymorph UI detects reading friction.
4. The interface visibly morphs into a focused learning mode.
5. Jargon becomes expandable definitions.
6. The difficult section becomes a simpler explanation with a diagram.
7. A micro-quiz checks understanding.
8. The learner succeeds and can return to the original document.

The transformation should be visually dramatic but technically controlled.

## 3. Problem statement

Technical documentation often assumes that every learner can process the same density, vocabulary, navigation pattern, and pace. Static readers do not respond when a learner repeatedly rereads a paragraph, hovers over unfamiliar terminology, scrolls back and forth, or fails a comprehension check.

Polymorph UI makes the interface responsive to learning friction while preserving learner agency and privacy.

## 4. MVP goals

- Demonstrate one polished documentation-reading journey.
- Capture privacy-safe client interaction summaries.
- Classify reading friction with deterministic logic.
- Use GPT-5.6 to produce a structured adaptation plan.
- Render adaptations through approved React components.
- Explain why the interface changed.
- Let the learner pause telemetry, reset the layout, and restore the source document.
- Provide an offline or API-failure fallback.

## 5. Explicit non-goals

The MVP will not include:

- Authentication or user profiles
- A database
- Persistent learner analytics
- Medical, psychological, disability, or emotion diagnosis
- Raw keystroke logging
- Camera, microphone, or biometric analysis
- Arbitrary model-generated code execution
- Uploading arbitrary PDFs or websites
- Multiple learning courses
- Production-grade personalization across sessions
- Audio cues
- A full learning-management system

## 6. Primary user journey

### Baseline state

The learner sees:

- A dense API-documentation article
- A table of contents
- Inline code examples
- Technical vocabulary
- A short knowledge check
- A progress indicator

### Observable friction

The demo should be able to trigger adaptation through realistic or simulated signals:

- The same paragraph is selected three or more times.
- The learner reverses scroll direction repeatedly within a short window.
- The learner hovers over a glossary term for an extended period.
- The learner remains inactive while the difficult section is visible.
- The learner answers the related micro-quiz incorrectly more than once.

### Adapted state

The UI can apply one or more approved changes:

- Hide secondary navigation.
- Increase readable line length and spacing.
- Focus on one section.
- Replace jargon with expandable definitions.
- Display a plain-language explanation.
- Display a prebuilt visual diagram.
- Break the concept into numbered steps.
- Generate a short micro-quiz.
- Offer a `Show original wording` control.
- Explain why the adaptation occurred.

### Recovery state

Recovery can be inferred when the learner:

- Completes the micro-quiz correctly
- Advances to the next section
- Stops generating repeated friction signals
- Chooses to return to the standard reader

## 7. State model

```text
BASELINE
  |
  v
OBSERVING
  |
  +--> STEADY ----------------------> BASELINE
  |
  +--> FRICTION_SUSPECTED
             |
             v
       ADAPTATION_REQUESTED
             |
       +-----+------+
       |            |
       v            v
   ADAPTED       FALLBACK_ADAPTED
       |            |
       +------v-----+
            RECOVERED
               |
               v
            BASELINE
```

The app must not call the AI endpoint for every browser event. Local deterministic rules decide when a compact assessment is eligible for adaptation.

## 8. Core contracts

The exact implementation may evolve, but these contracts should remain conceptually stable.

```ts
export type ReadingTelemetry = {
  sectionId: string;
  selectionRepeatCount: number;
  scrollReversalCount: number;
  jargonHoverMs: number;
  inactivityMs: number;
  quizIncorrectCount: number;
  sectionVisibleMs: number;
  capturedAt: string;
};

export type FrictionAssessment = {
  state: "steady" | "possible-confusion" | "high-friction";
  score: number;
  reasonCodes: Array<
    | "REPEATED_SELECTION"
    | "SCROLL_REVERSAL"
    | "JARGON_DWELL"
    | "INACTIVITY"
    | "QUIZ_RETRY"
  >;
  eligibleForAdaptation: boolean;
};

export type AdaptationPlan = {
  mode: "focus" | "plain-language" | "visual-stepper" | "quiz-support";
  density: "standard" | "reduced";
  hideSecondaryNavigation: boolean;
  heading: string;
  explanation: string;
  glossary: Array<{
    term: string;
    definition: string;
  }>;
  steps: string[];
  quiz: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
  reasonSummary: string;
  sourceSectionId: string;
};
```

All server responses must be schema-validated. Invalid output must never reach the rendering layer.

## 9. Friction classifier

Use deterministic weighted rules before invoking GPT-5.6.

Example starting weights:

- Repeated selection: +2
- Four or more scroll reversals: +2
- Jargon hover longer than 4 seconds: +1
- Inactivity longer than 30 seconds: +1
- Repeated quiz failure: +3

Example starting thresholds:

- 0–2: steady
- 3–5: possible confusion
- 6+: high friction and eligible for adaptation

Thresholds are demo configuration, not scientific or diagnostic claims.

## 10. Strategic adaptation filter

The server prompt should reason through three product questions while returning only the validated schema:

1. **Observed need:** What do the supplied interaction summaries indicate about where the learner is having difficulty?
2. **Instructional tension:** How can the interface provide meaningful support without simply giving away the answer?
3. **High-impact response:** What approved transformation will be clearer and more engaging than a generic popup?

The model must not infer a diagnosis, protected characteristic, or emotional certainty.

## 11. Controlled component registry

The model selects data and modes. React controls execution.

Suggested registry:

```ts
const adaptationRegistry = {
  focus: FocusReader,
  "plain-language": PlainLanguagePanel,
  "visual-stepper": VisualStepper,
  "quiz-support": AdaptiveQuiz,
} as const;
```

Approved supporting components:

- `FocusReader`
- `PlainLanguagePanel`
- `GlossaryAccordion`
- `ConceptDiagram`
- `VisualStepper`
- `AdaptiveQuiz`
- `AdaptationReason`
- `ResetViewButton`
- `PauseTelemetryControl`

Do not evaluate model-generated JSX, scripts, HTML, styles, or Tailwind class strings.

## 12. System architecture

```text
Dense Documentation Fixture
          |
          v
Documentation Reader UI
          |
          v
Client Telemetry Aggregator
          |
          v
Deterministic Friction Classifier
          |
     eligible?
       /   \
     no     yes
     |       |
     v       v
 baseline  POST /api/adapt
               |
               v
        GPT-5.6 Structured Output
               |
               v
          Zod Validation
          /          \
      valid          invalid/error
        |                 |
        v                 v
Adaptation Registry   Local Fallback Plan
        |                 |
        +--------v--------+
             Morphed UI
```

## 13. Suggested implementation structure

```text
src/
  app/
    api/
      adapt/
        route.ts
    page.tsx
  components/
    reader/
      DocumentationReader.tsx
      TableOfContents.tsx
      CodeExample.tsx
    adaptive/
      FocusReader.tsx
      PlainLanguagePanel.tsx
      GlossaryAccordion.tsx
      ConceptDiagram.tsx
      VisualStepper.tsx
      AdaptiveQuiz.tsx
      AdaptationReason.tsx
    controls/
      PauseTelemetryControl.tsx
      ResetViewButton.tsx
  content/
    demo-document.ts
  hooks/
    useReadingTelemetry.ts
  lib/
    ai/
      adaptation-prompt.ts
      openai.ts
    adaptation/
      registry.ts
      fallback-plan.ts
    contracts/
      adaptation.ts
      telemetry.ts
    telemetry/
      classify-friction.ts
      thresholds.ts
  test/
```

## 14. Demo content

Use one curated technical topic that is understandable to judges within seconds.

Recommended lesson:

**How API rate limiting and exponential backoff work**

Why it works:

- It naturally includes jargon.
- It supports code examples.
- It can be visualized as request bursts, limits, retries, and increasing wait times.
- It supports a simple micro-quiz.
- It is technical without requiring a full coding environment.

The source fixture should contain:

- One dense introduction
- A rate-limit definition
- A `429 Too Many Requests` explanation
- A short exponential-backoff code example
- A paragraph about jitter
- One baseline comprehension question

## 15. Accessibility and learner control

Required controls:

- Pause or resume interaction tracking
- Reset to original document
- Show original wording
- Dismiss an adaptation
- Keyboard access to every interactive element
- Visible focus indicators
- Reduced-motion support

The learner must never be trapped in the adapted state.

## 16. AI failure behavior

When the AI request fails, times out, or returns invalid data:

- Do not show a broken panel.
- Use a local fallback plan tied to the classifier reason codes.
- Display a quiet status message.
- Keep the original document available.
- Allow retry, but do not loop automatically.

## 17. Testing strategy

### Unit tests

- Telemetry aggregation
- Friction scoring
- Threshold transitions
- Zod schemas
- Fallback-plan selection
- Registry mode selection

### Component tests

- Adaptation controls
- Glossary accordion
- Quiz behavior
- Reset behavior
- Reduced-motion mode

### End-to-end demo test

1. Open the dense document.
2. Trigger the configured friction sequence.
3. Confirm adaptation request fires once.
4. Confirm the adapted view renders.
5. Complete the quiz.
6. Confirm recovery state.
7. Reset to baseline.
8. Repeat with the AI route disabled and verify fallback.

## 18. Definition of MVP success

The project is ready for submission when:

- The dense baseline document is visually convincing.
- The friction sequence can be demonstrated reliably.
- The classifier produces explainable reason codes.
- GPT-5.6 returns validated structured content.
- The interface transformation is immediate and dramatic.
- The learner can understand and reverse the adaptation.
- The app remains functional when the AI endpoint fails.
- The app is deployed and usable through a public URL.
- The README documents Codex and GPT-5.6 contributions.
