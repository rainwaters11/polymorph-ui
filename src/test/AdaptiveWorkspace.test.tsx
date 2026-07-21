import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdaptiveWorkspace } from "@/components/workspace/AdaptiveWorkspace";
import type { AdaptationPlan } from "@/lib/contracts/adaptation";

function successfulPlan(): AdaptationPlan {
  return {
    sourceSectionId: "section-rate-limit-purpose",
    frictionState: "high-friction",
    primaryMode: "visual-map",
    supportingModes: ["plain-language", "check-understanding"],
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
        "Read the response status.",
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
        "Repeated rereading and quiz retries made a clearer view useful.",
      reasonCodes: ["REPEATED_SELECTION", "QUIZ_RETRY"],
    },
    controls: {
      allowDismiss: true,
      allowReset: true,
      allowPause: true,
      showOriginalText: true,
    },
  };
}

async function flushRequest() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
  Object.defineProperty(window, "scrollY", {
    value: 0,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    return window.setTimeout(() => callback(performance.now()), 0);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.sessionStorage.clear();
});

describe("AdaptiveWorkspace learner journey", () => {
  it("uses the shared demo path for one grounded request and restores after recovery", async () => {
    let resolveRequest: ((response: Response) => void) | undefined;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    Object.defineProperty(window, "scrollY", {
      value: 360,
      writable: true,
      configurable: true,
    });

    render(<AdaptiveWorkspace />);
    const demoButton = screen.getByRole("button", {
      name: /simulate reading friction/i,
    });
    demoButton.focus();
    fireEvent.click(demoButton);
    // The labeled demo intentionally travels through the real 4.1-second
    // jargon-dwell threshold before the next batched snapshot is classified.
    act(() => vi.advanceTimersByTime(4_650));

    expect(
      screen.getByRole("heading", { name: /would a clearer view help/i }),
    ).toBeInTheDocument();

    // Moving through the baseline after the offer must not change the source
    // bound to the already-classified evidence episode.
    fireEvent.click(screen.getByRole("link", { name: /exponential backoff/i }));
    fireEvent.click(screen.getByRole("button", { name: /adapt now/i }));

    // Slow model responses must not let later telemetry batches overwrite the
    // original baseline position or focus target with loading-screen context.
    Object.defineProperty(window, "scrollY", {
      value: 900,
      writable: true,
      configurable: true,
    });
    demoButton.focus();
    act(() => vi.advanceTimersByTime(1_200));
    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({ plan: successfulPlan(), fallback: false }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    });
    await flushRequest();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const request = JSON.parse(String(options?.body));
    expect(request.authorization).toBe("telemetry-consent");
    expect(request.sourceSectionId).toBe("section-rate-limit-purpose");
    expect(request.sourceSectionText).toMatch(/finite compute/i);
    expect(request.assessment.eligibleForAdaptation).toBe(true);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Make rate limits easier to follow",
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("radio", { name: /read retry-after and wait/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /check my answer/i }));
    expect(screen.getByText(/restoring the full lesson/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(900));
    act(() => vi.advanceTimersByTime(900));
    act(() => vi.advanceTimersByTime(1));

    expect(
      screen.getByRole("heading", {
        name: "Rate limits, retries, and respectful clients",
      }),
    ).toBeVisible();
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 360,
      behavior: "instant",
    });
    expect(demoButton).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("declines genuine friction without a request and restores focus and scroll", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    Object.defineProperty(window, "scrollY", {
      value: 240,
      writable: true,
      configurable: true,
    });

    render(<AdaptiveWorkspace />);
    const currentSectionLink = screen.getByRole("link", {
      name: /why apis enforce rate limits/i,
    });
    fireEvent.click(currentSectionLink);
    fireEvent.click(currentSectionLink);

    // Four direction changes are a second independent friction signal. The
    // real scroll listener records only direction summaries, not raw events.
    for (const scrollY of [0, 100, 50, 120, 40, 130]) {
      Object.defineProperty(window, "scrollY", {
        value: scrollY,
        writable: true,
        configurable: true,
      });
      fireEvent.scroll(window);
    }
    Object.defineProperty(window, "scrollY", {
      value: 240,
      writable: true,
      configurable: true,
    });

    fireEvent.click(screen.getByRole("radio", { name: /retry immediately/i }));
    const checkAnswer = screen.getByRole("button", { name: /check answer/i });
    fireEvent.click(checkAnswer);
    fireEvent.click(checkAnswer);

    const helpButton = screen.getByRole("button", {
      name: /help me with this section/i,
    });
    helpButton.focus();
    act(() => vi.advanceTimersByTime(650));
    expect(
      screen.getByRole("heading", { name: /would a clearer view help/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /stay in standard view/i }),
    );
    act(() => vi.advanceTimersByTime(1));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(helpButton).toHaveFocus();
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 240,
      behavior: "instant",
    });
  });

  it("returns demo telemetry to a fresh genuine episode after decline", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    render(<AdaptiveWorkspace />);
    fireEvent.click(
      screen.getByRole("button", { name: /simulate reading friction/i }),
    );
    act(() => vi.advanceTimersByTime(4_650));
    fireEvent.click(
      screen.getByRole("button", { name: /stay in standard view/i }),
    );
    act(() => vi.advanceTimersByTime(1));

    const evidenceSource = screen.getByText("Evidence source").parentElement;
    expect(evidenceSource?.querySelector("dd")).toHaveTextContent("genuine");

    const currentSectionLink = screen.getByRole("link", {
      name: /why apis enforce rate limits/i,
    });
    fireEvent.click(currentSectionLink);
    fireEvent.click(currentSectionLink);
    for (const scrollY of [0, 100, 50, 120, 40, 130]) {
      Object.defineProperty(window, "scrollY", {
        value: scrollY,
        writable: true,
        configurable: true,
      });
      fireEvent.scroll(window);
    }
    fireEvent.click(screen.getByRole("radio", { name: /retry immediately/i }));
    const checkAnswer = screen.getByRole("button", { name: /check answer/i });
    fireEvent.click(checkAnswer);
    fireEvent.click(checkAnswer);
    act(() => vi.advanceTimersByTime(650));

    const score = screen.getByText("Score").parentElement;
    const reasonCodes = screen.getByText("Reason codes").parentElement;
    expect(score?.querySelector("dd")).toHaveTextContent("7");
    expect(reasonCodes?.querySelector("dd")).toHaveTextContent(
      "REPEATED_SELECTION, SCROLL_REVERSAL, QUIZ_RETRY",
    );
    expect(evidenceSource?.querySelector("dd")).toHaveTextContent("genuine");
    // The valid five-minute decline cooldown suppresses a second proactive
    // offer, while the inspector proves the new genuine episode is active.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps direct manual help available in manual-only mode and falls back safely", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("provider unavailable"));

    render(<AdaptiveWorkspace />);
    fireEvent.click(screen.getByRole("radio", { name: /only when i ask/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /help me with this section/i }),
    );
    fireEvent.click(screen.getByRole("radio", { name: /clarify/i }));
    fireEvent.click(screen.getByRole("button", { name: /request support/i }));
    await flushRequest();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const request = JSON.parse(String(options?.body));
    expect(request.authorization).toBe("learner-request");
    expect(request.manualRequest.sourceSectionText).toMatch(/finite compute/i);
    expect(request.fallbackModes).toEqual(["plain-language"]);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /a simpler view of this section/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/complete safe fallback is shown/i),
    ).toBeInTheDocument();
  });

  it("keeps learner-requested help available after telemetry is paused", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ plan: successfulPlan(), fallback: false }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        ),
      );

    render(<AdaptiveWorkspace />);
    fireEvent.click(
      screen.getByRole("button", { name: /help me with this section/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /request support/i }));
    await flushRequest();

    fireEvent.click(screen.getByRole("button", { name: /pause telemetry/i }));
    expect(
      screen.getByRole("button", { name: /resume telemetry/i }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /return to standard view/i }),
    );
    act(() => vi.advanceTimersByTime(1));
    expect(
      screen.getByText(/reading telemetry is paused/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /simulate reading friction/i }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: /help me with this section/i }),
    );
    fireEvent.click(screen.getByRole("radio", { name: /clarify/i }));
    fireEvent.click(screen.getByRole("button", { name: /request support/i }));
    await flushRequest();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, secondOptions] = fetchMock.mock.calls[1];
    expect(JSON.parse(String(secondOptions?.body)).authorization).toBe(
      "learner-request",
    );
  });
});
