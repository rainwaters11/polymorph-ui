import { describe, expect, it } from "vitest";
import {
  adaptationMachineReducer,
  initialAdaptationMachineContext,
  type AdaptationMachineContext,
  type AdaptationMachineEvent,
} from "@/lib/adaptation/adaptationMachine";
import type {
  AdaptationPlan,
  FrictionAssessment,
} from "@/lib/contracts/adaptation";

function assessment(
  episodeId = "episode-1",
  eligibleForAdaptation = true,
): FrictionAssessment {
  return {
    episodeId,
    state: eligibleForAdaptation ? "high-friction" : "steady",
    score: eligibleForAdaptation ? 7 : 0,
    reasonCodes: eligibleForAdaptation
      ? ["REPEATED_SELECTION", "JARGON_DWELL"]
      : [],
    eligibleForAdaptation,
    recommendedModes: eligibleForAdaptation
      ? ["plain-language", "visual-map"]
      : [],
  };
}

function plan(): AdaptationPlan {
  return {
    sourceSectionId: "rate-limiting-intro",
    frictionState: "high-friction",
    primaryMode: "plain-language",
    supportingModes: ["visual-map"],
    presentation: {
      density: "reduced",
      hideSecondaryNavigation: true,
      emphasizeCurrentSection: true,
      increaseSpacing: true,
      preserveScrollPosition: true,
    },
    instructionalSupport: {
      heading: "A simpler explanation",
      explanation: "A rate limit controls how many requests may arrive.",
      glossary: [],
      steps: ["Read the response code.", "Check Retry-After."],
      diagramType: "rate-limit-window",
    },
    transparency: {
      reasonSummary: "The section was revisited several times.",
      reasonCodes: ["REPEATED_SELECTION"],
    },
    controls: {
      allowDismiss: true,
      allowReset: true,
      allowPause: true,
      showOriginalText: true,
    },
  };
}

function reduce(
  context: AdaptationMachineContext,
  ...events: AdaptationMachineEvent[]
) {
  return events.reduce(adaptationMachineReducer, context);
}

describe("adaptationMachineReducer", () => {
  it("models the complete offer, adapt, recover, and restore journey", () => {
    const offered = reduce(
      initialAdaptationMachineContext,
      { type: "START_OBSERVING" },
      { type: "ASSESSMENT_RECEIVED", assessment: assessment() },
      { type: "ROUTE_ASSESSMENT", consentMode: "offer" },
    );
    expect(offered.state).toBe("ADAPTATION_OFFERED");

    const requested = adaptationMachineReducer(offered, {
      type: "ACCEPT_ADAPTATION",
    });
    expect(requested.state).toBe("ADAPTATION_REQUESTED");
    expect(requested.activeRequestToken).toBe(1);

    const restored = reduce(
      requested,
      { type: "REQUEST_SUCCEEDED", requestToken: 1, plan: plan() },
      { type: "RECOVERY_DETECTED" },
      { type: "RECOVERY_COMPLETE" },
      { type: "RETURN_BASELINE" },
    );
    expect(restored.state).toBe("BASELINE");
    expect(restored.plan).toBeNull();
  });

  it("announces automatic assistance before starting one request", () => {
    const notice = reduce(
      initialAdaptationMachineContext,
      { type: "START_OBSERVING" },
      { type: "ASSESSMENT_RECEIVED", assessment: assessment() },
      { type: "ROUTE_ASSESSMENT", consentMode: "automatic" },
    );

    expect(notice.state).toBe("AUTOMATIC_ADAPTATION_NOTICE");
    const requested = adaptationMachineReducer(notice, {
      type: "CONTINUE_AUTOMATIC",
    });
    expect(requested.state).toBe("ADAPTATION_REQUESTED");
    expect(requested.activeRequestToken).toBe(1);
    expect(requested.requestKind).toBe("telemetry");
  });

  it("re-routes a pending automatic notice when consent changes", () => {
    const notice = reduce(
      initialAdaptationMachineContext,
      { type: "START_OBSERVING" },
      { type: "ASSESSMENT_RECEIVED", assessment: assessment() },
      { type: "ROUTE_ASSESSMENT", consentMode: "automatic" },
    );

    const offered = adaptationMachineReducer(notice, {
      type: "ROUTE_ASSESSMENT",
      consentMode: "offer",
    });
    expect(offered.state).toBe("ADAPTATION_OFFERED");

    const declined = adaptationMachineReducer(notice, {
      type: "ROUTE_ASSESSMENT",
      consentMode: "manual-only",
    });
    expect(declined.state).toBe("ADAPTATION_DECLINED");
    expect(declined.activeRequestToken).toBeNull();
  });

  it("keeps manual-only learners in the standard observing view", () => {
    const context = reduce(
      initialAdaptationMachineContext,
      { type: "START_OBSERVING" },
      { type: "ASSESSMENT_RECEIVED", assessment: assessment() },
      { type: "ROUTE_ASSESSMENT", consentMode: "manual-only" },
    );

    expect(context.state).toBe("OBSERVING");
    expect(context.assessment).toBeNull();
  });

  it("declines without starting an API request and then resumes observing", () => {
    const offered = reduce(
      initialAdaptationMachineContext,
      { type: "START_OBSERVING" },
      { type: "ASSESSMENT_RECEIVED", assessment: assessment() },
      { type: "ROUTE_ASSESSMENT", consentMode: "offer" },
    );
    const declined = adaptationMachineReducer(offered, {
      type: "DECLINE_ADAPTATION",
    });

    expect(declined.state).toBe("ADAPTATION_DECLINED");
    expect(declined.activeRequestToken).toBeNull();
    expect(
      adaptationMachineReducer(declined, { type: "RESUME_OBSERVING" }).state,
    ).toBe("OBSERVING");
  });

  it("ignores steady assessments and duplicate eligible episodes", () => {
    const observing = adaptationMachineReducer(
      initialAdaptationMachineContext,
      {
        type: "START_OBSERVING",
      },
    );
    expect(
      adaptationMachineReducer(observing, {
        type: "ASSESSMENT_RECEIVED",
        assessment: assessment("steady", false),
      }),
    ).toBe(observing);

    const first = adaptationMachineReducer(observing, {
      type: "ASSESSMENT_RECEIVED",
      assessment: assessment("duplicate"),
    });
    const backToObserving: AdaptationMachineContext = {
      ...first,
      state: "OBSERVING",
      assessment: null,
    };
    expect(
      adaptationMachineReducer(backToObserving, {
        type: "ASSESSMENT_RECEIVED",
        assessment: assessment("duplicate"),
      }),
    ).toBe(backToObserving);
  });

  it("renders the deterministic fallback for the active request", () => {
    const requested = reduce(
      initialAdaptationMachineContext,
      { type: "START_OBSERVING" },
      { type: "ASSESSMENT_RECEIVED", assessment: assessment() },
      { type: "ROUTE_ASSESSMENT", consentMode: "automatic" },
      { type: "CONTINUE_AUTOMATIC" },
    );
    const fallbackPlan = plan();
    const fallback = adaptationMachineReducer(requested, {
      type: "REQUEST_FAILED",
      requestToken: 1,
      fallbackPlan,
    });

    expect(fallback.state).toBe("FALLBACK_ADAPTED");
    expect(fallback.plan).toBe(fallbackPlan);
  });

  it("dismisses either adapted view back to the preserved baseline", () => {
    const requested = reduce(
      initialAdaptationMachineContext,
      { type: "START_OBSERVING" },
      { type: "ASSESSMENT_RECEIVED", assessment: assessment() },
      { type: "ROUTE_ASSESSMENT", consentMode: "automatic" },
      { type: "CONTINUE_AUTOMATIC" },
    );
    const adapted = adaptationMachineReducer(requested, {
      type: "REQUEST_SUCCEEDED",
      requestToken: 1,
      plan: plan(),
    });
    const dismissed = adaptationMachineReducer(adapted, {
      type: "DISMISS_ADAPTATION",
    });

    expect(dismissed.state).toBe("BASELINE");
    expect(dismissed.plan).toBeNull();
  });

  it("rejects stale responses after reset or a newer request", () => {
    const firstRequest = reduce(
      initialAdaptationMachineContext,
      { type: "START_OBSERVING" },
      { type: "ASSESSMENT_RECEIVED", assessment: assessment("episode-1") },
      { type: "ROUTE_ASSESSMENT", consentMode: "automatic" },
      { type: "CONTINUE_AUTOMATIC" },
    );
    const reset = adaptationMachineReducer(firstRequest, { type: "RESET" });
    expect(reset.requestVersion).toBe(2);
    expect(
      adaptationMachineReducer(reset, {
        type: "REQUEST_SUCCEEDED",
        requestToken: 1,
        plan: plan(),
      }),
    ).toBe(reset);

    const secondRequest = reduce(
      reset,
      { type: "START_OBSERVING" },
      { type: "ASSESSMENT_RECEIVED", assessment: assessment("episode-2") },
      { type: "ROUTE_ASSESSMENT", consentMode: "automatic" },
      { type: "CONTINUE_AUTOMATIC" },
    );
    expect(secondRequest.activeRequestToken).toBe(3);
    expect(
      adaptationMachineReducer(secondRequest, {
        type: "REQUEST_SUCCEEDED",
        requestToken: 1,
        plan: plan(),
      }),
    ).toBe(secondRequest);
  });

  it("ignores invalid transitions", () => {
    expect(
      adaptationMachineReducer(initialAdaptationMachineContext, {
        type: "ACCEPT_ADAPTATION",
      }),
    ).toBe(initialAdaptationMachineContext);
  });

  it("marks gated proactive evidence as suppressed before observing again", () => {
    const suspected = reduce(
      initialAdaptationMachineContext,
      { type: "START_OBSERVING" },
      { type: "ASSESSMENT_RECEIVED", assessment: assessment() },
    );
    const suppressed = adaptationMachineReducer(suspected, {
      type: "SUPPRESS_PROACTIVE",
    });

    expect(suppressed.state).toBe("PROACTIVE_SUPPRESSED");
    expect(suppressed.assessment).toBeNull();
    expect(
      adaptationMachineReducer(suppressed, { type: "RESUME_OBSERVING" }).state,
    ).toBe("OBSERVING");
  });

  it("starts manual help without telemetry evidence or proactive consent", () => {
    const requested = reduce(initialAdaptationMachineContext, {
      type: "MANUAL_HELP_REQUESTED",
    });

    expect(requested.state).toBe("ADAPTATION_REQUESTED");
    expect(requested.requestKind).toBe("manual");
    expect(requested.assessment).toBeNull();
  });
});
