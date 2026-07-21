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
    // "check-understanding" has no deterministic fallback content (no
    // knowledgeCheck can be safely generated without the model), so the
    // fallback downgrades to a mode it can actually render.
    expect(plan.primaryMode).toBe("plain-language");
    expect(plan.knowledgeCheck).toBeUndefined();
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

  it("honors an explicit requested mode for manual help when renderable", () => {
    const request: AdaptRequest = {
      authorization: "learner-request",
      manualRequest: {
        requestId: "req-2",
        sectionId: "rate-limiting-intro",
        activeSectionAnchor: "#intro",
        sourceSectionText: "Section text.",
        requestedMode: "step-by-step",
        requestedAt: new Date().toISOString(),
      },
      fallbackModes: ["focus", "plain-language"],
    };

    const plan = buildFallbackAdaptationPlan(request);
    expect(plan.primaryMode).toBe("step-by-step");
  });

  it("downgrades a requested visual-map mode to a renderable fallback", () => {
    const request: AdaptRequest = {
      authorization: "learner-request",
      manualRequest: {
        requestId: "req-4",
        sectionId: "rate-limiting-intro",
        activeSectionAnchor: "#intro",
        sourceSectionText: "Section text.",
        requestedMode: "visual-map",
        requestedAt: new Date().toISOString(),
      },
      fallbackModes: ["focus", "plain-language"],
    };

    const plan = buildFallbackAdaptationPlan(request);
    expect(plan.primaryMode).not.toBe("visual-map");
    expect(plan.instructionalSupport.diagramType).toBe("none");
    expect(adaptationPlanSchema.safeParse(plan).success).toBe(true);
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

  it("never selects a mode it cannot back with renderable content", () => {
    const requests: AdaptRequest[] = [
      {
        authorization: "telemetry-consent",
        assessment: {
          episodeId: "ep-3",
          state: "high-friction",
          score: 6,
          reasonCodes: ["REPEATED_SELECTION", "JARGON_DWELL"],
          eligibleForAdaptation: true,
          recommendedModes: [],
        },
        sourceSectionId: "section",
        sourceSectionText: "Section text.",
      },
      {
        authorization: "learner-request",
        manualRequest: {
          requestId: "req-5",
          sectionId: "section",
          activeSectionAnchor: "#intro",
          sourceSectionText: "Section text.",
          requestedMode: "check-understanding",
          requestedAt: new Date().toISOString(),
        },
        fallbackModes: [],
      },
    ];

    for (const request of requests) {
      const plan = buildFallbackAdaptationPlan(request);
      expect(plan.primaryMode).not.toBe("visual-map");
      expect(plan.primaryMode).not.toBe("check-understanding");
      expect(plan.supportingModes).not.toContain("visual-map");
      expect(plan.supportingModes).not.toContain("check-understanding");
      expect(plan.instructionalSupport.diagramType).toBe("none");
      expect(plan.knowledgeCheck).toBeUndefined();
      expect(adaptationPlanSchema.safeParse(plan).success).toBe(true);
    }
  });
});
