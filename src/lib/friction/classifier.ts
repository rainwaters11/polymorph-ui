import {
  frictionAssessmentSchema,
  type AdaptationMode,
  type FrictionAssessment,
  type FrictionState,
  type ReasonCode,
} from "@/lib/contracts/adaptation";
import type { ReadingTelemetry } from "@/lib/contracts/telemetry";
import {
  FRICTION_CONFIG,
  RECOMMENDED_MODES_BY_REASON,
} from "@/lib/friction/config";

export type FrictionClassifierSession = {
  handledEpisodeIds: readonly string[];
  lastEligibleAtMs: number | null;
  previousAssessment: FrictionAssessment | null;
};

export type FrictionClassificationResult = {
  assessment: FrictionAssessment;
  session: FrictionClassifierSession;
};

export const initialFrictionClassifierSession: FrictionClassifierSession = {
  handledEpisodeIds: [],
  lastEligibleAtMs: null,
  previousAssessment: null,
};

type SignalAssessment = {
  score: number;
  reasonCodes: ReasonCode[];
};

export function scoreReadingTelemetry(
  telemetry: ReadingTelemetry,
): SignalAssessment {
  const reasonCodes: ReasonCode[] = [];
  let score = 0;
  const { signals } = FRICTION_CONFIG;

  if (telemetry.selectionRepeatCount >= signals.repeatedSelection.minimum) {
    reasonCodes.push("REPEATED_SELECTION");
    score += signals.repeatedSelection.weight;
  }
  if (telemetry.scrollReversalCount >= signals.scrollReversal.minimum) {
    reasonCodes.push("SCROLL_REVERSAL");
    score += signals.scrollReversal.weight;
  }
  if (telemetry.jargonHoverMs >= signals.jargonDwell.minimumMs) {
    reasonCodes.push("JARGON_DWELL");
    score += signals.jargonDwell.weight;
  }
  if (telemetry.inactivityMs >= signals.inactivity.minimumMs) {
    reasonCodes.push("INACTIVITY");
    score += signals.inactivity.weight;
  }
  if (telemetry.quizIncorrectCount >= signals.quizRetry.minimum) {
    reasonCodes.push("QUIZ_RETRY");
    score += signals.quizRetry.weight;
  }

  return { score, reasonCodes };
}

function stateForScore(
  score: number,
  previousAssessment: FrictionAssessment | null,
): FrictionState {
  if (
    score < FRICTION_CONFIG.thresholds.possibleConfusion &&
    previousAssessment &&
    (previousAssessment.state === "high-friction" ||
      previousAssessment.state === "possible-confusion")
  ) {
    return "recovering";
  }
  if (score >= FRICTION_CONFIG.thresholds.highFriction) {
    return "high-friction";
  }
  if (score >= FRICTION_CONFIG.thresholds.possibleConfusion) {
    return "possible-confusion";
  }
  return "steady";
}

function recommendedModes(reasonCodes: ReasonCode[]): AdaptationMode[] {
  const candidates = reasonCodes.flatMap(
    (reasonCode) => RECOMMENDED_MODES_BY_REASON[reasonCode],
  );
  return candidates.filter((mode, index) => candidates.indexOf(mode) === index);
}

/**
 * Pure deterministic classifier. Consent is deliberately absent: evidence
 * determines eligibility, while #10 decides whether to offer, automatically
 * adapt, or stay manual-only.
 */
export function classifyReadingFriction(
  telemetry: ReadingTelemetry,
  session: FrictionClassifierSession,
  nowMs: number,
): FrictionClassificationResult {
  const { score, reasonCodes } = scoreReadingTelemetry(telemetry);
  const state = stateForScore(score, session.previousAssessment);
  const reportedReasonCodes =
    state === "recovering" && reasonCodes.length === 0
      ? (session.previousAssessment?.reasonCodes ?? [])
      : reasonCodes;
  const duplicateEpisode = session.handledEpisodeIds.includes(
    telemetry.episodeId,
  );
  const inCooldown =
    session.lastEligibleAtMs !== null &&
    nowMs - session.lastEligibleAtMs < FRICTION_CONFIG.cooldownMs;
  const eligibleForAdaptation =
    state === "high-friction" && !duplicateEpisode && !inCooldown;

  const assessment = frictionAssessmentSchema.parse({
    episodeId: telemetry.episodeId,
    state,
    score,
    reasonCodes: reportedReasonCodes,
    eligibleForAdaptation,
    recommendedModes: recommendedModes(reportedReasonCodes),
  });

  return {
    assessment,
    session: {
      handledEpisodeIds: eligibleForAdaptation
        ? [
            ...session.handledEpisodeIds.slice(
              -(FRICTION_CONFIG.maxHandledEpisodes - 1),
            ),
            telemetry.episodeId,
          ]
        : session.handledEpisodeIds,
      lastEligibleAtMs: eligibleForAdaptation
        ? nowMs
        : session.lastEligibleAtMs,
      previousAssessment: assessment,
    },
  };
}

export function resetFrictionClassifierSession(): FrictionClassifierSession {
  return { ...initialFrictionClassifierSession };
}
