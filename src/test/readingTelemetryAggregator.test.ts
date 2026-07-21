import { describe, expect, it } from "vitest";
import {
  ReadingTelemetryAggregator,
  type EpisodeInit,
} from "@/lib/telemetry/readingTelemetryAggregator";

function makeAggregator(overrides: Partial<EpisodeInit> = {}) {
  return new ReadingTelemetryAggregator({
    episodeId: "ep-1",
    sectionId: "rate-limiting-intro",
    activeSectionAnchor: "#intro",
    source: "genuine",
    assistanceEnabled: true,
    ...overrides,
  });
}

describe("ReadingTelemetryAggregator", () => {
  it("starts every counter at zero", () => {
    const aggregator = makeAggregator();
    const snapshot = aggregator.snapshot();

    expect(snapshot).toMatchObject({
      episodeId: "ep-1",
      sectionId: "rate-limiting-intro",
      activeSectionAnchor: "#intro",
      source: "genuine",
      assistanceEnabled: true,
      selectionRepeatCount: 0,
      scrollReversalCount: 0,
      jargonHoverMs: 0,
      inactivityMs: 0,
      quizIncorrectCount: 0,
      sectionVisibleMs: 0,
    });
    expect(typeof snapshot.capturedAt).toBe("string");
  });

  it("increments each counter independently", () => {
    const aggregator = makeAggregator();
    aggregator.recordSelectionRepeat();
    aggregator.recordSelectionRepeat();
    aggregator.recordScrollReversal();
    aggregator.recordQuizIncorrect();
    aggregator.recordJargonHoverMs(1200);
    aggregator.recordInactivityMs(500);
    aggregator.recordSectionVisibleMs(3000);

    const snapshot = aggregator.snapshot();
    expect(snapshot.selectionRepeatCount).toBe(2);
    expect(snapshot.scrollReversalCount).toBe(1);
    expect(snapshot.quizIncorrectCount).toBe(1);
    expect(snapshot.jargonHoverMs).toBe(1200);
    expect(snapshot.inactivityMs).toBe(500);
    expect(snapshot.sectionVisibleMs).toBe(3000);
  });

  it("accumulates durations across multiple calls", () => {
    const aggregator = makeAggregator();
    aggregator.recordJargonHoverMs(400);
    aggregator.recordJargonHoverMs(600);
    expect(aggregator.snapshot().jargonHoverMs).toBe(1000);
  });

  it("ignores non-positive durations", () => {
    const aggregator = makeAggregator();
    aggregator.recordJargonHoverMs(0);
    aggregator.recordJargonHoverMs(-50);
    aggregator.recordInactivityMs(-10);
    aggregator.recordSectionVisibleMs(0);

    const snapshot = aggregator.snapshot();
    expect(snapshot.jargonHoverMs).toBe(0);
    expect(snapshot.inactivityMs).toBe(0);
    expect(snapshot.sectionVisibleMs).toBe(0);
  });

  it("updates the active section without resetting counters", () => {
    const aggregator = makeAggregator();
    aggregator.recordSelectionRepeat();
    aggregator.setActiveSection("backoff-section", "#backoff");

    const snapshot = aggregator.snapshot();
    expect(snapshot.sectionId).toBe("backoff-section");
    expect(snapshot.activeSectionAnchor).toBe("#backoff");
    expect(snapshot.selectionRepeatCount).toBe(1);
  });

  it("updates assistanceEnabled in place", () => {
    const aggregator = makeAggregator({ assistanceEnabled: false });
    expect(aggregator.assistanceEnabled).toBe(false);
    aggregator.setAssistanceEnabled(true);
    expect(aggregator.assistanceEnabled).toBe(true);
    expect(aggregator.snapshot().assistanceEnabled).toBe(true);
  });

  it("labels demo telemetry distinctly from genuine telemetry", () => {
    const demo = makeAggregator({ source: "demo" });
    expect(demo.snapshot().source).toBe("demo");
  });

  it("reset clears every counter and assigns a new episode id", () => {
    const aggregator = makeAggregator();
    aggregator.recordSelectionRepeat();
    aggregator.recordJargonHoverMs(500);

    aggregator.reset({
      episodeId: "ep-2",
      sectionId: "backoff-section",
      activeSectionAnchor: "#backoff",
      source: "genuine",
      assistanceEnabled: true,
    });

    const snapshot = aggregator.snapshot();
    expect(snapshot.episodeId).toBe("ep-2");
    expect(snapshot.sectionId).toBe("backoff-section");
    expect(snapshot.selectionRepeatCount).toBe(0);
    expect(snapshot.jargonHoverMs).toBe(0);
  });

  it("snapshot never includes fields beyond the ReadingTelemetry contract", () => {
    const aggregator = makeAggregator();
    const snapshot = aggregator.snapshot();
    expect(Object.keys(snapshot).sort()).toEqual(
      [
        "activeSectionAnchor",
        "assistanceEnabled",
        "capturedAt",
        "episodeId",
        "inactivityMs",
        "jargonHoverMs",
        "quizIncorrectCount",
        "scrollReversalCount",
        "sectionId",
        "sectionVisibleMs",
        "selectionRepeatCount",
        "source",
      ].sort(),
    );
  });
});
