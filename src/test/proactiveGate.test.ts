import { describe, expect, it } from "vitest";
import type { FrictionAssessment } from "@/lib/contracts/adaptation";
import {
  evaluateProactiveGate,
  FIRST_DECLINE_COOLDOWN_MS,
  initialProactiveAssistanceGate,
  parseProactiveAssistanceGate,
  recordProactiveDecline,
} from "@/lib/adaptation/proactiveGate";

function assessment(
  episodeId = "episode-1",
  eligibleForAdaptation = true,
): FrictionAssessment {
  return {
    episodeId,
    state: eligibleForAdaptation ? "high-friction" : "steady",
    score: eligibleForAdaptation ? 6 : 0,
    reasonCodes: eligibleForAdaptation ? ["QUIZ_RETRY"] : [],
    eligibleForAdaptation,
    recommendedModes: eligibleForAdaptation ? ["check-understanding"] : [],
  };
}

describe("proactive assistance gate", () => {
  it("allows eligible evidence before consent routing", () => {
    expect(
      evaluateProactiveGate(
        assessment(),
        initialProactiveAssistanceGate,
        1_000,
      ),
    ).toEqual({ allowed: true, reason: null });
  });

  it("suppresses a declined episode for the rest of the session", () => {
    const gate = recordProactiveDecline(
      initialProactiveAssistanceGate,
      "episode-1",
      1_000,
    );
    expect(evaluateProactiveGate(assessment(), gate, 1_000)).toEqual({
      allowed: false,
      reason: "episode-declined",
    });
  });

  it("starts a five-minute cooldown only after the first decline", () => {
    const gate = recordProactiveDecline(
      initialProactiveAssistanceGate,
      "episode-1",
      1_000,
    );
    expect(gate.cooldownUntil).toBe(
      new Date(1_000 + FIRST_DECLINE_COOLDOWN_MS).toISOString(),
    );
    expect(
      evaluateProactiveGate(
        assessment("episode-2"),
        gate,
        1_000 + FIRST_DECLINE_COOLDOWN_MS - 1,
      ),
    ).toEqual({ allowed: false, reason: "cooldown" });
    expect(
      evaluateProactiveGate(
        assessment("episode-2"),
        gate,
        1_000 + FIRST_DECLINE_COOLDOWN_MS,
      ),
    ).toEqual({ allowed: true, reason: null });
  });

  it("disables proactive support for the session after a second decline", () => {
    const first = recordProactiveDecline(
      initialProactiveAssistanceGate,
      "episode-1",
      1_000,
    );
    const second = recordProactiveDecline(first, "episode-2", 2_000);

    expect(second.declineCount).toBe(2);
    expect(second.disabledForSession).toBe(true);
    expect(
      evaluateProactiveGate(assessment("episode-3"), second, 999_999),
    ).toEqual({ allowed: false, reason: "session-disabled" });
  });

  it("never changes an assessment's evidence eligibility", () => {
    const evidence = assessment();
    const gate = recordProactiveDecline(
      initialProactiveAssistanceGate,
      evidence.episodeId,
      1_000,
    );

    evaluateProactiveGate(evidence, gate, 1_000);
    expect(evidence.eligibleForAdaptation).toBe(true);
  });

  it("restores only a valid session gate and rejects malformed storage", () => {
    const gate = recordProactiveDecline(
      initialProactiveAssistanceGate,
      "episode-1",
      1_000,
    );
    expect(parseProactiveAssistanceGate(JSON.stringify(gate))).toEqual(gate);
    expect(parseProactiveAssistanceGate("not-json")).toEqual(
      initialProactiveAssistanceGate,
    );
    expect(
      parseProactiveAssistanceGate(
        JSON.stringify({ ...gate, declineCount: "two" }),
      ),
    ).toEqual(initialProactiveAssistanceGate);
  });
});
