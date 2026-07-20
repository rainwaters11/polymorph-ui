import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { parseMock, OpenAIMock } = vi.hoisted(() => {
  const parseMock = vi.fn();
  class OpenAIMock {
    static APIError = class extends Error {
      status?: number;
      constructor(status?: number, message?: string) {
        super(message);
        this.status = status;
      }
    };
    static APIConnectionTimeoutError = class extends Error {};
    responses = { parse: parseMock };
  }
  return { parseMock, OpenAIMock };
});

vi.mock("openai", () => ({ default: OpenAIMock }));
vi.mock("openai/helpers/zod", () => ({
  zodTextFormat: (_schema: unknown, name: string) => ({ name }),
}));

const manualRequest = {
  authorization: "learner-request" as const,
  manualRequest: {
    requestId: "req-1",
    sectionId: "rate-limiting-intro",
    activeSectionAnchor: "#intro",
    sourceSectionText: "Rate limiting returns 429 when you exceed quota.",
    requestedAt: new Date().toISOString(),
  },
  fallbackModes: ["focus" as const],
};

describe("requestAdaptationPlan", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.resetModules();
    parseMock.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalKey;
  });

  it("throws missing-key when no API key is configured", async () => {
    delete process.env.OPENAI_API_KEY;
    const { requestAdaptationPlan } = await import("@/lib/ai/adaptationClient");

    await expect(
      requestAdaptationPlan(manualRequest, "req-x"),
    ).rejects.toMatchObject({ kind: "missing-key" });
  });

  it("normalizes a 429 provider error to rate-limit", async () => {
    const { requestAdaptationPlan } = await import("@/lib/ai/adaptationClient");
    parseMock.mockRejectedValue(new OpenAIMock.APIError(429, "slow down"));

    await expect(
      requestAdaptationPlan(manualRequest, "req-x"),
    ).rejects.toMatchObject({ kind: "rate-limit" });
  });

  it("normalizes a generic provider error", async () => {
    const { requestAdaptationPlan } = await import("@/lib/ai/adaptationClient");
    parseMock.mockRejectedValue(new OpenAIMock.APIError(500, "server error"));

    await expect(
      requestAdaptationPlan(manualRequest, "req-x"),
    ).rejects.toMatchObject({ kind: "provider-error" });
  });

  it("normalizes a connection timeout", async () => {
    const { requestAdaptationPlan } = await import("@/lib/ai/adaptationClient");
    parseMock.mockRejectedValue(new OpenAIMock.APIConnectionTimeoutError());

    await expect(
      requestAdaptationPlan(manualRequest, "req-x"),
    ).rejects.toMatchObject({ kind: "timeout" });
  });

  it("treats null output_parsed as malformed output", async () => {
    const { requestAdaptationPlan } = await import("@/lib/ai/adaptationClient");
    parseMock.mockResolvedValue({ output_parsed: null });

    await expect(
      requestAdaptationPlan(manualRequest, "req-x"),
    ).rejects.toMatchObject({ kind: "malformed-output" });
  });

  it("treats schema-invalid output_parsed as malformed output", async () => {
    const { requestAdaptationPlan } = await import("@/lib/ai/adaptationClient");
    parseMock.mockResolvedValue({ output_parsed: { not: "a plan" } });

    await expect(
      requestAdaptationPlan(manualRequest, "req-x"),
    ).rejects.toMatchObject({ kind: "malformed-output" });
  });

  it("returns a validated plan on success", async () => {
    const { requestAdaptationPlan } = await import("@/lib/ai/adaptationClient");
    const plan = {
      sourceSectionId: "rate-limiting-intro",
      frictionState: "steady",
      primaryMode: "focus",
      supportingModes: [],
      presentation: {
        density: "reduced",
        hideSecondaryNavigation: true,
        emphasizeCurrentSection: true,
        increaseSpacing: true,
        preserveScrollPosition: true,
      },
      instructionalSupport: {
        heading: "h",
        explanation: "e",
        glossary: [],
        steps: [],
        diagramType: "none",
      },
      transparency: { reasonSummary: "s", reasonCodes: [] },
      controls: {
        allowDismiss: true,
        allowReset: true,
        allowPause: true,
        showOriginalText: true,
      },
    };
    parseMock.mockResolvedValue({ output_parsed: plan });

    await expect(
      requestAdaptationPlan(manualRequest, "req-x"),
    ).resolves.toMatchObject({ sourceSectionId: "rate-limiting-intro" });
  });
});
