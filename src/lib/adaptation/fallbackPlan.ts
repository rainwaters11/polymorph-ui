import type {
  AdaptRequest,
  AdaptationMode,
  AdaptationPlan,
  ReasonCode,
} from "@/lib/contracts/adaptation";

const REASON_TO_MODES: Record<ReasonCode, AdaptationMode[]> = {
  REPEATED_SELECTION: ["plain-language", "visual-map"],
  SCROLL_REVERSAL: ["focus", "step-by-step"],
  JARGON_DWELL: ["plain-language", "visual-map"],
  INACTIVITY: ["focus", "step-by-step"],
  QUIZ_RETRY: ["check-understanding", "plain-language"],
};

const DEFAULT_MANUAL_MODES: AdaptationMode[] = ["focus", "plain-language"];

function pickModes(candidates: AdaptationMode[]): {
  primaryMode: AdaptationMode;
  supportingModes: AdaptationMode[];
} {
  const deduped = candidates.filter(
    (mode, index) => candidates.indexOf(mode) === index,
  );
  const [primaryMode = "focus", ...rest] = deduped;
  const supportingModes = rest
    .filter((mode) => mode !== primaryMode)
    .slice(0, 2);
  return { primaryMode, supportingModes };
}

function modesForReasonCodes(reasonCodes: ReasonCode[]): AdaptationMode[] {
  const modes = reasonCodes.flatMap((code) => REASON_TO_MODES[code]);
  return modes.length > 0 ? modes : DEFAULT_MANUAL_MODES;
}

/**
 * Deterministic, complete AdaptationPlan used whenever the model is
 * unavailable, times out, refuses, or returns output that fails schema
 * validation. Must remain fully usable on its own — never merely an
 * error message.
 */
export function buildFallbackAdaptationPlan(
  request: AdaptRequest,
): AdaptationPlan {
  if (request.authorization === "telemetry-consent") {
    const { assessment, sourceSectionId } = request;
    const { primaryMode, supportingModes } = pickModes(
      modesForReasonCodes(assessment.reasonCodes),
    );

    return {
      sourceSectionId,
      frictionState: assessment.state,
      primaryMode,
      supportingModes,
      presentation: {
        density: "reduced",
        hideSecondaryNavigation: true,
        emphasizeCurrentSection: true,
        increaseSpacing: true,
        preserveScrollPosition: true,
      },
      instructionalSupport: {
        heading: "A simpler view of this section",
        explanation:
          "We noticed signs of reading friction, so we've focused this section and simplified its presentation. Your original text and position are preserved.",
        glossary: [],
        steps: [],
        diagramType: "none",
      },
      transparency: {
        reasonSummary:
          "This is a default supportive view shown because the adaptive assistant is temporarily unavailable.",
        reasonCodes: assessment.reasonCodes,
      },
      controls: {
        allowDismiss: true,
        allowReset: true,
        allowPause: true,
        showOriginalText: true,
      },
    };
  }

  const { manualRequest, fallbackModes } = request;
  const requestedModes = manualRequest.requestedMode
    ? [manualRequest.requestedMode]
    : fallbackModes.length > 0
      ? fallbackModes
      : DEFAULT_MANUAL_MODES;
  const { primaryMode, supportingModes } = pickModes(requestedModes);

  return {
    sourceSectionId: manualRequest.sectionId,
    frictionState: "steady",
    primaryMode,
    supportingModes,
    presentation: {
      density: "reduced",
      hideSecondaryNavigation: true,
      emphasizeCurrentSection: true,
      increaseSpacing: true,
      preserveScrollPosition: true,
    },
    instructionalSupport: {
      heading: "A simpler view of this section",
      explanation:
        "You asked for help with this section. Here is a focused, simplified view while the adaptive assistant is temporarily unavailable. Your original text and position are preserved.",
      glossary: [],
      steps: [],
      diagramType: "none",
    },
    transparency: {
      reasonSummary:
        "This is a default supportive view shown because the adaptive assistant is temporarily unavailable.",
      reasonCodes: [],
    },
    controls: {
      allowDismiss: true,
      allowReset: true,
      allowPause: true,
      showOriginalText: true,
    },
  };
}
