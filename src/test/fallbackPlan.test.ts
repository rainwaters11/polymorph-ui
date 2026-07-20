import { describe, expect, it } from "vitest";
import { buildFallbackAdaptationPlan } from "@/lib/adaptation/fallbackPlan";
import { adaptationPlanSchema } from "@/lib/contracts/adaptation";
import type { AdaptRequest } from "@/lib/contracts/adaptation";

describe("buildFallbackAdaptationPlan", () => {
  it("produces a schema-valid plan for a telemetry-consent request", () => {
    const request: AdaptRequest = {
      authorization: "telemetry-consent",
      assessment: {
        episodeId: "ep-1",
        state: "high-friction",
        score: 7,
        reasonCodes: ["QUIZ_RETRY"],
        eligibleForAdaptation: true,
        recommendedModes: ["check-understanding"],
      },
      sourceSectionId: "rate-limiting-intro",
      sourceSectionText: "Section text.",
    };

    const plan = buildFallbackAdaptationPlan(request);
    expect(adaptationPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.sourceSectionId).toBe("rate-limiting-intro");
    expect(plan.primaryMode).toBe("check-understanding");
  });

  it("ties fallback modes to reason codes", () => {
    const request: AdaptRequest = {
      authorization: "telemetry-consent",
      assessment: {
        episodeId: "ep-2",
        state: "possible-confusion",
        score: 4,
        reasonCodes: ["SCROLL_REVERSAL", "INACTIVITY"],
        eligibleForAdaptation: false,
        recommendedModes: [],
      },
      sourceSectionId: "backoff-section",
      sourceSectionText: "Section text.",
    };

    const plan = buildFallbackAdaptationPlan(request);
    expect(plan.primaryMode).toBe("focus");
    expect(plan.supportingModes).toContain("step-by-step");
  });

  it("defaults manual help with no requested mode to focus + plain-language", () => {
    const request: AdaptRequest = {
      authorization: "learner-request",
      manualRequest: {
        requestId: "req-1",
        sectionId: "rate-limiting-intro",
        activeSectionAnchor: "#intro",
        sourceSectionText: "Section text.",
        requestedAt: new Date().toISOString(),
      },
      fallbackModes: [],
    };

    const plan = buildFallbackAdaptationPlan(request);
    expect(plan.primaryMode).toBe("focus");
    expect(plan.supportingModes).toEqual(["plain-language"]);
    expect(adaptationPlanSchema.safeParse(plan).success).toBe(true);
  });

  it("honors an explicit requested mode for manual help", () => {
    const request: AdaptRequest = {
      authorization: "learner-request",
      manualRequest: {
        requestId: "req-2",
        sectionId: "rate-limiting-intro",
        activeSectionAnchor: "#intro",
        sourceSectionText: "Section text.",
        requestedMode: "visual-map",
        requestedAt: new Date().toISOString(),
      },
      fallbackModes: ["focus", "plain-language"],
    };

    const plan = buildFallbackAdaptationPlan(request);
    expect(plan.primaryMode).toBe("visual-map");
  });

  it("always preserves mandatory learner controls", () => {
    const request: AdaptRequest = {
      authorization: "learner-request",
      manualRequest: {
        requestId: "req-3",
        sectionId: "rate-limiting-intro",
        activeSectionAnchor: "#intro",
        sourceSectionText: "Section text.",
        requestedAt: new Date().toISOString(),
      },
      fallbackModes: [],
    };

    const plan = buildFallbackAdaptationPlan(request);
    expect(plan.controls).toEqual({
      allowDismiss: true,
      allowReset: true,
      allowPause: true,
      showOriginalText: true,
    });
  });
});
