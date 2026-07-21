import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReadingTelemetry } from "@/hooks/useReadingTelemetry";
import type { ReadingTelemetry } from "@/lib/contracts/telemetry";

function defaultProps() {
  return {
    sectionId: "rate-limiting-intro",
    activeSectionAnchor: "#intro",
  };
}

function dispatchScroll(y: number) {
  Object.defineProperty(window, "scrollY", {
    value: y,
    writable: true,
    configurable: true,
  });
  window.dispatchEvent(new Event("scroll"));
}

function makeSectionNode(sectionId: string): HTMLElement {
  const node = document.createElement("p");
  const section = document.createElement("section");
  section.setAttribute("data-document-section", sectionId);
  section.appendChild(node);
  document.body.appendChild(section);
  return node;
}

/**
 * Simulates a real, non-empty text selection anchored inside the given
 * section's DOM subtree, without ever exposing the hook to selected
 * text content it should retain.
 */
function selectWithinSection(sectionId: string, text = "selection") {
  const node = makeSectionNode(sectionId);
  vi.spyOn(window, "getSelection").mockReturnValue({
    isCollapsed: false,
    anchorNode: node,
    toString: () => text,
  } as unknown as Selection);
  document.dispatchEvent(new Event("selectionchange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, "scrollY", {
    value: 0,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("useReadingTelemetry", () => {
  it("initializes with an active status and a stable episode id", () => {
    const { result } = renderHook(() => useReadingTelemetry(defaultProps()));

    expect(result.current.status).toBe("active");
    expect(typeof result.current.episodeId).toBe("string");
    expect(result.current.episodeId.length).toBeGreaterThan(0);
  });

  it("emits batched snapshots labeled with the given source", () => {
    const onSnapshot = vi.fn();
    renderHook(() =>
      useReadingTelemetry({ ...defaultProps(), source: "demo", onSnapshot }),
    );

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onSnapshot).toHaveBeenCalled();
    const snapshot = onSnapshot.mock.calls[0][0] as ReadingTelemetry;
    expect(snapshot.source).toBe("demo");
    expect(snapshot.sectionId).toBe("rate-limiting-intro");
    expect(snapshot.activeSectionAnchor).toBe("#intro");
    expect(typeof snapshot.episodeId).toBe("string");
  });

  it("debounces emission instead of firing once per recorded signal", () => {
    const onSnapshot = vi.fn();
    const { result } = renderHook(() =>
      useReadingTelemetry({ ...defaultProps(), onSnapshot }),
    );

    act(() => {
      result.current.recordQuizIncorrect();
      result.current.recordQuizIncorrect();
      result.current.recordQuizIncorrect();
    });

    expect(onSnapshot).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(onSnapshot.mock.calls[0][0].quizIncorrectCount).toBe(3);
  });

  it("does not include or expose any assistance-enabled/consent field", () => {
    // Regression test: deterministic eligibility (#7) must stay
    // evidence-only and independent of assistance consent/decline
    // state (#14). The hook's options and every emitted snapshot must
    // have no such flag, and an active collector must always emit.
    const onSnapshot = vi.fn();
    const { result } = renderHook(() =>
      useReadingTelemetry({ ...defaultProps(), onSnapshot }),
    );

    act(() => {
      result.current.recordQuizIncorrect();
      vi.advanceTimersByTime(600);
    });

    expect(onSnapshot).toHaveBeenCalledTimes(1);
    const snapshot = onSnapshot.mock.calls[0][0] as ReadingTelemetry;
    expect(snapshot).not.toHaveProperty("assistanceEnabled");
    expect(Object.keys(snapshot)).not.toContain("assistanceEnabled");
  });

  it("records repeated selection within the same section as a reread", () => {
    const { result } = renderHook(() => useReadingTelemetry(defaultProps()));

    act(() => {
      selectWithinSection("rate-limiting-intro");
      selectWithinSection("rate-limiting-intro");
    });

    expect(result.current.getSnapshot()?.selectionRepeatCount).toBe(1);
  });

  it("does not count selections in two different sections as a repeat", () => {
    const { result } = renderHook(() => useReadingTelemetry(defaultProps()));

    act(() => {
      selectWithinSection("rate-limiting-intro");
      selectWithinSection("backoff-section");
    });

    expect(result.current.getSnapshot()?.selectionRepeatCount).toBe(0);
  });

  it("never stores or emits the raw selected text", () => {
    // Regression test: only the containing section id may be used for
    // repeat-selection detection; the selected text content itself
    // must never be retained on episode state or appear in a snapshot.
    const onSnapshot = vi.fn();
    const { result } = renderHook(() =>
      useReadingTelemetry({ ...defaultProps(), onSnapshot }),
    );

    act(() => {
      selectWithinSection(
        "rate-limiting-intro",
        "a very specific sentence about exponential backoff",
      );
      selectWithinSection(
        "rate-limiting-intro",
        "a very specific sentence about exponential backoff",
      );
      vi.advanceTimersByTime(600);
    });

    expect(result.current.getSnapshot()?.selectionRepeatCount).toBe(1);
    const snapshot = onSnapshot.mock.calls[0][0] as ReadingTelemetry;
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toMatch(/exponential backoff/i);
  });

  it("counts a manual selection-repeat signal", () => {
    const { result } = renderHook(() => useReadingTelemetry(defaultProps()));

    act(() => {
      result.current.recordSelectionRepeat();
    });

    expect(result.current.getSnapshot()?.selectionRepeatCount).toBe(1);
  });

  it("detects a scroll-direction reversal", () => {
    const { result } = renderHook(() => useReadingTelemetry(defaultProps()));

    act(() => {
      dispatchScroll(100);
      dispatchScroll(200);
      dispatchScroll(150);
    });

    expect(result.current.getSnapshot()?.scrollReversalCount).toBe(1);
  });

  it("does not count continued scrolling in the same direction", () => {
    const { result } = renderHook(() => useReadingTelemetry(defaultProps()));

    act(() => {
      dispatchScroll(100);
      dispatchScroll(200);
      dispatchScroll(300);
    });

    expect(result.current.getSnapshot()?.scrollReversalCount).toBe(0);
  });

  it("accumulates glossary hover duration between start and end", () => {
    const { result } = renderHook(() => useReadingTelemetry(defaultProps()));

    act(() => {
      result.current.recordGlossaryHoverStart();
      vi.advanceTimersByTime(1500);
      result.current.recordGlossaryHoverEnd();
    });

    expect(result.current.getSnapshot()?.jargonHoverMs).toBeGreaterThanOrEqual(
      1500,
    );
  });

  it("accumulates inactivity while no activity signals occur", () => {
    const { result } = renderHook(() => useReadingTelemetry(defaultProps()));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.getSnapshot()?.inactivityMs).toBeGreaterThanOrEqual(
      3000,
    );
  });

  it("measures continuous inactivity without double-counting overlapping activity", () => {
    // Regression test: activity events must only advance the activity
    // cursor, never record duration themselves, so a real event
    // firing between poller ticks cannot double-book the same window
    // together with the poller.
    const { result } = renderHook(() => useReadingTelemetry(defaultProps()));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // A real activity signal mid-window should not add its own
    // inactivity recording on top of the poller's.
    act(() => {
      result.current.recordQuizIncorrect();
      vi.advanceTimersByTime(1000);
    });

    const snapshot = result.current.getSnapshot();
    // Two full 1000ms poll windows elapsed; the activity signal reset
    // the cursor but recorded no duration of its own, so the total
    // must stay at exactly two windows, not more.
    expect(snapshot?.inactivityMs).toBe(2000);
  });

  it("counts an incorrect quiz attempt", () => {
    const { result } = renderHook(() => useReadingTelemetry(defaultProps()));

    act(() => {
      result.current.recordQuizIncorrect();
      result.current.recordQuizIncorrect();
    });

    expect(result.current.getSnapshot()?.quizIncorrectCount).toBe(2);
  });

  it("combines multiple simultaneous signals in one snapshot", () => {
    const { result } = renderHook(() => useReadingTelemetry(defaultProps()));

    act(() => {
      result.current.recordSelectionRepeat();
      dispatchScroll(100);
      dispatchScroll(200);
      dispatchScroll(100);
      result.current.recordQuizIncorrect();
    });

    const snapshot = result.current.getSnapshot();
    expect(snapshot?.selectionRepeatCount).toBe(1);
    expect(snapshot?.scrollReversalCount).toBe(1);
    expect(snapshot?.quizIncorrectCount).toBe(1);
  });

  it("pause stops further collection immediately", () => {
    const { result } = renderHook(() => useReadingTelemetry(defaultProps()));

    act(() => {
      result.current.pause();
    });

    expect(result.current.status).toBe("paused");

    act(() => {
      result.current.recordQuizIncorrect();
      result.current.recordSelectionRepeat();
      dispatchScroll(100);
      dispatchScroll(0);
    });

    const snapshot = result.current.getSnapshot();
    expect(snapshot?.quizIncorrectCount).toBe(0);
    expect(snapshot?.selectionRepeatCount).toBe(0);
    expect(snapshot?.scrollReversalCount).toBe(0);
  });

  it("resume restarts collection without duplicating listeners", () => {
    const { result } = renderHook(() => useReadingTelemetry(defaultProps()));

    act(() => {
      result.current.pause();
      result.current.resume();
    });

    expect(result.current.status).toBe("active");

    act(() => {
      dispatchScroll(100);
      dispatchScroll(200);
      dispatchScroll(150);
    });

    // A single duplicated listener would double-count this reversal.
    expect(result.current.getSnapshot()?.scrollReversalCount).toBe(1);
  });

  it("reset clears counters, assigns a new episode id, and keeps status", () => {
    const { result } = renderHook(() => useReadingTelemetry(defaultProps()));

    act(() => {
      result.current.recordSelectionRepeat();
      result.current.recordQuizIncorrect();
    });

    const previousEpisodeId = result.current.episodeId;

    act(() => {
      result.current.reset();
    });

    expect(result.current.episodeId).not.toBe(previousEpisodeId);
    expect(result.current.status).toBe("active");
    const snapshot = result.current.getSnapshot();
    expect(snapshot?.selectionRepeatCount).toBe(0);
    expect(snapshot?.quizIncorrectCount).toBe(0);
  });

  it("starts a fresh episode with zeroed counters when the active section changes", () => {
    // Regression test: an in-place section update previously kept the
    // same episode id and counters, letting section A's evidence be
    // attributed to section B in the next snapshot.
    const { result, rerender } = renderHook(
      (props: { sectionId: string; activeSectionAnchor: string }) =>
        useReadingTelemetry(props),
      { initialProps: defaultProps() },
    );

    act(() => {
      result.current.recordSelectionRepeat();
      result.current.recordQuizIncorrect();
      dispatchScroll(100);
      dispatchScroll(200);
      dispatchScroll(100);
    });

    const previousEpisodeId = result.current.episodeId;
    const previousSnapshot = result.current.getSnapshot();
    expect(previousSnapshot?.selectionRepeatCount).toBe(1);
    expect(previousSnapshot?.quizIncorrectCount).toBe(1);
    expect(previousSnapshot?.scrollReversalCount).toBe(1);

    act(() => {
      rerender({
        sectionId: "backoff-section",
        activeSectionAnchor: "#backoff",
      });
    });

    expect(result.current.episodeId).not.toBe(previousEpisodeId);
    const nextSnapshot = result.current.getSnapshot();
    expect(nextSnapshot?.sectionId).toBe("backoff-section");
    expect(nextSnapshot?.activeSectionAnchor).toBe("#backoff");
    expect(nextSnapshot?.selectionRepeatCount).toBe(0);
    expect(nextSnapshot?.quizIncorrectCount).toBe(0);
    expect(nextSnapshot?.scrollReversalCount).toBe(0);
  });

  it("does not start a fresh episode when section/anchor are unchanged", () => {
    const { result, rerender } = renderHook(
      (props: { sectionId: string; activeSectionAnchor: string }) =>
        useReadingTelemetry(props),
      { initialProps: defaultProps() },
    );

    act(() => {
      result.current.recordSelectionRepeat();
    });
    const previousEpisodeId = result.current.episodeId;

    act(() => {
      rerender(defaultProps());
    });

    expect(result.current.episodeId).toBe(previousEpisodeId);
    expect(result.current.getSnapshot()?.selectionRepeatCount).toBe(1);
  });

  it("cleans up listeners and timers on unmount", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");

    const { unmount } = renderHook(() => useReadingTelemetry(defaultProps()));
    const addedEventTypes = addEventListenerSpy.mock.calls.map(
      (call) => call[0],
    );

    unmount();

    const removedEventTypes = removeEventListenerSpy.mock.calls.map(
      (call) => call[0],
    );
    for (const type of addedEventTypes) {
      expect(removedEventTypes).toContain(type);
    }
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("does not create duplicate listeners under strict-mode double invocation", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    // Simulates React Strict Mode's mount -> unmount -> mount cycle.
    const first = renderHook(() => useReadingTelemetry(defaultProps()));
    first.unmount();
    const second = renderHook(() => useReadingTelemetry(defaultProps()));

    const scrollListenerCount = addEventListenerSpy.mock.calls.filter(
      (call) => call[0] === "scroll",
    ).length;

    act(() => {
      dispatchScroll(100);
      dispatchScroll(200);
      dispatchScroll(150);
    });

    // Two renderHook mounts each add one scroll listener; only the
    // second (still-mounted) hook should observe this reversal once.
    expect(scrollListenerCount).toBe(2);
    expect(second.result.current.getSnapshot()?.scrollReversalCount).toBe(1);
  });
});
