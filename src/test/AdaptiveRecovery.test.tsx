import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdaptiveReaderExperience } from "@/components/adaptive/AdaptiveReaderExperience";
import { AdaptiveRenderer } from "@/components/adaptive/AdaptiveRenderer";
import { rateLimitingLesson } from "@/content/rate-limiting-lesson";
import { createMockPlanForMode } from "@/content/mock-adaptation-plans";

const sourceSection = rateLimitingLesson.sections[1];

describe("adaptive learner controls and restoration", () => {
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
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("shows original wording and exposes pause, dismiss, and reset callbacks", () => {
    const onTelemetryToggle = vi.fn();
    const onDismiss = vi.fn();
    const onReset = vi.fn();
    render(
      <AdaptiveRenderer
        plan={createMockPlanForMode("focus")}
        sourceSection={sourceSection}
        telemetryPaused={false}
        onTelemetryToggle={onTelemetryToggle}
        onDismiss={onDismiss}
        onReset={onReset}
      />,
    );

    const showOriginal = screen.getByRole("button", {
      name: /show original wording/i,
    });
    showOriginal.focus();
    expect(showOriginal).toHaveFocus();
    fireEvent.click(showOriginal);
    expect(screen.getByText(/unchanged source/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /pause reading signals/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /dismiss adaptation/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /reset view/i }));

    expect(onTelemetryToggle).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("fails safely to original content for an invalid plan", () => {
    const onTelemetryToggle = vi.fn();
    const onDismiss = vi.fn();
    const onReset = vi.fn();
    render(
      <AdaptiveRenderer
        plan={{ primaryMode: "unknown" }}
        sourceSection={sourceSection}
        telemetryPaused={false}
        onTelemetryToggle={onTelemetryToggle}
        onDismiss={onDismiss}
        onReset={onReset}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /adaptation could not be displayed safely/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/unchanged source/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /pause reading signals/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /reset view/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /dismiss adaptation/i }),
    );

    expect(onTelemetryToggle).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("uses an immediate transition when reduced motion is requested", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    const { container } = render(
      <AdaptiveRenderer
        plan={createMockPlanForMode("focus")}
        sourceSection={sourceSection}
        telemetryPaused={false}
        onTelemetryToggle={vi.fn()}
        onDismiss={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector("[data-motion]")).toHaveAttribute(
        "data-motion",
        "immediate",
      );
    });
  });

  it("moves focus into the adapted view and restores the source anchor", async () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 240,
    });
    render(<AdaptiveReaderExperience />);

    fireEvent.click(
      screen.getByRole("button", { name: /help me with this section/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /request support/i }));

    const adaptedHeading = await screen.findByRole("heading", {
      name: /why apis enforce rate limits, made easier to scan/i,
      level: 1,
    });
    expect(adaptedHeading).toHaveFocus();
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 240,
      behavior: "auto",
    });

    fireEvent.click(screen.getByRole("button", { name: /reset view/i }));

    await waitFor(() => {
      expect(document.getElementById("why-rate-limits-exist")).toHaveFocus();
    });
    expect(
      screen.getByRole("heading", {
        name: "Rate limits, retries, and respectful clients",
      }),
    ).toBeInTheDocument();
  });
});
