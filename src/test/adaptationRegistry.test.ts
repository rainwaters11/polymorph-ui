import { describe, expect, it } from "vitest";
import { rateLimitingLesson } from "@/content/rate-limiting-lesson";
import { createMockPlanForMode } from "@/content/mock-adaptation-plans";
import {
  ADAPTIVE_COMPONENT_REGISTRY,
  resolveAdaptationComposition,
} from "@/lib/adaptation/registry";
import { ADAPTATION_MODES } from "@/lib/contracts/adaptation";

describe("controlled adaptive component registry", () => {
  const sourceSection = rateLimitingLesson.sections[1];

  it("contains one approved React component for every adaptation mode", () => {
    expect(Object.keys(ADAPTIVE_COMPONENT_REGISTRY).sort()).toEqual(
      [...ADAPTATION_MODES].sort(),
    );

    for (const mode of ADAPTATION_MODES) {
      expect(ADAPTIVE_COMPONENT_REGISTRY[mode]).toBeTypeOf("function");
    }
  });

  it.each(ADAPTATION_MODES)(
    "composes the %s mode without duplication",
    (mode) => {
      const result = resolveAdaptationComposition(
        createMockPlanForMode(mode),
        sourceSection,
      );

      expect(result.status).toBe("ready");
      if (result.status !== "ready") return;

      const modes = [
        result.composition.primary.mode,
        ...result.composition.supporting.map((item) => item.mode),
      ];
      expect(new Set(modes).size).toBe(modes.length);
      expect(result.composition.supporting).toHaveLength(1);
    },
  );

  it("rejects unknown modes before any registry lookup", () => {
    const plan = {
      ...createMockPlanForMode("focus"),
      primaryMode: "generated-component",
    };

    expect(resolveAdaptationComposition(plan, sourceSection)).toEqual({
      status: "invalid",
      reason: "invalid-plan",
    });
  });

  it("allows no more than two distinct supporting components", () => {
    const plan = {
      ...createMockPlanForMode("focus"),
      supportingModes: ["plain-language", "visual-map"],
    };
    const result = resolveAdaptationComposition(plan, sourceSection);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.composition.supporting.map((item) => item.mode)).toEqual([
      "plain-language",
      "visual-map",
    ]);
  });

  it("renders a repeated supporting mode only once", () => {
    const plan = {
      ...createMockPlanForMode("focus"),
      supportingModes: ["plain-language", "plain-language"],
    };
    const result = resolveAdaptationComposition(plan, sourceSection);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.composition.supporting.map((item) => item.mode)).toEqual([
      "plain-language",
    ]);
  });

  it("rejects a valid plan when its source identity does not match", () => {
    const plan = {
      ...createMockPlanForMode("focus"),
      sourceSectionId: "another-section",
    };

    expect(resolveAdaptationComposition(plan, sourceSection)).toEqual({
      status: "invalid",
      reason: "source-mismatch",
    });
  });
});
