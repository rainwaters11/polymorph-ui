import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdaptationPlan } from "@/lib/contracts/adaptation";

const { requestAdaptationPlanMock } = vi.hoisted(() => ({
  requestAdaptationPlanMock: vi.fn(),
}));

vi.mock("@/lib/ai/adaptationClient", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/ai/adaptationClient")
  >("@/lib/ai/adaptationClient");
  return {
    ...actual,
    requestAdaptationPlan: requestAdaptationPlanMock,
  };
});

const { AdaptationModelError } = await import("@/lib/ai/adaptationClient");
const { POST } = await import("@/app/api/adapt/route");

function telemetryBody() {
  return {
    authorization: "telemetry-consent" as const,
    assessment: {
      episodeId: "ep-1",
      state: "high-friction" as const,
      score: 7,
      reasonCodes: ["REPEATED_SELECTION" as const],
      eligibleForAdaptation: true,
      recommendedModes: ["plain-language" as const],
    },
    sourceSectionId: "rate-limiting-intro",
    sourceSectionText: "Rate limiting returns 429 when you exceed quota.",
  };
}

function manualBody() {
  return {
    authorization: "learner-request" as const,
    manualRequest: {
      requestId: "req-1",
      sectionId: "rate-limiting-intro",
      activeSectionAnchor: "#intro",
      sourceSectionText: "Rate limiting returns 429 when you exceed quota.",
      requestedAt: new Date().toISOString(),
    },
    fallbackModes: ["focus" as const, "plain-language" as const],
  };
}

function validPlanFor(sourceSectionId: string): AdaptationPlan {
  return {
    sourceSectionId,
    frictionState: "high-friction",
    primaryMode: "focus",
    supportingModes: ["plain-language"],
    presentation: {
      density: "reduced",
      hideSecondaryNavigation: true,
      emphasizeCurrentSection: true,
      increaseSpacing: true,
      preserveScrollPosition: true,
    },
    instructionalSupport: {
      heading: "Understanding rate limits",
      explanation: "429 means you sent too many requests.",
      glossary: [],
      steps: [],
      diagramType: "rate-limit-window",
    },
    transparency: {
      reasonSummary: "You reread this section a few times.",
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

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/adapt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  requestAdaptationPlanMock.mockReset();
});

describe("POST /api/adapt", () => {
  it("returns the model plan for a valid telemetry-consent request", async () => {
    requestAdaptationPlanMock.mockResolvedValue(
      validPlanFor("rate-limiting-intro"),
    );

    const response = await POST(postRequest(telemetryBody()));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.fallback).toBe(false);
    expect(json.plan.sourceSectionId).toBe("rate-limiting-intro");
    expect(json.requestId).toEqual(expect.any(String));
  });

  it("returns the model plan for a valid learner-request request", async () => {
    requestAdaptationPlanMock.mockResolvedValue(
      validPlanFor("rate-limiting-intro"),
    );

    const response = await POST(postRequest(manualBody()));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.fallback).toBe(false);
  });

  it("returns a controlled 400 for invalid input", async () => {
    requestAdaptationPlanMock.mockResolvedValue(
      validPlanFor("rate-limiting-intro"),
    );

    const response = await POST(postRequest({ authorization: "bogus" }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("invalid_request");
    expect(requestAdaptationPlanMock).not.toHaveBeenCalled();
  });

  it("falls back on a timeout error", async () => {
    requestAdaptationPlanMock.mockRejectedValue(
      new AdaptationModelError("timed out", "timeout", "req-x"),
    );

    const response = await POST(postRequest(telemetryBody()));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.fallback).toBe(true);
    expect(json.plan.controls.allowDismiss).toBe(true);
  });

  it("falls back on a rate-limit error", async () => {
    requestAdaptationPlanMock.mockRejectedValue(
      new AdaptationModelError("rate limited", "rate-limit", "req-x"),
    );

    const response = await POST(postRequest(telemetryBody()));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.fallback).toBe(true);
  });

  it("falls back on malformed model output", async () => {
    requestAdaptationPlanMock.mockRejectedValue(
      new AdaptationModelError("bad output", "malformed-output", "req-x"),
    );

    const response = await POST(postRequest(telemetryBody()));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.fallback).toBe(true);
  });

  it("falls back on a missing API key", async () => {
    requestAdaptationPlanMock.mockRejectedValue(
      new AdaptationModelError("no key", "missing-key", "req-x"),
    );

    const response = await POST(postRequest(telemetryBody()));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.fallback).toBe(true);
  });

  it("falls back when the model tries to disable a control", async () => {
    const unsafePlan = validPlanFor("rate-limiting-intro");
    unsafePlan.controls.allowDismiss = false as unknown as true;
    requestAdaptationPlanMock.mockResolvedValue(unsafePlan);

    const response = await POST(postRequest(telemetryBody()));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.fallback).toBe(true);
    expect(json.plan.controls.allowDismiss).toBe(true);
  });

  it("falls back when the model returns too many supporting modes", async () => {
    const unsafePlan = validPlanFor("rate-limiting-intro");
    unsafePlan.supportingModes = [
      "plain-language",
      "visual-map",
      "step-by-step",
    ] as unknown as AdaptationPlan["supportingModes"];
    requestAdaptationPlanMock.mockResolvedValue(unsafePlan);

    const response = await POST(postRequest(telemetryBody()));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.fallback).toBe(true);
    expect(json.plan.supportingModes.length).toBeLessThanOrEqual(2);
  });

  it("falls back when the model drifts from the requested source section", async () => {
    requestAdaptationPlanMock.mockResolvedValue(
      validPlanFor("wrong-section-id"),
    );

    const response = await POST(postRequest(telemetryBody()));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.fallback).toBe(true);
    expect(json.plan.sourceSectionId).toBe("rate-limiting-intro");
  });
});
