import type { ComponentType } from "react";
import { AdaptiveQuiz } from "@/components/adaptive/AdaptiveQuiz";
import { FocusReader } from "@/components/adaptive/FocusReader";
import { PlainLanguagePanel } from "@/components/adaptive/PlainLanguagePanel";
import { VisualMap } from "@/components/adaptive/AdaptiveDiagrams";
import { VisualStepper } from "@/components/adaptive/VisualStepper";
import {
  adaptationPlanSchema,
  type AdaptationPlan,
} from "@/lib/contracts/adaptation";
import type { AdaptationMode } from "@/lib/contracts/assistance";
import type { DocumentSection } from "@/lib/contracts/document";

export type AdaptiveModeComponentProps = {
  plan: AdaptationPlan;
  sourceSection: DocumentSection;
  prominence: "primary" | "supporting";
};

export const ADAPTIVE_COMPONENT_REGISTRY = {
  focus: FocusReader,
  "plain-language": PlainLanguagePanel,
  "visual-map": VisualMap,
  "step-by-step": VisualStepper,
  "check-understanding": AdaptiveQuiz,
} satisfies Record<AdaptationMode, ComponentType<AdaptiveModeComponentProps>>;

export type AdaptationComposition = {
  plan: AdaptationPlan;
  primary: {
    mode: AdaptationMode;
    Component: ComponentType<AdaptiveModeComponentProps>;
  };
  supporting: Array<{
    mode: AdaptationMode;
    Component: ComponentType<AdaptiveModeComponentProps>;
  }>;
};

export type CompositionResult =
  | { status: "ready"; composition: AdaptationComposition }
  | {
      status: "invalid";
      reason: "invalid-plan" | "source-mismatch";
    };

/**
 * This is the only model-plan-to-component boundary. Zod removes unknown
 * modes and malformed content before a registry lookup can occur.
 */
export function resolveAdaptationComposition(
  candidate: unknown,
  sourceSection: DocumentSection,
): CompositionResult {
  const result = adaptationPlanSchema.safeParse(candidate);
  if (!result.success) {
    return { status: "invalid", reason: "invalid-plan" };
  }

  if (result.data.sourceSectionId !== sourceSection.id) {
    return { status: "invalid", reason: "source-mismatch" };
  }

  const plan = result.data;
  return {
    status: "ready",
    composition: {
      plan,
      primary: {
        mode: plan.primaryMode,
        Component: ADAPTIVE_COMPONENT_REGISTRY[plan.primaryMode],
      },
      supporting: plan.supportingModes.map((mode) => ({
        mode,
        Component: ADAPTIVE_COMPONENT_REGISTRY[mode],
      })),
    },
  };
}
