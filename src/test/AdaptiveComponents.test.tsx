import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdaptiveRenderer } from "@/components/adaptive/AdaptiveRenderer";
import { AdaptationNotice } from "@/components/adaptive/AdaptationNotice";
import { rateLimitingLesson } from "@/content/rate-limiting-lesson";
import { createMockPlanForMode } from "@/content/mock-adaptation-plans";
import type { AdaptationPlan } from "@/lib/contracts/adaptation";

const sourceSection = rateLimitingLesson.sections[1];

function renderPlan(
  plan: AdaptationPlan | unknown,
  overrides: Partial<ComponentProps<typeof AdaptiveRenderer>> = {},
) {
  const callbacks = {
    onTelemetryToggle: vi.fn(),
    onDismiss: vi.fn(),
    onReset: vi.fn(),
  };
  const result = render(
    <AdaptiveRenderer
      plan={plan}
      sourceSection={sourceSection}
      telemetryPaused={false}
      {...callbacks}
      {...overrides}
    />,
  );
  return { ...result, ...callbacks };
}

describe("approved adaptive components", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  it.each([
    "focus",
    "plain-language",
    "visual-map",
    "step-by-step",
    "check-understanding",
  ] as const)("renders the approved %s primary mode", (mode) => {
    const { container } = renderPlan(createMockPlanForMode(mode));
    expect(
      container.querySelector(`[data-adaptive-mode="${mode}"]`),
    ).toBeInTheDocument();
  });

  it.each([
    ["request-cycle", /a respectful request cycle/i],
    ["retry-timeline", /backoff spreads retries/i],
    ["rate-limit-window", /requests inside one rate-limit window/i],
  ] as const)(
    "renders the %s diagram with a text alternative",
    (diagramType, title) => {
      const plan = createMockPlanForMode("visual-map");
      plan.instructionalSupport.diagramType = diagramType;
      renderPlan(plan);

      expect(screen.getByRole("img", { name: title })).toBeInTheDocument();
      expect(
        screen.getByText(/read this diagram as text/i),
      ).toBeInTheDocument();
    },
  );

  it("reveals one step at a time", () => {
    renderPlan(createMockPlanForMode("step-by-step"));

    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next step/i }));
    expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
  });

  it("keeps quiz feedback hidden until the learner checks an answer", () => {
    renderPlan(createMockPlanForMode("check-understanding"));

    expect(screen.queryByText(/that's it/i)).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("radio", {
        name: /wait at least for the server-directed interval/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /check my answer/i }));
    expect(screen.getByText(/that's it/i)).toBeInTheDocument();
  });

  it("supports both adaptation-notice choices", () => {
    const onAdapt = vi.fn();
    const onDecline = vi.fn();
    render(
      <AdaptationNotice
        kind="offer"
        reason="The current section can be presented more clearly."
        onAdapt={onAdapt}
        onDecline={onDecline}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /adapt now/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /stay in standard view/i }),
    );
    expect(onAdapt).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });
});
