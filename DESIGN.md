# Polymorph UI — MVP Design Specification

## 1. Product summary

Polymorph UI is an adaptive technical-learning interface that recognizes observable reading friction and transforms dense documentation into a clearer, focused, interactive experience while preserving learner agency, privacy, and access to the original material.

### Chosen use case

**Self-Pacing Complex Documentation Reader**

The learner reads a dense API-documentation lesson about rate limiting and exponential backoff. When privacy-safe interaction summaries indicate that progress has slowed, Polymorph UI offers a controlled adaptation rather than forcing the learner to continue inside the same static layout.

## 2. Demo promise

The three-minute demonstration must show one coherent journey:

1. Dense API documentation fills the screen.
2. The learner revisits a difficult section.
3. Local deterministic rules identify reading friction and reason codes.
4. Polymorph UI offers or initiates an approved adaptation.
5. The interface visibly morphs across presentation, instruction, and interaction.
6. The learner completes a micro-quiz or advances successfully.
7. The interface enters recovery and can restore the original document and position.

The transformation must be visually dramatic but technically controlled.

## 3. Locked MVP decisions

- Education track
- Technical-documentation reader
- API rate-limiting and exponential-backoff lesson
- Next.js App Router, React, strict TypeScript, Tailwind CSS, npm
- Public no-login demo
- No authentication, database, persistent learner profiling, or arbitrary uploads
- No medical, psychological, disability, or emotion diagnosis
- No raw keystrokes, clipboard capture, camera, microphone, biometrics, or browsing history
- No arbitrary model-generated React, JavaScript, HTML, CSS, Tailwind classes, or executable code
- Deterministic friction classifier before any model request
- GPT-5.6 structured output validated with Zod
- Controlled React component registry
- Deterministic fallback when the AI route fails

## 4. Dynamic UX principles

A meaningful adaptation must change at least one of these layers:

### Presentation adaptation

- Collapse secondary navigation
- Focus one source section
- Increase spacing and reduce visual competition
- Emphasize the active paragraph
- Preserve scroll position and keyboard focus

### Instructional adaptation

- Provide a plain-language explanation
- Expand technical terminology
- Render an approved visual map
- Break the concept into numbered steps
- Provide a grounded knowledge check

### Interaction adaptation

- Present one action or stage at a time
- Allow original-versus-adapted comparison
- Explain why the adaptation occurred
- Allow immediate dismissal, pause, reset, and restoration

Dynamic must never mean chaotic. One plan may contain one primary mode and no more than two supporting modes.

## 5. Approved modes

| Mode                | Visible transformation                                       |
| ------------------- | ------------------------------------------------------------ |
| Standard            | Full documentation, navigation, code, and supporting details |
| Focus               | One active section, reduced clutter, stronger spacing        |
| Plain Language      | Simplified explanation and expandable terminology            |
| Visual Map          | Diagram showing requests, 429 response, delay, and retry     |
| Step-by-Step        | Numbered concept sequence with one stage emphasized          |
| Check Understanding | One short question with corrective explanation               |

## 6. Consent and transition behavior

```text
Adaptive assistance enabled
        ↓
Reading friction detected
        ↓
Adaptation notice appears
        ↓
Learner may adapt now or remain in standard mode
        ↓
Controlled UI transition
        ↓
Why this changed / Show original / Pause / Reset
```

Recommended notice:

> This section has been revisited several times. Polymorph UI can simplify the presentation while keeping the original material available.
>
> **Adapt now** · **Stay in standard view**

If automatic assistance was explicitly enabled during onboarding, the demo may transition automatically after a short visible notice. Learner controls must remain available in every adapted state.

## 7. Primary user journey

### Baseline

- Dense API-documentation article
- Table of contents
- Inline code example
- Technical vocabulary
- Progress indicator
- Baseline comprehension question
- Adaptive-assistance onboarding control

### Observable friction

The demo may use genuine or clearly labeled simulated signals:

- Repeated selection of the same section
- Multiple scroll-direction reversals
- Extended hover or keyboard focus on a glossary term
- Inactivity while the difficult section is visible
- Repeated incorrect quiz attempts

### Adapted state

- Secondary navigation may collapse
- The current source section remains anchored
- Plain-language explanation appears
- Glossary definitions become expandable
- One approved visual diagram appears
- The concept can become step-by-step
- A short knowledge check confirms understanding
- `Why this changed`, `Show original`, `Pause`, `Dismiss`, and `Reset` remain available

### Recovery

Recovery may be inferred when the learner:

- Completes the knowledge check correctly
- Advances to the next section
- Stops generating repeated friction signals
- Chooses to return to standard view

## 8. State model

```text
BASELINE
  → OBSERVING
  → FRICTION_SUSPECTED
  → ADAPTATION_OFFERED
      ├─→ ADAPTATION_DECLINED → OBSERVING
      └─→ ADAPTATION_REQUESTED
            ├─→ ADAPTED
            └─→ FALLBACK_ADAPTED
                  ↓
              RECOVERING
                  ↓
               RECOVERED
                  ↓
               BASELINE
```

The app must not call the AI endpoint for every browser event. Local deterministic rules decide when an episode is eligible.

## 9. Shared contracts

```ts
export type AdaptationMode =
  | "focus"
  | "plain-language"
  | "visual-map"
  | "step-by-step"
  | "check-understanding";

export type ReasonCode =
  | "REPEATED_SELECTION"
  | "SCROLL_REVERSAL"
  | "JARGON_DWELL"
  | "INACTIVITY"
  | "QUIZ_RETRY";

export type ReadingTelemetry = {
  episodeId: string;
  sectionId: string;
  activeSectionAnchor: string;
  adaptiveAssistanceEnabled: boolean;
  source: "genuine" | "demo";
  selectionRepeatCount: number;
  scrollReversalCount: number;
  jargonHoverMs: number;
  inactivityMs: number;
  quizIncorrectCount: number;
  sectionVisibleMs: number;
  capturedAt: string;
};

export type FrictionAssessment = {
  episodeId: string;
  state: "steady" | "possible-confusion" | "high-friction" | "recovering";
  score: number;
  reasonCodes: ReasonCode[];
  eligibleForAdaptation: boolean;
  recommendedModes: AdaptationMode[];
};

export type AdaptationPlan = {
  sourceSectionId: string;
  frictionState: FrictionAssessment["state"];
  primaryMode: AdaptationMode;
  supportingModes: AdaptationMode[];

  presentation: {
    density: "standard" | "reduced";
    hideSecondaryNavigation: boolean;
    emphasizeCurrentSection: boolean;
    increaseSpacing: boolean;
    preserveScrollPosition: true;
  };

  instructionalSupport: {
    heading: string;
    explanation: string;
    glossary: Array<{
      term: string;
      definition: string;
    }>;
    steps: string[];
    analogy?: string;
    diagramType:
      "request-cycle" | "retry-timeline" | "rate-limit-window" | "none";
  };

  knowledgeCheck?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };

  transparency: {
    reasonSummary: string;
    reasonCodes: ReasonCode[];
  };

  controls: {
    allowDismiss: true;
    allowReset: true;
    allowPause: true;
    showOriginalText: true;
  };
};
```

All client and server boundaries must use Zod schemas derived from these concepts. Invalid output must never reach the renderer.

## 10. Deterministic classifier

Starting weights:

- Repeated selection: +2
- Four or more scroll reversals: +2
- Jargon dwell over four seconds: +1
- Inactivity over 30 seconds: +1
- Repeated quiz failure: +3

Starting thresholds:

- 0–2: steady
- 3–5: possible confusion
- 6+: high friction and eligible when adaptive assistance is enabled

Possible deterministic recommendations:

- Repeated selection + jargon dwell → plain-language or visual-map
- Scroll reversals + inactivity → focus or step-by-step
- Repeated quiz failures → check-understanding plus plain-language

These are product rules for the demo, not scientific or diagnostic claims.

## 11. Strategic adaptation filter

The server prompt reasons through three questions while returning only the schema:

1. **Observed need:** What does the supplied assessment indicate about where progress slowed?
2. **Instructional tension:** How can support be useful without simply giving away the lesson?
3. **High-impact response:** Which approved modes produce a clearer experience than a generic popup?

The model may select one primary and up to two supporting modes. It may not choose arbitrary components, animation, layout measurements, CSS, or executable code.

## 12. Controlled component registry

React controls execution. The registry may include:

- `StandardReader`
- `FocusReader`
- `PlainLanguagePanel`
- `GlossaryAccordion`
- `RequestCycleDiagram`
- `RetryTimelineDiagram`
- `RateLimitWindowDiagram`
- `VisualStepper`
- `AdaptiveQuiz`
- `AdaptationNotice`
- `AdaptationReason`
- `ShowOriginalControl`
- `PauseTelemetryControl`
- `ResetViewButton`

Unknown modes and invalid plans must use a safe fallback. Never use `eval`, `Function`, dynamic script injection, runtime JSX compilation, or `dangerouslySetInnerHTML` for model output.

## 13. System architecture

```text
Dense Documentation Fixture
        ↓
Baseline Reader + Adaptive Assistance Preference
        ↓
Client Telemetry Aggregator
        ↓
Deterministic Friction Classifier
        ↓ eligible
Adaptation Offer / Consent
        ↓ accepted or auto-enabled
POST /api/adapt
        ↓
GPT-5.6 Structured Output
        ↓
Zod Validation
   ┌────┴────┐
 valid     invalid/error
   ↓           ↓
Registry   Local Fallback Plan
   └─────┬─────┘
      Morphed UI
        ↓
Recovery + Restore Original
```

## 14. Demo content

Use one local fixture: **How API rate limiting and exponential backoff work**.

It must include:

- Dense introduction
- Rate-limit definition
- `429 Too Many Requests`
- Rate-limit headers
- Exponential-backoff code example
- Jitter explanation
- Request/retry diagram opportunity
- Baseline comprehension question

## 15. Accessibility and learner control

Required:

- Keyboard access to every interactive element
- Visible focus indicators
- No reliance on color alone
- Reduced-motion support
- Text alternatives for diagrams
- Controls available at 200% zoom
- Preserved section position and focus after morph and reset
- Pause, dismiss, show original, and reset controls

The learner must never be trapped in an adapted state.

## 16. AI failure behavior

When the AI request fails, times out, or returns invalid data:

- Use a complete deterministic fallback plan tied to reason codes
- Keep the original document available
- Display a quiet status message
- Allow manual retry without an automatic loop
- Preserve learner controls and source identity

## 17. Testing strategy

### Unit and component tests

- Telemetry aggregation and cleanup
- Friction scores, thresholds, recovery, and recommendations
- Zod schemas
- Fallback-plan selection
- Registry composition
- Adaptation notice and consent choices
- Pause, dismiss, show-original, and reset controls
- Diagram text alternatives
- Reduced-motion behavior

### Mandatory end-to-end test

1. Open dense documentation.
2. Trigger genuine or labeled demo friction through the shared telemetry path.
3. Confirm classifier reason codes.
4. Confirm adaptation offer or authorized auto-transition.
5. Confirm one API request.
6. Confirm primary and supporting modes render.
7. Complete the knowledge check.
8. Confirm recovery and original-view restoration.
9. Repeat with the API disabled and verify fallback.
10. Verify mobile and keyboard-only behavior.

## 18. Definition of MVP success

The project is submission-ready when:

- The baseline is visually convincing.
- The morph includes presentation, instructional, and interaction adaptation.
- Telemetry and classification are explainable and privacy-safe.
- GPT-5.6 returns validated structured content.
- The fallback produces a complete usable adaptation.
- The learner can understand, decline, pause, dismiss, reverse, and reset adaptations.
- The public deployment runs the complete demo journey.
- The README accurately documents Codex, GPT-5.6, privacy, testing, fallback, and limitations.
