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

  it("keeps the longest continuous inactivity duration", () => {
    const aggregator = makeAggregator();
    aggregator.recordInactivityMs(1000);
    aggregator.recordInactivityMs(4000);
    aggregator.recordInactivityMs(2000);

    expect(aggregator.snapshot().inactivityMs).toBe(4000);
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
    });

    const snapshot = aggregator.snapshot();
    expect(snapshot.episodeId).toBe("ep-2");
    expect(snapshot.sectionId).toBe("backoff-section");
    expect(snapshot.selectionRepeatCount).toBe(0);
    expect(snapshot.jargonHoverMs).toBe(0);
  });

  it("has no assistance-enabled or consent-derived state", () => {
    // Regression test: deterministic eligibility (#7) must stay
    // evidence-only and independent of assistance consent/decline
    // state (#14). The aggregator must not expose any such flag.
    const aggregator = makeAggregator();
    expect(aggregator).not.toHaveProperty("assistanceEnabled");
    expect(aggregator).not.toHaveProperty("setAssistanceEnabled");
    expect(aggregator.snapshot()).not.toHaveProperty("assistanceEnabled");
  });

  it("has no method to mutate the active section in place", () => {
    // Regression test: an in-place section update would let one
    // section's counters leak into another section's snapshot. There
    // must be no such method — only `reset` with a fresh episode id.
    const aggregator = makeAggregator();
    expect(
      (aggregator as unknown as { setActiveSection?: unknown })
        .setActiveSection,
    ).toBeUndefined();
  });

  it("snapshot never includes fields beyond the ReadingTelemetry contract", () => {
    const aggregator = makeAggregator();
    const snapshot = aggregator.snapshot();
    expect(Object.keys(snapshot).sort()).toEqual(
      [
        "activeSectionAnchor",
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

  it("snapshot never contains raw selected text under any key", () => {
    // Regression test: no aggregator method accepts or stores raw
    // selection content; asserting the emitted snapshot's values are
    // all numbers/strings from the fixed contract shape, never
    // arbitrary learner-authored text, guards against a future
    // regression that threads text through as e.g. an extra field.
    const aggregator = makeAggregator();
    aggregator.recordSelectionRepeat();
    const snapshot = aggregator.snapshot();
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toMatch(/exponential backoff|rate limiting/i);
  });
});
