import { createRef } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdaptiveExperience } from "@/components/adaptive/AdaptiveExperience";
import { AdaptationNotice } from "@/components/adaptive/AdaptationNotice";
import {
  RateLimitWindowDiagram,
  RequestCycleDiagram,
  RetryTimelineDiagram,
} from "@/components/adaptive/AdaptiveDiagrams";
import {
  resolveAdaptationComposition,
  type ApprovedAdaptiveComponent,
} from "@/lib/adaptation/componentRegistry";
import type {
  AdaptationMode,
  AdaptationPlan,
} from "@/lib/contracts/adaptation";

function validPlan(primaryMode: AdaptationMode = "focus"): AdaptationPlan {
  return {
    sourceSectionId: "section-rate-limit-purpose",
    frictionState: "high-friction",
    primaryMode,
    supportingModes: [],
    presentation: {
      density: "reduced",
      hideSecondaryNavigation: true,
      emphasizeCurrentSection: true,
      increaseSpacing: true,
      preserveScrollPosition: true,
    },
    instructionalSupport: {
      heading: "Make rate limits easier to follow",
      explanation:
        "A rate limit is a server rule that controls how many requests may arrive during a period.",
      glossary: [
        {
          term: "Rate limit",
          definition: "A bounded request allowance.",
        },
      ],
      steps: [
        "Read the status code.",
        "Check Retry-After.",
        "Wait before retrying.",
      ],
      analogy: "It works like a paced entry line.",
      diagramType: "rate-limit-window",
    },
    knowledgeCheck: {
      question: "What should a client do after a 429 response?",
      options: ["Retry immediately", "Read Retry-After and wait"],
      correctIndex: 1,
      explanation: "A respectful client follows the server's wait guidance.",
    },
    transparency: {
      reasonSummary:
        "This section was revisited several times, so the view reduced competing information.",
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

const noop = () => undefined;

function renderExperience(plan: unknown = validPlan()) {
  return render(
    <AdaptiveExperience
      plan={plan}
      sourceTitle="Why APIs enforce rate limits"
      sourceText="Servers have finite compute and request capacity."
      onDismiss={noop}
      onReset={noop}
      onTelemetryPauseChange={noop}
    />,
  );
}

describe("controlled adaptation registry", () => {
  it("maps approved modes to a fixed, deduplicated component composition", () => {
    const plan = validPlan("focus");
    plan.supportingModes = ["plain-language", "visual-map"];

    const result = resolveAdaptationComposition(plan);

    expect(result.valid).toBe(true);
    expect(result.components).toEqual<ApprovedAdaptiveComponent[]>([
      "FocusReader",
      "PlainLanguagePanel",
      "ApprovedVisualMap",
    ]);
  });

  it("falls back to StandardReader for unknown or invalid model data", () => {
    expect(
      resolveAdaptationComposition({
        ...validPlan(),
        primaryMode: "custom-runtime-component",
      }),
    ).toEqual({
      valid: false,
      plan: null,
      components: ["StandardReader"],
    });
  });
});

describe("AdaptiveExperience", () => {
  it.each([
    ["focus", "Why APIs enforce rate limits"],
    ["plain-language", "A rate limit is a server rule"],
    ["visual-map", "Requests inside a fixed allowance"],
    ["step-by-step", "Read the status code."],
    ["check-understanding", "What should a client do after a 429 response?"],
  ] as const)("renders the approved %s mode", (mode, expectedText) => {
    renderExperience(validPlan(mode));
    expect(
      screen.getByText(expectedText, { exact: false }),
    ).toBeInTheDocument();
  });

  it("preserves the original source and exposes every learner control", () => {
    const onDismiss = vi.fn();
    const onReset = vi.fn();
    const onPause = vi.fn();
    const onOriginal = vi.fn();

    render(
      <AdaptiveExperience
        plan={validPlan("plain-language")}
        sourceTitle="Why APIs enforce rate limits"
        sourceText="Servers have finite compute and request capacity."
        onDismiss={onDismiss}
        onReset={onReset}
        onTelemetryPauseChange={onPause}
        onShowOriginalChange={onOriginal}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show original text" }));
    expect(
      screen.getByText("Servers have finite compute and request capacity."),
    ).toBeInTheDocument();
    expect(onOriginal).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: "Pause telemetry" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Return to standard view" }),
    );

    expect(onPause).toHaveBeenCalledWith(true);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the transformed view and restores it on dismissal", async () => {
    const returnFocusRef = createRef<HTMLButtonElement>();
    const { rerender } = render(
      <>
        <button ref={returnFocusRef}>Open adaptation</button>
        <AdaptiveExperience
          plan={validPlan()}
          sourceTitle="Why APIs enforce rate limits"
          sourceText="Servers have finite compute and request capacity."
          focusReturnRef={returnFocusRef}
          onDismiss={noop}
          onReset={noop}
          onTelemetryPauseChange={noop}
        />
      </>,
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: "Make rate limits easier to follow",
          level: 2,
        }),
      ).toHaveFocus(),
    );

    rerender(<button ref={returnFocusRef}>Open adaptation</button>);
    expect(returnFocusRef.current).toHaveFocus();
  });

  it("keeps the standard source visible when runtime data fails validation", () => {
    const onDismiss = vi.fn();
    const onReset = vi.fn();
    const onPause = vi.fn();
    render(
      <AdaptiveExperience
        plan={{ primaryMode: "unknown" }}
        sourceTitle="Why APIs enforce rate limits"
        sourceText="Servers have finite compute and request capacity."
        onDismiss={onDismiss}
        onReset={onReset}
        onTelemetryPauseChange={onPause}
      />,
    );

    expect(screen.getByText(/could not be validated/i)).toBeInTheDocument();
    expect(
      screen.getByText("Servers have finite compute and request capacity."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pause telemetry" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Return to standard view" }),
    );

    expect(onPause).toHaveBeenCalledWith(true);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe("adaptation notice and approved diagrams", () => {
  it("lets the learner adapt or stay in the standard view", () => {
    const onAdapt = vi.fn();
    const onStay = vi.fn();

    render(
      <AdaptationNotice
        reason="A focused explanation is available."
        onAdapt={onAdapt}
        onStay={onStay}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Adapt now" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Stay in standard view" }),
    );

    expect(onAdapt).toHaveBeenCalledTimes(1);
    expect(onStay).toHaveBeenCalledTimes(1);
  });

  it.each([
    [RequestCycleDiagram, /client sends a request/i],
    [RetryTimelineDiagram, /after a 429 response/i],
    [RateLimitWindowDiagram, /during a rate-limit window/i],
  ] as const)(
    "gives each diagram a text alternative",
    (Diagram, alternative) => {
      render(<Diagram />);
      expect(screen.getByText(alternative)).toBeInTheDocument();
    },
  );
});
