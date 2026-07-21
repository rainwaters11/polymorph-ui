import { describe, expect, it } from "vitest";
import { frictionAssessmentSchema } from "@/lib/contracts/adaptation";
import type { ReadingTelemetry } from "@/lib/contracts/telemetry";
import {
  classifyReadingFriction,
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
    ["quizIncorrectCount", 1, 2, "QUIZ_RETRY", 6],
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

  it.each([
    ["jargonHoverMs", 3_999, 4_000, 4_001, "JARGON_DWELL", 1],
    ["inactivityMs", 29_999, 30_000, 30_001, "INACTIVITY", 1],
  ] as const)(
    "requires %s to exceed, not merely equal, its threshold",
    (field, below, at, above, reasonCode, weight) => {
      expect(scoreReadingTelemetry(telemetry({ [field]: below })).score).toBe(
        0,
      );
      expect(scoreReadingTelemetry(telemetry({ [field]: at })).score).toBe(0);
      expect(scoreReadingTelemetry(telemetry({ [field]: above }))).toEqual({
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
    );
    const possible = classifyReadingFriction(
      telemetry({ selectionRepeatCount: 2, jargonHoverMs: 4_001 }),
    );
    const possibleAtFive = classifyReadingFriction(
      telemetry({
        selectionRepeatCount: 2,
        scrollReversalCount: 4,
        jargonHoverMs: 4_001,
      }),
    );
    const high = classifyReadingFriction(telemetry({ quizIncorrectCount: 2 }));

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
    const assessment = classifyReadingFriction(
      telemetry({
        selectionRepeatCount: 2,
        jargonHoverMs: 4_001,
        scrollReversalCount: 4,
        inactivityMs: 30_001,
        quizIncorrectCount: 2,
      }),
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
        jargonHoverMs: 4_001,
      }),
    );

    expect(result.eligibleForAdaptation).toBe(true);
    expect(classifyReadingFriction).toHaveLength(1);
  });

  it("does not let duplicate or cooldown state alter evidence eligibility", () => {
    const snapshot = telemetry({
      quizIncorrectCount: 2,
      selectionRepeatCount: 2,
      jargonHoverMs: 4_001,
    });
    const first = classifyReadingFriction(snapshot);
    const repeatedAssessment = classifyReadingFriction(snapshot, first);

    expect(first.eligibleForAdaptation).toBe(true);
    expect(repeatedAssessment.eligibleForAdaptation).toBe(true);
  });

  it("reports recovery only inside the same telemetry episode", () => {
    const friction = classifyReadingFriction(
      telemetry({ selectionRepeatCount: 2, scrollReversalCount: 4 }),
    );
    const recovery = classifyReadingFriction(telemetry(), friction);
    const unrelatedSectionEpisode = classifyReadingFriction(
      telemetry({ episodeId: "another-section" }),
      friction,
    );

    expect(friction.state).toBe("possible-confusion");
    expect(recovery.state).toBe("recovering");
    expect(recovery.reasonCodes).toEqual([
      "REPEATED_SELECTION",
      "SCROLL_REVERSAL",
    ]);
    expect(recovery.eligibleForAdaptation).toBe(false);
    expect(unrelatedSectionEpisode.state).toBe("steady");
  });
});
