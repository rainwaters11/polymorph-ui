import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DocumentSectionAnchor,
  DocumentSectionId,
} from "@/lib/contracts/document";
import type {
  ReadingTelemetry,
  ReadingTelemetryCallback,
  TelemetrySource,
  TelemetryStatus,
} from "@/lib/contracts/telemetry";
import { ReadingTelemetryAggregator } from "@/lib/telemetry/readingTelemetryAggregator";

const INACTIVITY_POLL_MS = 1000;
const SNAPSHOT_BATCH_MS = 500;

function createEpisodeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `episode-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type UseReadingTelemetryOptions = {
  sectionId: DocumentSectionId;
  activeSectionAnchor: DocumentSectionAnchor;
  source?: TelemetrySource;
  onSnapshot?: ReadingTelemetryCallback;
};

export type ReadingTelemetryControls = {
  status: TelemetryStatus;
  episodeId: string;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  recordSelectionRepeat: () => void;
  recordGlossaryHoverStart: () => void;
  recordGlossaryHoverEnd: () => void;
  recordQuizIncorrect: () => void;
  getSnapshot: () => ReadingTelemetry | null;
};

type MutableEpisodeState = {
  aggregator: ReadingTelemetryAggregator;
  lastScrollY: number | null;
  lastScrollDirection: "up" | "down" | null;
  /**
   * Identity of the document section containing the most recent
   * non-empty selection — never the selected text itself. Comparing
   * this stable, already-public section id is enough to detect a
   * "reread" of the same section without retaining any content.
   */
  lastSelectionSectionId: DocumentSectionId | null;
  glossaryHoverStartedAt: number | null;
  /**
   * Single source of truth for inactivity accounting: the poller is
   * the only writer of `inactivityMs`, ticking off whole
   * `INACTIVITY_POLL_MS` windows since this timestamp. Activity
   * signals only ever advance this timestamp forward (never record
   * duration themselves), so no window can be double-counted between
   * an event handler and the poller.
   */
  lastActivityAt: number;
  sectionVisibleSince: number | null;
};

function createMutableEpisodeState(
  aggregator: ReadingTelemetryAggregator,
): MutableEpisodeState {
  const now = Date.now();
  return {
    aggregator,
    lastScrollY: null,
    lastScrollDirection: null,
    lastSelectionSectionId: null,
    glossaryHoverStartedAt: null,
    lastActivityAt: now,
    sectionVisibleSince:
      typeof document === "undefined" || document.visibilityState === "visible"
        ? now
        : null,
  };
}

/**
 * Finds the nearest ancestor's `data-document-section` value for a DOM
 * node, so repeat-selection detection can key off the stable section
 * identity instead of the selected text content.
 */
function findContainingSectionId(node: Node | null): string | null {
  let element = node instanceof Element ? node : (node?.parentElement ?? null);
  while (element) {
    const sectionId = element.getAttribute?.("data-document-section");
    if (sectionId) return sectionId;
    element = element.parentElement;
  }
  return null;
}

/**
 * Aggregates privacy-safe reading-friction signals for one episode and
 * periodically emits a batched ReadingTelemetry snapshot. Collection
 * status (`active`/`paused`) is the only gate on collection; there is
 * no assistance-enabled or consent flag anywhere in this hook or the
 * emitted contract; per DESIGN.md and #14, deterministic eligibility
 * must stay evidence-only and independent of assistance consent or
 * decline state. An active collector always emits its summaries —
 * consent-based routing is #10's responsibility, applied downstream.
 *
 * A change to the active section/anchor ends the current episode and
 * starts a fresh one with zeroed counters, so evidence from one
 * section can never be attributed to another.
 *
 * All impure setup (episode id, aggregator construction) happens via
 * React's lazy useState initializer and effects rather than the render
 * body, keeping the hook safe under React Strict Mode's
 * mount/unmount/mount cycle without creating duplicate listeners.
 *
 * No raw events, keystrokes, selected text, or per-interaction
 * timestamps ever leave this hook — only aggregated counts and
 * durations.
 */
export function useReadingTelemetry({
  sectionId,
  activeSectionAnchor,
  source = "genuine",
  onSnapshot,
}: UseReadingTelemetryOptions): ReadingTelemetryControls {
  const [status, setStatus] = useState<TelemetryStatus>("active");
  const [episodeId, setEpisodeId] = useState<string>(() => createEpisodeId());

  const statusRef = useRef<TelemetryStatus>("active");
  const onSnapshotRef = useRef(onSnapshot);
  const sectionRef = useRef({ sectionId, activeSectionAnchor });
  const episodeRef = useRef<MutableEpisodeState | null>(null);

  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
  }, [onSnapshot]);

  // A section/anchor change starts a fresh episode: reusing the
  // episode id would otherwise let one section's counters leak into
  // the next section's snapshot.
  useEffect(() => {
    const current = sectionRef.current;
    if (
      current.sectionId === sectionId &&
      current.activeSectionAnchor === activeSectionAnchor
    ) {
      return;
    }
    sectionRef.current = { sectionId, activeSectionAnchor };
    setEpisodeId(createEpisodeId());
  }, [sectionId, activeSectionAnchor]);

  // Builds the aggregator for the current episode id. Strict mode's
  // extra mount/unmount/mount pass builds and discards a throwaway
  // aggregator before the real one starts; no listeners are attached
  // here, so nothing duplicates.
  useEffect(() => {
    episodeRef.current = createMutableEpisodeState(
      new ReadingTelemetryAggregator({
        episodeId,
        sectionId: sectionRef.current.sectionId,
        activeSectionAnchor: sectionRef.current.activeSectionAnchor,
        source,
      }),
    );

    return () => {
      episodeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- source is captured once per episode id; a source change alone doesn't need to start a new episode.
  }, [episodeId]);

  const emitSnapshot = useCallback(() => {
    const episode = episodeRef.current;
    if (!episode) return;
    onSnapshotRef.current?.(episode.aggregator.snapshot());
  }, []);

  /**
   * Records engagement without itself accounting for inactivity
   * duration — the interval poller below is the sole writer of
   * `inactivityMs`. This function only advances the activity cursor,
   * so a real event and a poller tick can never double-book the same
   * elapsed window.
   */
  const markActivity = useCallback(() => {
    const episode = episodeRef.current;
    if (!episode) return;
    episode.lastActivityAt = Date.now();
  }, []);

  const pause = useCallback(() => {
    statusRef.current = "paused";
    setStatus("paused");
    const episode = episodeRef.current;
    if (episode) {
      episode.glossaryHoverStartedAt = null;
      episode.sectionVisibleSince = null;
    }
  }, []);

  const resume = useCallback(() => {
    statusRef.current = "active";
    setStatus("active");
    const episode = episodeRef.current;
    if (episode) {
      episode.lastActivityAt = Date.now();
      episode.sectionVisibleSince =
        typeof document === "undefined" ||
        document.visibilityState === "visible"
          ? Date.now()
          : null;
    }
  }, []);

  // Reassigning episodeId triggers the aggregator-construction effect
  // above to rebuild a fresh aggregator and episode state.
  const reset = useCallback(() => {
    setEpisodeId(createEpisodeId());
  }, []);

  const recordSelectionRepeat = useCallback(() => {
    if (statusRef.current !== "active") return;
    episodeRef.current?.aggregator.recordSelectionRepeat();
    markActivity();
  }, [markActivity]);

  const recordGlossaryHoverStart = useCallback(() => {
    if (statusRef.current !== "active") return;
    const episode = episodeRef.current;
    if (episode) episode.glossaryHoverStartedAt = Date.now();
    markActivity();
  }, [markActivity]);

  const recordGlossaryHoverEnd = useCallback(() => {
    if (statusRef.current !== "active") return;
    const episode = episodeRef.current;
    if (episode && episode.glossaryHoverStartedAt !== null) {
      episode.aggregator.recordJargonHoverMs(
        Date.now() - episode.glossaryHoverStartedAt,
      );
      episode.glossaryHoverStartedAt = null;
    }
    markActivity();
  }, [markActivity]);

  const recordQuizIncorrect = useCallback(() => {
    if (statusRef.current !== "active") return;
    episodeRef.current?.aggregator.recordQuizIncorrect();
    markActivity();
  }, [markActivity]);

  const getSnapshot = useCallback((): ReadingTelemetry | null => {
    return episodeRef.current?.aggregator.snapshot() ?? null;
  }, []);

  // Repeat-selection detection keys off the stable containing-section
  // identity only. The selected text itself is read transiently to
  // check for non-emptiness and is never stored on the episode state
  // or emitted in any snapshot.
  useEffect(() => {
    function handleSelectionChange() {
      if (statusRef.current !== "active") return;
      const episode = episodeRef.current;
      if (!episode) return;
      const selection =
        typeof window !== "undefined" ? window.getSelection() : null;
      if (!selection || selection.isCollapsed) return;
      const text = selection.toString().trim();
      if (!text) return;

      const containingSectionId = findContainingSectionId(selection.anchorNode);
      if (!containingSectionId) return;

      if (episode.lastSelectionSectionId === containingSectionId) {
        episode.aggregator.recordSelectionRepeat();
      }
      episode.lastSelectionSectionId = containingSectionId;
      markActivity();
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [markActivity]);

  // Scroll-direction reversal detection.
  useEffect(() => {
    function handleScroll() {
      if (statusRef.current !== "active") return;
      const episode = episodeRef.current;
      if (!episode) return;
      const currentY = window.scrollY;
      const previousY = episode.lastScrollY;
      episode.lastScrollY = currentY;
      markActivity();

      if (previousY === null || currentY === previousY) return;
      const direction: "up" | "down" = currentY > previousY ? "down" : "up";
      const previousDirection = episode.lastScrollDirection;
      if (previousDirection && previousDirection !== direction) {
        episode.aggregator.recordScrollReversal();
      }
      episode.lastScrollDirection = direction;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [markActivity]);

  // Keyboard activity also counts as engagement for inactivity tracking.
  useEffect(() => {
    function handleKeydown() {
      if (statusRef.current !== "active") return;
      markActivity();
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [markActivity]);

  // Section-visibility duration, paused while the tab/document is hidden.
  useEffect(() => {
    function flushVisibleDuration() {
      const episode = episodeRef.current;
      if (!episode || episode.sectionVisibleSince === null) return;
      episode.aggregator.recordSectionVisibleMs(
        Date.now() - episode.sectionVisibleSince,
      );
    }

    function handleVisibilityChange() {
      if (statusRef.current !== "active") return;
      const episode = episodeRef.current;
      if (!episode) return;
      if (document.visibilityState === "visible") {
        episode.sectionVisibleSince = Date.now();
      } else {
        flushVisibleDuration();
        episode.sectionVisibleSince = null;
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      flushVisibleDuration();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sectionId]);

  // Sole writer of inactivityMs: ticks off whole poll windows measured
  // against `lastActivityAt`, which activity signals only ever advance
  // (never record duration themselves). This keeps inactivity
  // accounting continuous and free of double-counting between event
  // handlers and this poller.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (statusRef.current !== "active") return;
      const episode = episodeRef.current;
      if (!episode) return;
      const idleFor = Date.now() - episode.lastActivityAt;
      if (idleFor >= INACTIVITY_POLL_MS) {
        episode.aggregator.recordInactivityMs(INACTIVITY_POLL_MS);
        episode.lastActivityAt += INACTIVITY_POLL_MS;
      }
    }, INACTIVITY_POLL_MS);
    return () => window.clearInterval(interval);
  }, []);

  // Batches outward snapshot emission instead of firing on every
  // recorded signal.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (statusRef.current !== "active") return;
      emitSnapshot();
    }, SNAPSHOT_BATCH_MS);
    return () => window.clearInterval(interval);
  }, [emitSnapshot]);

  return useMemo(
    () => ({
      status,
      episodeId,
      pause,
      resume,
      reset,
      recordSelectionRepeat,
      recordGlossaryHoverStart,
      recordGlossaryHoverEnd,
      recordQuizIncorrect,
      getSnapshot,
    }),
    [
      status,
      episodeId,
      pause,
      resume,
      reset,
      recordSelectionRepeat,
      recordGlossaryHoverStart,
      recordGlossaryHoverEnd,
      recordQuizIncorrect,
      getSnapshot,
    ],
  );
}
