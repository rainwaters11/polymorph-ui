import { z } from "zod";
import type {
  AdaptationMode,
  ManualHelpRequest,
} from "@/lib/contracts/assistance";

export type {
  AdaptationMode,
  ManualHelpRequest,
} from "@/lib/contracts/assistance";

export const ADAPTATION_MODES = [
  "focus",
  "plain-language",
  "visual-map",
  "step-by-step",
  "check-understanding",
] as const satisfies readonly AdaptationMode[];

export const REASON_CODES = [
  "REPEATED_SELECTION",
  "SCROLL_REVERSAL",
  "JARGON_DWELL",
  "INACTIVITY",
  "QUIZ_RETRY",
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

export const FRICTION_STATES = [
  "steady",
  "possible-confusion",
  "high-friction",
  "recovering",
] as const;

export type FrictionState = (typeof FRICTION_STATES)[number];

export const DIAGRAM_TYPES = [
  "request-cycle",
  "retry-timeline",
  "rate-limit-window",
  "none",
] as const;

export type DiagramType = (typeof DIAGRAM_TYPES)[number];

/**
 * Both request paths hit the same public, no-login endpoint, so the
 * manual-help source text gets the same cap as the telemetry path to
 * prevent oversized prompts from either route.
 */
export const MAX_SOURCE_SECTION_TEXT_LENGTH = 20000;

export const frictionAssessmentSchema = z.object({
  episodeId: z.string().min(1),
  state: z.enum(FRICTION_STATES),
  score: z.number(),
  reasonCodes: z.array(z.enum(REASON_CODES)),
  eligibleForAdaptation: z.boolean(),
  recommendedModes: z.array(z.enum(ADAPTATION_MODES)),
});

export type FrictionAssessment = z.infer<typeof frictionAssessmentSchema>;

export const manualHelpRequestSchema = z.object({
  requestId: z.string().min(1),
  sectionId: z.string().min(1),
  activeSectionAnchor: z.string().min(1),
  sourceSectionText: z.string().min(1).max(MAX_SOURCE_SECTION_TEXT_LENGTH),
  requestedMode: z.enum(ADAPTATION_MODES).optional(),
  requestedAt: z.string().min(1),
});

type _ManualHelpRequestSchemaMatchesReaderContract =
  z.infer<typeof manualHelpRequestSchema> extends ManualHelpRequest
    ? ManualHelpRequest extends z.infer<typeof manualHelpRequestSchema>
      ? true
      : never
    : never;

const _manualHelpRequestSchemaMatchesReaderContract: _ManualHelpRequestSchemaMatchesReaderContract = true;
void _manualHelpRequestSchemaMatchesReaderContract;

export const adaptationRequestContextSchema = z.discriminatedUnion(
  "authorization",
  [
    z.object({
      authorization: z.literal("telemetry-consent"),
      assessment: frictionAssessmentSchema,
      sourceSectionId: z.string().min(1),
      sourceSectionText: z.string().min(1).max(MAX_SOURCE_SECTION_TEXT_LENGTH),
    }),
    z.object({
      authorization: z.literal("learner-request"),
      manualRequest: manualHelpRequestSchema,
      fallbackModes: z.array(z.enum(ADAPTATION_MODES)),
    }),
  ],
);

export type AdaptationRequestContext = z.infer<
  typeof adaptationRequestContextSchema
>;

/**
 * Mandatory learner controls. Locked to `true` so a model can never
 * disable them by returning a false/omitted value that still parses.
 */
const controlsSchema = z.object({
  allowDismiss: z.literal(true),
  allowReset: z.literal(true),
  allowPause: z.literal(true),
  showOriginalText: z.literal(true),
});

export const adaptationPlanSchema = z
  .object({
    sourceSectionId: z.string().min(1),
    frictionState: z.enum(FRICTION_STATES),
    primaryMode: z.enum(ADAPTATION_MODES),
    supportingModes: z.array(z.enum(ADAPTATION_MODES)).max(2),
    presentation: z.object({
      density: z.enum(["standard", "reduced"]),
      hideSecondaryNavigation: z.boolean(),
      emphasizeCurrentSection: z.boolean(),
      increaseSpacing: z.boolean(),
      preserveScrollPosition: z.literal(true),
    }),
    instructionalSupport: z.object({
      heading: z.string().min(1),
      explanation: z.string().min(1),
      glossary: z.array(
        z.object({
          term: z.string().min(1),
          definition: z.string().min(1),
        }),
      ),
      steps: z.array(z.string().min(1)),
      analogy: z.string().min(1).optional(),
      diagramType: z.enum(DIAGRAM_TYPES),
    }),
    knowledgeCheck: z
      .object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).min(2),
        correctIndex: z.number().int().nonnegative(),
        explanation: z.string().min(1),
      })
      .optional(),
    transparency: z.object({
      reasonSummary: z.string().min(1),
      reasonCodes: z.array(z.enum(REASON_CODES)),
    }),
    controls: controlsSchema,
  })
  .superRefine((plan, ctx) => {
    if (plan.supportingModes.includes(plan.primaryMode)) {
      ctx.addIssue({
        code: "custom",
        message: "supportingModes must not repeat primaryMode",
        path: ["supportingModes"],
      });
    }

    if (
      plan.knowledgeCheck &&
      plan.knowledgeCheck.correctIndex >= plan.knowledgeCheck.options.length
    ) {
      ctx.addIssue({
        code: "custom",
        message: "correctIndex must reference a valid option",
        path: ["knowledgeCheck", "correctIndex"],
      });
    }
  });

export type AdaptationPlan = z.infer<typeof adaptationPlanSchema>;

export const adaptRequestSchema = z.discriminatedUnion("authorization", [
  z.object({
    authorization: z.literal("telemetry-consent"),
    assessment: frictionAssessmentSchema,
    sourceSectionId: z.string().min(1),
    sourceSectionText: z.string().min(1).max(MAX_SOURCE_SECTION_TEXT_LENGTH),
  }),
  z.object({
    authorization: z.literal("learner-request"),
    manualRequest: manualHelpRequestSchema,
    fallbackModes: z.array(z.enum(ADAPTATION_MODES)),
  }),
]);

export type AdaptRequest = z.infer<typeof adaptRequestSchema>;
