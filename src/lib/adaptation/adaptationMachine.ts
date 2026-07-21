import type {
  AdaptationPlan,
  FrictionAssessment,
} from "@/lib/contracts/adaptation";
import type { AssistanceConsentMode } from "@/lib/contracts/assistance";

export const ADAPTATION_STATES = [
  "BASELINE",
  "OBSERVING",
  "FRICTION_SUSPECTED",
  "PROACTIVE_SUPPRESSED",
  "ADAPTATION_OFFERED",
  "AUTOMATIC_ADAPTATION_NOTICE",
  "ADAPTATION_DECLINED",
  "ADAPTATION_REQUESTED",
  "ADAPTED",
  "FALLBACK_ADAPTED",
  "RECOVERING",
  "RECOVERED",
] as const;

export type AdaptationState = (typeof ADAPTATION_STATES)[number];

export type AdaptationMachineContext = {
  state: AdaptationState;
  assessment: FrictionAssessment | null;
  plan: AdaptationPlan | null;
  requestVersion: number;
  activeRequestToken: number | null;
  requestKind: "telemetry" | "manual" | null;
  handledEpisodeIds: readonly string[];
};

export type AdaptationMachineEvent =
  | { type: "START_OBSERVING" }
  | { type: "ASSESSMENT_RECEIVED"; assessment: FrictionAssessment }
  | { type: "SUPPRESS_PROACTIVE" }
  | { type: "ROUTE_ASSESSMENT"; consentMode: AssistanceConsentMode }
  | { type: "ACCEPT_ADAPTATION" }
  | { type: "CONTINUE_AUTOMATIC" }
  | { type: "DECLINE_ADAPTATION" }
  | { type: "MANUAL_HELP_REQUESTED" }
  | {
      type: "REQUEST_SUCCEEDED";
      requestToken: number;
      plan: AdaptationPlan;
    }
  | {
      type: "REQUEST_FAILED";
      requestToken: number;
      fallbackPlan: AdaptationPlan;
    }
  | { type: "RECOVERY_DETECTED" }
  | { type: "RECOVERY_COMPLETE" }
  | { type: "RESUME_OBSERVING" }
  | { type: "DISMISS_ADAPTATION" }
  | { type: "RETURN_BASELINE" }
  | { type: "RESET" };

export const initialAdaptationMachineContext: AdaptationMachineContext = {
  state: "BASELINE",
  assessment: null,
  plan: null,
  requestVersion: 0,
  activeRequestToken: null,
  requestKind: null,
  handledEpisodeIds: [],
};

function startRequest(
  context: AdaptationMachineContext,
  requestKind: "telemetry" | "manual",
): AdaptationMachineContext {
  const requestToken = context.requestVersion + 1;
  return {
    ...context,
    state: "ADAPTATION_REQUESTED",
    requestVersion: requestToken,
    activeRequestToken: requestToken,
    requestKind,
    plan: null,
  };
}

function responseMatchesActiveRequest(
  context: AdaptationMachineContext,
  requestToken: number,
) {
  return (
    context.state === "ADAPTATION_REQUESTED" &&
    context.activeRequestToken === requestToken
  );
}

/**
 * Explicit, dependency-free state machine for the learner journey. Side
 * effects stay outside this reducer: callers perform the API request only
 * after entering ADAPTATION_REQUESTED and tag the response with its token.
 */
export function adaptationMachineReducer(
  context: AdaptationMachineContext,
  event: AdaptationMachineEvent,
): AdaptationMachineContext {
  if (event.type === "RESET") {
    return {
      ...initialAdaptationMachineContext,
      requestVersion: context.requestVersion + 1,
    };
  }

  if (event.type === "START_OBSERVING" && context.state === "BASELINE") {
    return { ...context, state: "OBSERVING" };
  }

  if (event.type === "ASSESSMENT_RECEIVED" && context.state === "OBSERVING") {
    const { assessment } = event;
    if (
      !assessment.eligibleForAdaptation ||
      context.handledEpisodeIds.includes(assessment.episodeId)
    ) {
      return context;
    }

    return {
      ...context,
      state: "FRICTION_SUSPECTED",
      assessment,
      handledEpisodeIds: [
        ...context.handledEpisodeIds.slice(-99),
        assessment.episodeId,
      ],
    };
  }

  if (
    event.type === "SUPPRESS_PROACTIVE" &&
    context.state === "FRICTION_SUSPECTED"
  ) {
    return {
      ...context,
      state: "PROACTIVE_SUPPRESSED",
      assessment: null,
    };
  }

  if (
    event.type === "RESUME_OBSERVING" &&
    context.state === "PROACTIVE_SUPPRESSED"
  ) {
    return { ...context, state: "OBSERVING" };
  }

  if (
    event.type === "ROUTE_ASSESSMENT" &&
    (context.state === "FRICTION_SUSPECTED" ||
      context.state === "ADAPTATION_OFFERED" ||
      context.state === "AUTOMATIC_ADAPTATION_NOTICE")
  ) {
    if (event.consentMode === "automatic") {
      return { ...context, state: "AUTOMATIC_ADAPTATION_NOTICE" };
    }
    if (event.consentMode === "offer") {
      return { ...context, state: "ADAPTATION_OFFERED" };
    }
    return context.state === "FRICTION_SUSPECTED"
      ? { ...context, state: "OBSERVING", assessment: null }
      : { ...context, state: "ADAPTATION_DECLINED" };
  }

  if (
    event.type === "ACCEPT_ADAPTATION" &&
    context.state === "ADAPTATION_OFFERED"
  ) {
    return startRequest(context, "telemetry");
  }

  if (
    event.type === "CONTINUE_AUTOMATIC" &&
    context.state === "AUTOMATIC_ADAPTATION_NOTICE"
  ) {
    return startRequest(context, "telemetry");
  }

  if (
    event.type === "DECLINE_ADAPTATION" &&
    (context.state === "ADAPTATION_OFFERED" ||
      context.state === "AUTOMATIC_ADAPTATION_NOTICE")
  ) {
    return {
      ...context,
      state: "ADAPTATION_DECLINED",
      activeRequestToken: null,
      requestKind: null,
    };
  }

  if (
    event.type === "MANUAL_HELP_REQUESTED" &&
    context.state !== "ADAPTATION_REQUESTED" &&
    context.state !== "ADAPTED" &&
    context.state !== "FALLBACK_ADAPTED" &&
    context.state !== "RECOVERING"
  ) {
    return startRequest({ ...context, assessment: null }, "manual");
  }

  if (
    event.type === "RESUME_OBSERVING" &&
    context.state === "ADAPTATION_DECLINED"
  ) {
    return {
      ...context,
      state: "OBSERVING",
      assessment: null,
      plan: null,
    };
  }

  if (event.type === "REQUEST_SUCCEEDED") {
    if (!responseMatchesActiveRequest(context, event.requestToken)) {
      return context;
    }
    return {
      ...context,
      state: "ADAPTED",
      plan: event.plan,
      activeRequestToken: null,
      requestKind: null,
    };
  }

  if (event.type === "REQUEST_FAILED") {
    if (!responseMatchesActiveRequest(context, event.requestToken)) {
      return context;
    }
    return {
      ...context,
      state: "FALLBACK_ADAPTED",
      plan: event.fallbackPlan,
      activeRequestToken: null,
      requestKind: null,
    };
  }

  if (
    event.type === "RECOVERY_DETECTED" &&
    (context.state === "ADAPTED" || context.state === "FALLBACK_ADAPTED")
  ) {
    return { ...context, state: "RECOVERING" };
  }

  if (event.type === "RECOVERY_COMPLETE" && context.state === "RECOVERING") {
    return { ...context, state: "RECOVERED" };
  }

  if (event.type === "RETURN_BASELINE" && context.state === "RECOVERED") {
    return {
      ...context,
      state: "BASELINE",
      assessment: null,
      plan: null,
      activeRequestToken: null,
      requestKind: null,
    };
  }

  if (
    event.type === "DISMISS_ADAPTATION" &&
    (context.state === "ADAPTED" ||
      context.state === "FALLBACK_ADAPTED" ||
      context.state === "RECOVERING")
  ) {
    return {
      ...context,
      state: "BASELINE",
      assessment: null,
      plan: null,
      activeRequestToken: null,
      requestKind: null,
    };
  }

  return context;
}
