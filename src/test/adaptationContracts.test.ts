import { describe, expect, it } from "vitest";
import {
  adaptationPlanSchema,
  adaptRequestSchema,
} from "@/lib/contracts/adaptation";

function validPlan() {
  return {
    sourceSectionId: "rate-limiting-intro",
    frictionState: "high-friction" as const,
    primaryMode: "focus" as const,
    supportingModes: ["plain-language" as const],
    presentation: {
      density: "reduced" as const,
      hideSecondaryNavigation: true,
      emphasizeCurrentSection: true,
      increaseSpacing: true,
      preserveScrollPosition: true as const,
    },
    instructionalSupport: {
      heading: "Understanding backoff",
      explanation: "Retries wait longer each time to avoid overload.",
      glossary: [{ term: "jitter", definition: "Small random delay." }],
      steps: ["Read the 429 response.", "Wait, then retry."],
      diagramType: "retry-timeline" as const,
    },
    transparency: {
      reasonSummary: "You reread this section a few times.",
      reasonCodes: ["REPEATED_SELECTION" as const],
    },
    controls: {
      allowDismiss: true as const,
      allowReset: true as const,
      allowPause: true as const,
      showOriginalText: true as const,
    },
  };
}

describe("adaptationPlanSchema", () => {
  it("accepts a well-formed plan", () => {
    const result = adaptationPlanSchema.safeParse(validPlan());
    expect(result.success).toBe(true);
  });

  it("rejects more than two supporting modes", () => {
    const plan = validPlan();
    plan.supportingModes = [
      "plain-language",
      "visual-map",
      "step-by-step",
    ] as never;
    const result = adaptationPlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it("rejects supportingModes that repeat primaryMode", () => {
    const plan = validPlan();
    plan.supportingModes = ["focus"] as never;
    const result = adaptationPlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it("rejects a plan with a disabled control", () => {
    const plan = validPlan();
    (plan.controls as { allowDismiss: boolean }).allowDismiss = false;
    const result = adaptationPlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it("rejects an unapproved diagram type", () => {
    const plan = validPlan();
    (plan.instructionalSupport as { diagramType: string }).diagramType =
      "custom-svg";
    const result = adaptationPlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it("rejects a knowledgeCheck with an out-of-range correctIndex", () => {
    const plan = validPlan();
    (plan as { knowledgeCheck?: unknown }).knowledgeCheck = {
      question: "What does 429 mean?",
      options: ["Too many requests", "Not found"],
      correctIndex: 5,
      explanation: "429 means rate limited.",
    };
    const result = adaptationPlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });
});

describe("adaptRequestSchema", () => {
  it("accepts a telemetry-consent request", () => {
    const result = adaptRequestSchema.safeParse({
      authorization: "telemetry-consent",
      assessment: {
        episodeId: "ep-1",
        state: "high-friction",
        score: 6,
        reasonCodes: ["REPEATED_SELECTION"],
        eligibleForAdaptation: true,
        recommendedModes: ["plain-language"],
      },
      sourceSectionId: "rate-limiting-intro",
      sourceSectionText: "Rate limiting returns 429 when you exceed quota.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a learner-request request", () => {
    const result = adaptRequestSchema.safeParse({
      authorization: "learner-request",
      manualRequest: {
        requestId: "req-1",
        sectionId: "rate-limiting-intro",
        activeSectionAnchor: "#intro",
        sourceSectionText: "Rate limiting returns 429 when you exceed quota.",
        requestedAt: new Date().toISOString(),
      },
      fallbackModes: ["focus", "plain-language"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown authorization discriminator", () => {
    const result = adaptRequestSchema.safeParse({
      authorization: "admin-override",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing sourceSectionText", () => {
    const result = adaptRequestSchema.safeParse({
      authorization: "telemetry-consent",
      assessment: {
        episodeId: "ep-1",
        state: "high-friction",
        score: 6,
        reasonCodes: [],
        eligibleForAdaptation: true,
        recommendedModes: [],
      },
      sourceSectionId: "rate-limiting-intro",
      sourceSectionText: "",
    });
    expect(result.success).toBe(false);
  });
});
