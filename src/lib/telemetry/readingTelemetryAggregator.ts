import type {
  DocumentSectionAnchor,
  DocumentSectionId,
} from "@/lib/contracts/document";
import type {
  ReadingTelemetry,
  TelemetrySource,
} from "@/lib/contracts/telemetry";

export type EpisodeInit = {
  episodeId: string;
  sectionId: DocumentSectionId;
  activeSectionAnchor: DocumentSectionAnchor;
  source: TelemetrySource;
  assistanceEnabled: boolean;
};

type EpisodeState = EpisodeInit & {
  selectionRepeatCount: number;
  scrollReversalCount: number;
  jargonHoverMs: number;
  inactivityMs: number;
  quizIncorrectCount: number;
  sectionVisibleMs: number;
};

function createEpisodeState(init: EpisodeInit): EpisodeState {
  return {
    ...init,
    selectionRepeatCount: 0,
    scrollReversalCount: 0,
    jargonHoverMs: 0,
    inactivityMs: 0,
    quizIncorrectCount: 0,
    sectionVisibleMs: 0,
  };
}

/**
 * Pure, framework-free local aggregator for one reading-friction
 * episode. Every method mutates in-memory counters only; nothing here
 * ever performs I/O, timers, or event-listener wiring — that belongs
 * to `useReadingTelemetry`, which drives this class from real
 * (or simulated demo) browser signals.
 *
 * No thresholds, scores, or eligibility decisions are made here; that
 * classification is out of scope for this module.
 */
export class ReadingTelemetryAggregator {
  private state: EpisodeState;

  constructor(init: EpisodeInit) {
    this.state = createEpisodeState(init);
  }

  get episodeId(): string {
    return this.state.episodeId;
  }

  get assistanceEnabled(): boolean {
    return this.state.assistanceEnabled;
  }

  setAssistanceEnabled(enabled: boolean): void {
    this.state.assistanceEnabled = enabled;
  }

  setActiveSection(
    sectionId: DocumentSectionId,
    anchor: DocumentSectionAnchor,
  ): void {
    this.state.sectionId = sectionId;
    this.state.activeSectionAnchor = anchor;
  }

  recordSelectionRepeat(): void {
    this.state.selectionRepeatCount += 1;
  }

  recordScrollReversal(): void {
    this.state.scrollReversalCount += 1;
  }

  recordJargonHoverMs(durationMs: number): void {
    if (durationMs <= 0) return;
    this.state.jargonHoverMs += durationMs;
  }

  recordInactivityMs(durationMs: number): void {
    if (durationMs <= 0) return;
    this.state.inactivityMs += durationMs;
  }

  recordQuizIncorrect(): void {
    this.state.quizIncorrectCount += 1;
  }

  recordSectionVisibleMs(durationMs: number): void {
    if (durationMs <= 0) return;
    this.state.sectionVisibleMs += durationMs;
  }

  /** Returns a complete, privacy-safe snapshot of the episode so far. */
  snapshot(
    now: () => string = () => new Date().toISOString(),
  ): ReadingTelemetry {
    return {
      episodeId: this.state.episodeId,
      sectionId: this.state.sectionId,
      activeSectionAnchor: this.state.activeSectionAnchor,
      source: this.state.source,
      assistanceEnabled: this.state.assistanceEnabled,
      selectionRepeatCount: this.state.selectionRepeatCount,
      scrollReversalCount: this.state.scrollReversalCount,
      jargonHoverMs: this.state.jargonHoverMs,
      inactivityMs: this.state.inactivityMs,
      quizIncorrectCount: this.state.quizIncorrectCount,
      sectionVisibleMs: this.state.sectionVisibleMs,
      capturedAt: now(),
    };
  }

  /** Clears all counters and starts a fresh episode id/state. */
  reset(init: EpisodeInit): void {
    this.state = createEpisodeState(init);
  }
}
