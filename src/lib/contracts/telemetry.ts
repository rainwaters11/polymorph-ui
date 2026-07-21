import type {
  DocumentSectionAnchor,
  DocumentSectionId,
} from "@/lib/contracts/document";

/**
 * Telemetry collection status is independent of assistance consent
 * (DESIGN.md §4). Pausing stops collection immediately but never
 * disables manual help or changes consent routing.
 */
export type TelemetryStatus = "active" | "paused";

export type TelemetrySource = "genuine" | "demo";

/**
 * The smallest set of privacy-safe interaction summaries needed to
 * recognize reading friction. Every field is a locally aggregated
 * count or duration — never a raw event, keystroke, selected text, or
 * timestamp series.
 *
 * Deliberately excludes any assistance-enabled or consent-derived
 * flag: per DESIGN.md and #14, deterministic eligibility (#7) must
 * stay evidence-only and independent of assistance consent/decline
 * state. An active collector always emits privacy-safe summaries;
 * consent and proactive routing are #10's responsibility, applied
 * downstream of this evidence, never inside it.
 */
export type ReadingTelemetry = {
  episodeId: string;
  sectionId: DocumentSectionId;
  activeSectionAnchor: DocumentSectionAnchor;
  source: TelemetrySource;
  selectionRepeatCount: number;
  scrollReversalCount: number;
  jargonHoverMs: number;
  /** Longest continuous idle period observed during this episode. */
  inactivityMs: number;
  quizIncorrectCount: number;
  sectionVisibleMs: number;
  capturedAt: string;
};

export type ReadingTelemetryCallback = (snapshot: ReadingTelemetry) => void;
