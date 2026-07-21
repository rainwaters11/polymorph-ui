import {
  adaptationPlanSchema,
  type AdaptationMode,
  type AdaptationPlan,
} from "@/lib/contracts/adaptation";

export type ApprovedAdaptiveComponent =
  | "StandardReader"
  | "FocusReader"
  | "PlainLanguagePanel"
  | "ApprovedVisualMap"
  | "VisualStepper"
  | "AdaptiveQuiz";

export const ADAPTIVE_COMPONENT_REGISTRY: Readonly<
  Record<AdaptationMode, ApprovedAdaptiveComponent>
> = {
  focus: "FocusReader",
  "plain-language": "PlainLanguagePanel",
  "visual-map": "ApprovedVisualMap",
  "step-by-step": "VisualStepper",
  "check-understanding": "AdaptiveQuiz",
};

export type AdaptationComposition =
  | {
      valid: true;
      plan: AdaptationPlan;
      components: ApprovedAdaptiveComponent[];
    }
  | {
      valid: false;
      plan: null;
      components: ["StandardReader"];
    };

/**
 * The model never supplies component names. It supplies a schema-validated
 * mode enum, and this function maps that enum to a fixed local registry.
 */
export function resolveAdaptationComposition(
  input: unknown,
): AdaptationComposition {
  const parsed = adaptationPlanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      plan: null,
      components: ["StandardReader"],
    };
  }

  const modes = [parsed.data.primaryMode, ...parsed.data.supportingModes]
    .filter((mode, index, values) => values.indexOf(mode) === index)
    .slice(0, 3);

  return {
    valid: true,
    plan: parsed.data,
    components: modes.map((mode) => ADAPTIVE_COMPONENT_REGISTRY[mode]),
  };
}
