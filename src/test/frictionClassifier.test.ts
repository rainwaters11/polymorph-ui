import { describe, expect, it } from "vitest";
import { frictionAssessmentSchema } from "@/lib/contracts/adaptation";
import type { ReadingTelemetry } from "@/lib/contracts/telemetry";
import { FRICTION_CONFIG } from "@/lib/friction/config";
import {
  classifyReadingFriction,
  initialFrictionClassifierSession,
  resetFrictionClassifierSession,
  scoreReadingTelemetry,
} from "@/lib/friction/classifier";

function telemetry(
  overrides: Partial<ReadingTelemetry> = {},
): ReadingTelemetry {
  return {
    episodeId: "episode-1",
    sectionId: "rate-limiting-intro",
    activeSectionAnchor: "#intro",
    source: "genuine",
    selectionRepeatCount: 0,
    scrollReversalCount: 0,
    jargonHoverMs: 0,
    inactivityMs: 0,
    quizIncorrectCount: 0,
    sectionVisibleMs: 10_000,
    capturedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("scoreReadingTelemetry", () => {
  it.each([
    ["selectionRepeatCount", 1, 2, "REPEATED_SELECTION", 2],
    ["scrollReversalCount", 3, 4, "SCROLL_REVERSAL", 2],
    ["jargonHoverMs", 3_999, 4_000, "JARGON_DWELL", 1],
    ["inactivityMs", 29_999, 30_000, "INACTIVITY", 1],
    ["quizIncorrectCount", 1, 2, "QUIZ_RETRY", 3],
  ] as const)(
    "applies the %s threshold only at its configured boundary",
    (field, below, at, reasonCode, weight) => {
      expect(scoreReadingTelemetry(telemetry({ [field]: below }))).toEqual({
        score: 0,
        reasonCodes: [],
      });
      expect(scoreReadingTelemetry(telemetry({ [field]: at }))).toEqual({
        score: weight,
        reasonCodes: [reasonCode],
      });
    },
  );
});

describe("classifyReadingFriction", () => {
  it("honors the steady, possible-confusion, and high-friction boundaries", () => {
    const steady = classifyReadingFriction(
      telemetry({ selectionRepeatCount: 2 }),
      initialFrictionClassifierSession,
      0,
    ).assessment;
    const possible = classifyReadingFriction(
      telemetry({ quizIncorrectCount: 2 }),
      initialFrictionClassifierSession,
      0,
    ).assessment;
    const possibleAtFive = classifyReadingFriction(
      telemetry({ quizIncorrectCount: 2, selectionRepeatCount: 2 }),
      initialFrictionClassifierSession,
      0,
    ).assessment;
    const high = classifyReadingFriction(
      telemetry({
        quizIncorrectCount: 2,
        selectionRepeatCount: 2,
        jargonHoverMs: 4_000,
      }),
      initialFrictionClassifierSession,
      0,
    ).assessment;

    expect([steady.state, steady.score]).toEqual(["steady", 2]);
    expect([possible.state, possible.score]).toEqual(["possible-confusion", 3]);
    expect([possibleAtFive.state, possibleAtFive.score]).toEqual([
      "possible-confusion",
      5,
    ]);
    expect([high.state, high.score, high.eligibleForAdaptation]).toEqual([
      "high-friction",
      6,
      true,
    ]);
  });

  it("recommends only approved modes explainable from reason codes", () => {
    const { assessment } = classifyReadingFriction(
      telemetry({
        selectionRepeatCount: 2,
        jargonHoverMs: 4_000,
        scrollReversalCount: 4,
        inactivityMs: 30_000,
        quizIncorrectCount: 2,
      }),
      initialFrictionClassifierSession,
      0,
    );

    expect(assessment.reasonCodes).toEqual([
      "REPEATED_SELECTION",
      "SCROLL_REVERSAL",
      "JARGON_DWELL",
      "INACTIVITY",
      "QUIZ_RETRY",
    ]);
    expect(assessment.recommendedModes).toEqual([
      "plain-language",
      "focus",
      "visual-map",
      "step-by-step",
      "check-understanding",
    ]);
    expect(frictionAssessmentSchema.safeParse(assessment).success).toBe(true);
  });

  it("keeps eligibility evidence-only with no consent input", () => {
    const result = classifyReadingFriction(
      telemetry({
        quizIncorrectCount: 2,
        selectionRepeatCount: 2,
        jargonHoverMs: 4_000,
      }),
      initialFrictionClassifierSession,
      0,
    );

    expect(result.assessment.eligibleForAdaptation).toBe(true);
    expect(classifyReadingFriction).toHaveLength(3);
  });

  it("emits at most one eligible result per episode", () => {
    const snapshot = telemetry({
      quizIncorrectCount: 2,
      selectionRepeatCount: 2,
      jargonHoverMs: 4_000,
    });
    const first = classifyReadingFriction(
      snapshot,
      initialFrictionClassifierSession,
      0,
    );
    const duplicate = classifyReadingFriction(snapshot, first.session, 60_000);

    expect(first.assessment.eligibleForAdaptation).toBe(true);
    expect(duplicate.assessment.eligibleForAdaptation).toBe(false);
  });

  it("enforces cooldown across different episodes", () => {
    const highSignals = {
      quizIncorrectCount: 2,
      selectionRepeatCount: 2,
      jargonHoverMs: 4_000,
    };
    const first = classifyReadingFriction(
      telemetry({ episodeId: "episode-1", ...highSignals }),
      initialFrictionClassifierSession,
      1_000,
    );
    const coolingDown = classifyReadingFriction(
      telemetry({ episodeId: "episode-2", ...highSignals }),
      first.session,
      1_000 + FRICTION_CONFIG.cooldownMs - 1,
    );
    const cooledDown = classifyReadingFriction(
      telemetry({ episodeId: "episode-2", ...highSignals }),
      coolingDown.session,
      1_000 + FRICTION_CONFIG.cooldownMs,
    );

    expect(coolingDown.assessment.eligibleForAdaptation).toBe(false);
    expect(cooledDown.assessment.eligibleForAdaptation).toBe(true);
  });

  it("reports recovery when evidence drops after friction", () => {
    const friction = classifyReadingFriction(
      telemetry({ quizIncorrectCount: 2, selectionRepeatCount: 2 }),
      initialFrictionClassifierSession,
      0,
    );
    const recovery = classifyReadingFriction(
      telemetry({ episodeId: "recovery-episode" }),
      friction.session,
      60_000,
    );

    expect(friction.assessment.state).toBe("possible-confusion");
    expect(recovery.assessment.state).toBe("recovering");
    expect(recovery.assessment.eligibleForAdaptation).toBe(false);
  });

  it("reset clears cooldown, duplicate, and recovery history", () => {
    const snapshot = telemetry({
      quizIncorrectCount: 2,
      selectionRepeatCount: 2,
      jargonHoverMs: 4_000,
    });
    const first = classifyReadingFriction(
      snapshot,
      initialFrictionClassifierSession,
      0,
    );
    const afterReset = classifyReadingFriction(
      snapshot,
      resetFrictionClassifierSession(),
      1,
    );

    expect(first.assessment.eligibleForAdaptation).toBe(true);
    expect(afterReset.assessment.eligibleForAdaptation).toBe(true);
  });
});
