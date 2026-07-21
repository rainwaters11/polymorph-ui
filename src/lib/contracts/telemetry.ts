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
 * count or duration — never a raw event, keystroke, or timestamp
 * series. `assistanceEnabled` records whether adaptive assistance was
 * enabled at capture time so an eligibility classifier (#7) never
 * needs to re-derive it, but it does not itself gate emission of the
 * snapshot — non-eligible snapshots are always emitted; only
 * adaptation-eligible ones are withheld while assistance is disabled.
 */
export type ReadingTelemetry = {
  episodeId: string;
  sectionId: DocumentSectionId;
  activeSectionAnchor: DocumentSectionAnchor;
  source: TelemetrySource;
  assistanceEnabled: boolean;
  selectionRepeatCount: number;
  scrollReversalCount: number;
  jargonHoverMs: number;
  inactivityMs: number;
  quizIncorrectCount: number;
  sectionVisibleMs: number;
  capturedAt: string;
};

export type ReadingTelemetryCallback = (snapshot: ReadingTelemetry) => void;
