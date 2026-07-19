# Polymorph UI — MVP Design Specification

## 1. Product and demo

Polymorph UI is an adaptive technical-learning interface that recognizes observable reading friction and transforms dense documentation into a clearer, focused, interactive experience while preserving learner agency, privacy, and access to the original material.

The MVP uses one local lesson: **How API rate limiting and exponential backoff work**. It includes dense documentation, `429 Too Many Requests`, rate-limit headers, exponential-backoff code, jitter, glossary terms, a progress marker, a diagram opportunity, and a baseline knowledge check.

The three-minute demo must show:

1. Dense documentation.
2. Observable friction classified by deterministic rules.
3. A learner-controlled offer, cancellable automatic notice, or no proactive transition.
4. A direct `Help me with this section` path that also works while telemetry is paused.
5. A GPT-5.6 structured adaptation plan validated with Zod.
6. A controlled React transformation across presentation, instruction, and interaction.
7. A knowledge check, recovery, and restoration of the original position.

## 2. Locked decisions

- Next.js App Router, React, strict TypeScript, Tailwind CSS, npm
- Public no-login demo
- No authentication, database, persistent learner profile, or arbitrary uploads
- No medical, psychological, disability, emotion, or ability diagnosis
- No raw keystrokes, clipboard capture, camera, microphone, biometrics, or browsing history
- Privacy-safe, session-only telemetry summaries
- Deterministic classifier before telemetry-triggered model requests
- Direct learner requests may authorize adaptation without telemetry eligibility
- Official OpenAI SDK with GPT-5.6 structured output and Zod validation
- Controlled React component registry; no generated code execution
- Complete deterministic fallback for telemetry and learner-requested paths
- One primary adaptation mode and no more than two supporting modes

## 3. Adaptation layers and modes

A meaningful adaptation changes at least one layer:

- **Presentation:** collapse secondary navigation, focus the current section, increase spacing, reduce visual competition, and preserve scroll and focus.
- **Instruction:** explain terminology, provide plain language, render an approved diagram, break the concept into steps, or provide a grounded knowledge check.
- **Interaction:** present one action at a time, compare original and adapted content, explain the change, and allow dismiss, pause, reset, and restoration.

Approved modes:

| Mode                | Purpose                                                 |
| ------------------- | ------------------------------------------------------- |
| Standard            | Full document, navigation, code, and supporting details |
| Focus               | One active section with reduced clutter                 |
| Plain Language      | Shorter explanation with expandable terminology         |
| Visual Map          | Approved request, rate-limit, or retry diagram          |
| Step-by-Step        | Ordered stages with one immediate action                |
| Check Understanding | One short question with corrective explanation          |

## 4. Consent and telemetry

```ts
export type AssistanceConsentMode = "offer" | "automatic" | "manual-only";
export type TelemetryStatus = "active" | "paused";
```

| Consent mode  | Learner-facing meaning             | Proactive behavior                                              |
| ------------- | ---------------------------------- | --------------------------------------------------------------- |
| `offer`       | Ask before changing                | Show `Adapt now` and `Stay in standard view`                    |
| `automatic`   | Adapt automatically after a notice | Show a visible, cancellable notice before requesting adaptation |
| `manual-only` | Only adapt when I ask              | Show no proactive offer or transition                           |

`offer` is the default. `automatic` requires explicit opt-in. The automatic notice must provide `Stay in standard view` before any API request.

Telemetry status is independent of consent. Pausing telemetry stops collection immediately but never disables `Help me with this section`.

## 5. Decline suppression

A decline must prevent prompt loops while retained telemetry remains eligible.

```ts
export type ProactiveAssistanceGate = {
  declinedEpisodeIds: string[];
  declineCount: number;
  cooldownUntil: string | null;
  disabledForSession: boolean;
};

export type AssistancePreferences = {
  consentMode: AssistanceConsentMode;
  telemetryStatus: TelemetryStatus;
  proactiveGate: ProactiveAssistanceGate;
};
```

MVP rules:

1. A declined `episodeId` is suppressed for the remainder of the session.
2. The first decline starts a five-minute proactive cooldown.
3. The second decline disables proactive offers and automatic notices for the session.
4. A new section does not override a session-level disable.
5. Manual help remains available during cooldown and after proactive support is disabled.
6. A new browser session resets this session-only state.

The gate is checked after deterministic eligibility and before consent routing. It never changes the classifier score or `eligibleForAdaptation`.

## 6. Manual help

`Help me with this section` is direct learner authorization. It bypasses telemetry collection, classifier eligibility, consent routing, cooldowns, and proactive suppression. It does not bypass grounding, schema validation, safety controls, or fallback behavior.

```ts
export type ManualHelpRequest = {
  requestId: string;
  sectionId: string;
  activeSectionAnchor: string;
  sourceSectionText: string;
  requestedMode?: AdaptationMode;
  requestedAt: string;
};
```

The learner-requested route must work when telemetry is paused, consent is `manual-only`, or proactive support is disabled. If no mode is selected or the AI fails, the deterministic default is `focus` plus `plain-language`. This is a product default, not a friction diagnosis.

## 7. State model

```text
BASELINE
  → OBSERVING
  → FRICTION_SUSPECTED
      → PROACTIVE_GATE_CHECK
          ├─→ PROACTIVE_SUPPRESSED → OBSERVING
          ├─→ ADAPTATION_OFFERED [offer]
          │     ├─→ ADAPTATION_DECLINED → RECORD_DECLINE → OBSERVING
          │     └─→ ADAPTATION_REQUESTED
          ├─→ AUTOMATIC_ADAPTATION_NOTICE [automatic]
          │     ├─→ AUTOMATIC_ADAPTATION_DECLINED
          │     │     → RECORD_DECLINE → OBSERVING
          │     └─→ ADAPTATION_REQUESTED
          └─→ OBSERVING [manual-only]

ANY_STANDARD_OR_OBSERVING_STATE
  → MANUAL_HELP_REQUESTED
  → ADAPTATION_REQUESTED

ADAPTATION_REQUESTED
  ├─→ ADAPTED
  └─→ FALLBACK_ADAPTED
          ↓
      RECOVERING
          ↓
       RECOVERED
          ↓
       BASELINE
```

Telemetry events cannot call the AI directly. An eligible telemetry episode must pass the proactive gate and consent route. A direct learner request is separately authorized and does not require a friction assessment.

## 8. Shared contracts

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

export type AdaptationRequestContext =
  | {
      authorization: "telemetry-consent";
      assessment: FrictionAssessment;
      sourceSectionId: string;
      sourceSectionText: string;
    }
  | {
      authorization: "learner-request";
      manualRequest: ManualHelpRequest;
      fallbackModes: AdaptationMode[];
    };

export type AdaptationTransition =
  | {
      route: "adaptation-offer";
      episodeId: string;
      consentMode: "offer";
    }
  | {
      route: "automatic-notice";
      episodeId: string;
      consentMode: "automatic";
    }
  | {
      route: "no-proactive-transition";
      episodeId: string;
      consentMode: "manual-only";
    }
  | {
      route: "learner-request";
      request: ManualHelpRequest;
      consentMode: AssistanceConsentMode;
      telemetryStatus: TelemetryStatus;
    };
```

```ts
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
    glossary: Array<{ term: string; definition: string }>;
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

All client/server boundaries use Zod schemas. Invalid output never reaches the renderer.

## 9. Deterministic classifier

Starting weights:

- Repeated selection: +2
- Four or more scroll reversals: +2
- Jargon dwell over four seconds: +1
- Inactivity over 30 seconds: +1
- Repeated quiz failure: +3

Thresholds:

- 0–2: steady
- 3–5: possible confusion
- 6+: high friction and eligible for adaptation

Eligibility is based only on evidence. Consent and decline state affect routing, not scoring. Example recommendations:

- Selection plus jargon dwell → plain-language or visual-map
- Scroll reversals plus inactivity → focus or step-by-step
- Repeated quiz errors → check-understanding plus plain-language

These are product rules for the demo, not scientific or diagnostic claims.

## 10. AI and rendering boundary

The server may reason over either a telemetry assessment or a direct learner request. It returns only the validated `AdaptationPlan`.

The model may not choose arbitrary components, code, HTML, CSS, Tailwind classes, animation values, or layout measurements. React renders through an approved registry that may include:

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

Unknown modes and invalid plans use a deterministic fallback. Never use `eval`, `Function`, dynamic script injection, runtime JSX compilation, or `dangerouslySetInnerHTML` for model output.

## 11. System architecture

```text
Dense Documentation Fixture
        ↓
Baseline Reader + Preferences + Manual Help
        ├────────────────────────────────────┐
        ↓                                    ↓
Active telemetry                     Learner requests help
        ↓                                    ↓
Local aggregator                     ManualHelpRequest
        ↓                                    ↓
Classifier                           Direct authorization
        ↓ eligible                            │
Proactive gate                               │
        ↓ open                                │
Consent router                               │
        ↓ authorized                         │
        └────────────────┬───────────────────┘
                         ↓
                  POST /api/adapt
                         ↓
             GPT-5.6 structured output
                         ↓
                   Zod validation
                 ┌───────┴────────┐
               valid         invalid/error
                 ↓                 ↓
              Registry        Local fallback
                 └────────┬────────┘
                      Morphed UI
                         ↓
               Recovery + restore original
```

## 12. Accessibility and failure behavior

Required:

- Keyboard access and visible focus
- No reliance on color alone
- Reduced-motion support
- Text alternatives for diagrams
- Controls usable at 200% zoom
- Preserved section position and focus
- Pause, dismiss, show original, and reset controls
- Cancellable automatic notice
- Manual-only option with no proactive UI
- Manual help while telemetry is paused or proactive support is suppressed
- Decline suppression that prevents prompt loops

When the AI fails, times out, refuses, or returns invalid data:

- Use a complete deterministic fallback
- Tie telemetry fallback modes to reason codes
- Use the requested mode or `focus` plus `plain-language` for manual help
- Keep original content and learner controls available
- Display a quiet status message
- Allow manual retry without an automatic loop

## 13. Required tests

Unit and component tests must cover:

- Telemetry aggregation, cleanup, and pause
- Consent-independent eligibility
- All three consent routes
- Manual help while telemetry is paused or consent is `manual-only`
- Manual fallback context and defaults
- Automatic-notice decline
- Same-episode decline suppression
- Five-minute first-decline cooldown
- Second-decline session disable
- Manual help while proactive support is disabled
- Zod schemas, fallback selection, and registry composition
- Pause, dismiss, show-original, reset, diagram alternatives, and reduced motion

The mandatory end-to-end journey must verify both genuine and labeled demo telemetry, one authorized API request, adaptation rendering, recovery, API-disabled fallback, mobile layout, keyboard-only use, and original-position restoration.

## 14. MVP success

The MVP is ready when:

- The baseline-to-adapted transformation is convincing.
- Presentation, instruction, and interaction visibly adapt.
- Telemetry and classification are explainable and privacy-safe.
- Evidence eligibility remains independent of consent and decline state.
- Learners can select offer, cancellable automatic, or manual-only support.
- Manual help works while telemetry is paused or proactive support is suppressed.
- Declines cannot create repeated-prompt loops.
- GPT-5.6 returns validated structured content.
- Both request paths have complete fallbacks.
- Learners can understand, decline, pause, dismiss, reverse, and reset adaptations.
- The public deployment runs the full demo journey.
