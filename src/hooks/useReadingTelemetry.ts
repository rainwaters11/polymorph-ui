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
  assistanceEnabled: boolean;
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
  lastSelectedText: string | null;
  glossaryHoverStartedAt: number | null;
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
    lastSelectedText: null,
    glossaryHoverStartedAt: null,
    lastActivityAt: now,
    sectionVisibleSince:
      typeof document === "undefined" || document.visibilityState === "visible"
        ? now
        : null,
  };
}

/**
 * Aggregates privacy-safe reading-friction signals for one episode and
 * periodically emits a batched ReadingTelemetry snapshot. Collection
 * status (`active`/`paused`) is independent of assistance consent:
 * pausing stops collection immediately, and `assistanceEnabled` only
 * controls whether snapshots are emitted outward, never whether the
 * underlying evidence is collected.
 *
 * The initial episode id uses React's lazy `useState` initializer (the
 * sanctioned one-time-impurity pattern) so render stays pure; every
 * other mutation happens in effects or event-driven callbacks, which
 * keeps this hook safe under React Strict Mode's mount/unmount/mount
 * cycle without creating duplicate listeners.
 *
 * No raw events, keystrokes, or per-interaction timestamps ever leave
 * this hook — only aggregated counts and durations.
 */
export function useReadingTelemetry({
  sectionId,
  activeSectionAnchor,
  assistanceEnabled,
  source = "genuine",
  onSnapshot,
}: UseReadingTelemetryOptions): ReadingTelemetryControls {
  const [status, setStatus] = useState<TelemetryStatus>("active");
  const [episodeId, setEpisodeId] = useState<string>(() => createEpisodeId());

  const statusRef = useRef<TelemetryStatus>("active");
  const assistanceEnabledRef = useRef(assistanceEnabled);
  const onSnapshotRef = useRef(onSnapshot);
  const sectionRef = useRef({ sectionId, activeSectionAnchor });
  const episodeRef = useRef<MutableEpisodeState | null>(null);

  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
  }, [onSnapshot]);

  useEffect(() => {
    assistanceEnabledRef.current = assistanceEnabled;
    episodeRef.current?.aggregator.setAssistanceEnabled(assistanceEnabled);
  }, [assistanceEnabled]);

  useEffect(() => {
    sectionRef.current = { sectionId, activeSectionAnchor };
    episodeRef.current?.aggregator.setActiveSection(
      sectionId,
      activeSectionAnchor,
    );
  }, [sectionId, activeSectionAnchor]);

  // Builds the aggregator for the lazily-created episode id on mount.
  // Strict mode's extra mount/unmount/mount pass builds and discards a
  // throwaway aggregator before the real one starts; no listeners are
  // attached here, so nothing duplicates.
  useEffect(() => {
    episodeRef.current = createMutableEpisodeState(
      new ReadingTelemetryAggregator({
        episodeId,
        sectionId: sectionRef.current.sectionId,
        activeSectionAnchor: sectionRef.current.activeSectionAnchor,
        source,
        assistanceEnabled: assistanceEnabledRef.current,
      }),
    );

    return () => {
      episodeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- source is captured once per episode id; a source change alone doesn't need to start a new episode.
  }, [episodeId]);

  const emitSnapshot = useCallback(() => {
    if (!assistanceEnabledRef.current) return;
    const episode = episodeRef.current;
    if (!episode) return;
    onSnapshotRef.current?.(episode.aggregator.snapshot());
  }, []);

  const markActivity = useCallback(() => {
    const episode = episodeRef.current;
    if (!episode) return;
    const now = Date.now();
    const idleFor = now - episode.lastActivityAt;
    if (idleFor > 0) {
      episode.aggregator.recordInactivityMs(idleFor);
    }
    episode.lastActivityAt = now;
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

  // Reassigning episodeId triggers the mount effect above to rebuild a
  // fresh aggregator and episode state for the new episode.
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

  // Text-selection repeat detection: two selections of the same
  // non-empty text within the current section count as a "reread".
  useEffect(() => {
    function handleSelectionChange() {
      if (statusRef.current !== "active") return;
      const episode = episodeRef.current;
      if (!episode) return;
      const selection =
        typeof window !== "undefined" ? window.getSelection() : null;
      const text = selection ? selection.toString().trim() : "";
      if (!text) return;

      if (episode.lastSelectedText === text) {
        episode.aggregator.recordSelectionRepeat();
      }
      episode.lastSelectedText = text;
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

  // Inactivity polling: batches idle time into the aggregator without
  // firing a listener per event; ticks are cheap and cleanup-safe.
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
