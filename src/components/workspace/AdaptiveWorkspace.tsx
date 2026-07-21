"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { AdaptationNotice } from "@/components/adaptive/AdaptationNotice";
import { AdaptiveExperience } from "@/components/adaptive/AdaptiveExperience";
import { FrictionDecisionTrace } from "@/components/workspace/FrictionDecisionTrace";
import {
  BaselineReader,
  getSectionSourceText,
} from "@/components/reader/BaselineReader";
import { rateLimitingLesson } from "@/content/rate-limiting-lesson";
import { useReadingTelemetry } from "@/hooks/useReadingTelemetry";
import {
  adaptationMachineReducer,
  initialAdaptationMachineContext,
} from "@/lib/adaptation/adaptationMachine";
import { buildFallbackAdaptationPlan } from "@/lib/adaptation/fallbackPlan";
import {
  evaluateProactiveGate,
  initialProactiveAssistanceGate,
  parseProactiveAssistanceGate,
  PROACTIVE_GATE_STORAGE_KEY,
  recordProactiveDecline,
} from "@/lib/adaptation/proactiveGate";
import {
  adaptationPlanSchema,
  type AdaptRequest,
  type FrictionAssessment,
} from "@/lib/contracts/adaptation";
import type {
  AssistanceConsentMode,
  ManualHelpRequest,
} from "@/lib/contracts/assistance";
import type { SectionActivity } from "@/lib/contracts/document";
import type { ReadingTelemetry } from "@/lib/contracts/telemetry";
import { classifyReadingFriction } from "@/lib/friction/classifier";

const AUTOMATIC_NOTICE_MS = 1_500;
const RECOVERY_STEP_MS = 850;
const DEMO_JARGON_DWELL_MS = 4_100;

const CONSENT_MODE_LABELS: Record<AssistanceConsentMode, string> = {
  offer: "Ask before changing",
  automatic: "Automatic after a notice",
  "manual-only": "Only when I ask",
};

type AdaptationSourceSnapshot = SectionActivity & {
  episodeId: string | null;
  title: string;
  sourceText: string;
};

function sectionFor(sectionId: string) {
  return (
    rateLimitingLesson.sections.find((section) => section.id === sectionId) ??
    rateLimitingLesson.sections[0]
  );
}

function reasonSummary(assessment: FrictionAssessment | null) {
  if (!assessment) return "A focused version of this section is ready.";
  const labels = assessment.reasonCodes.map((code) =>
    code.toLowerCase().replaceAll("_", " "),
  );
  return labels.length > 0
    ? `The workspace noticed ${labels.join(", ")}. It can reduce the visual load while keeping the lesson intact.`
    : "A focused version of this section is ready.";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function readStoredProactiveGate() {
  if (typeof window === "undefined") return initialProactiveAssistanceGate;
  try {
    return parseProactiveAssistanceGate(
      window.sessionStorage.getItem(PROACTIVE_GATE_STORAGE_KEY),
    );
  } catch {
    return initialProactiveAssistanceGate;
  }
}

export function AdaptiveWorkspace() {
  const firstSection = rateLimitingLesson.sections[0];
  const [machine, dispatch] = useReducer(
    adaptationMachineReducer,
    initialAdaptationMachineContext,
  );
  const [activeSection, setActiveSection] = useState<SectionActivity>({
    sectionId: firstSection.id,
    anchor: firstSection.anchor,
  });
  const [consentMode, setConsentMode] =
    useState<AssistanceConsentMode>("offer");
  const [telemetrySource, setTelemetrySource] = useState<"genuine" | "demo">(
    "genuine",
  );
  const [latestAssessment, setLatestAssessment] =
    useState<FrictionAssessment | null>(null);
  const [proactiveGate, setProactiveGate] = useState(readStoredProactiveGate);
  const [adaptationSource, setAdaptationSource] =
    useState<AdaptationSourceSnapshot | null>(null);
  const [demoStatus, setDemoStatus] = useState<"idle" | "arming">("idle");
  const [requestStatus, setRequestStatus] = useState("");

  const previousAssessmentRef = useRef<FrictionAssessment | null>(null);
  const preservedEpisodeRef = useRef<string | null>(null);
  const manualRequestRef = useRef<ManualHelpRequest | null>(null);
  const baselineRef = useRef<HTMLDivElement>(null);
  const demoTriggerRef = useRef<HTMLButtonElement>(null);
  const focusReturnRef = useRef<HTMLElement | null>(null);
  const loadingCancelRef = useRef<HTMLButtonElement>(null);
  const preservedScrollRef = useRef(0);
  const restorePendingRef = useRef(false);
  const demoPreviousEpisodeRef = useRef<string | null>(null);
  const requestControllersRef = useRef(new Map<number, AbortController>());
  const startedRequestTokensRef = useRef(new Set<number>());

  const preserveBaselineContext = useCallback(
    (preferredFocusTarget?: HTMLElement | null) => {
      preservedScrollRef.current = window.scrollY;
      const activeElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      focusReturnRef.current =
        preferredFocusTarget ??
        (activeElement && activeElement !== document.body
          ? activeElement
          : baselineRef.current);
    },
    [],
  );

  const preserveSourceContext = useCallback(
    (
      sectionId: SectionActivity["sectionId"],
      anchor: SectionActivity["anchor"],
      episodeId: string | null,
      suppliedSourceText?: string,
    ) => {
      const section = sectionFor(sectionId);
      setAdaptationSource({
        sectionId,
        anchor,
        episodeId,
        title: section.title,
        sourceText: suppliedSourceText ?? getSectionSourceText(sectionId),
      });
    },
    [],
  );

  const handleSnapshot = useCallback(
    (snapshot: ReadingTelemetry) => {
      const assessment = classifyReadingFriction(
        snapshot,
        previousAssessmentRef.current,
      );
      previousAssessmentRef.current = assessment;
      setLatestAssessment(assessment);
      if (
        assessment.eligibleForAdaptation &&
        machine.state === "OBSERVING" &&
        preservedEpisodeRef.current !== snapshot.episodeId
      ) {
        // Bind the offer to the exact evidence episode and source section.
        // Later navigation cannot silently change what is sent to the API.
        preservedEpisodeRef.current = snapshot.episodeId;
        preserveBaselineContext(
          snapshot.source === "demo" ? demoTriggerRef.current : undefined,
        );
        preserveSourceContext(
          snapshot.sectionId,
          snapshot.activeSectionAnchor,
          snapshot.episodeId,
        );
        dispatch({ type: "ASSESSMENT_RECEIVED", assessment });
      }
    },
    [machine.state, preserveBaselineContext, preserveSourceContext],
  );

  const telemetry = useReadingTelemetry({
    sectionId: activeSection.sectionId,
    activeSectionAnchor: activeSection.anchor,
    source: telemetrySource,
    onSnapshot: handleSnapshot,
  });

  const currentSection = useMemo(
    () => sectionFor(activeSection.sectionId),
    [activeSection.sectionId],
  );
  const sourceText = useMemo(
    () => getSectionSourceText(activeSection.sectionId),
    [activeSection.sectionId],
  );
  const adapted =
    machine.state === "ADAPTED" ||
    machine.state === "FALLBACK_ADAPTED" ||
    machine.state === "RECOVERING" ||
    machine.state === "RECOVERED";
  const preparingAdaptation =
    machine.state === "ADAPTATION_OFFERED" ||
    machine.state === "AUTOMATIC_ADAPTATION_NOTICE";

  const restoreBaselinePosition = useCallback(() => {
    restorePendingRef.current = true;
    const top = preservedScrollRef.current;
    const focusTarget = focusReturnRef.current;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top, behavior: "instant" });
      if (focusTarget?.isConnected) {
        focusTarget.focus({ preventScroll: true });
      } else {
        baselineRef.current?.focus({ preventScroll: true });
      }
    });
  }, []);

  useEffect(() => {
    if (machine.state !== "OBSERVING" || !restorePendingRef.current) return;
    restorePendingRef.current = false;
    const top = preservedScrollRef.current;
    const focusTarget = focusReturnRef.current;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top, behavior: "instant" });
      if (focusTarget?.isConnected) {
        focusTarget.focus({ preventScroll: true });
      } else {
        baselineRef.current?.focus({ preventScroll: true });
      }
    });
  }, [machine.state]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        PROACTIVE_GATE_STORAGE_KEY,
        JSON.stringify(proactiveGate),
      );
    } catch {
      // In-memory suppression still protects the active page session.
    }
  }, [proactiveGate]);

  useEffect(() => {
    if (machine.state === "BASELINE") dispatch({ type: "START_OBSERVING" });
  }, [machine.state]);

  useEffect(() => {
    if (machine.state !== "FRICTION_SUSPECTED" || !machine.assessment) return;
    const gateDecision = evaluateProactiveGate(
      machine.assessment,
      proactiveGate,
      Date.now(),
    );
    if (!gateDecision.allowed) {
      dispatch({ type: "SUPPRESS_PROACTIVE" });
      return;
    }
    dispatch({ type: "ROUTE_ASSESSMENT", consentMode });
  }, [consentMode, machine.assessment, machine.state, proactiveGate]);

  useEffect(() => {
    if (
      machine.state !== "PROACTIVE_SUPPRESSED" &&
      machine.state !== "ADAPTATION_DECLINED"
    ) {
      return;
    }
    dispatch({ type: "RESUME_OBSERVING" });
  }, [machine.state]);

  useEffect(() => {
    if (
      machine.state !== "AUTOMATIC_ADAPTATION_NOTICE" ||
      consentMode !== "automatic"
    ) {
      return;
    }
    const timeout = window.setTimeout(() => {
      dispatch({ type: "CONTINUE_AUTOMATIC" });
    }, AUTOMATIC_NOTICE_MS);
    return () => window.clearTimeout(timeout);
  }, [consentMode, machine.state]);

  useEffect(() => {
    if (machine.state !== "ADAPTATION_REQUESTED") return;
    window.requestAnimationFrame(() => {
      loadingCancelRef.current?.focus({ preventScroll: true });
    });
  }, [machine.state]);

  useEffect(() => {
    if (machine.state !== "RECOVERING") return;
    const timeout = window.setTimeout(
      () => dispatch({ type: "RECOVERY_COMPLETE" }),
      RECOVERY_STEP_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [machine.state]);

  useEffect(() => {
    if (machine.state !== "RECOVERED") return;
    const timeout = window.setTimeout(() => {
      dispatch({ type: "RETURN_BASELINE" });
      telemetry.reset();
      previousAssessmentRef.current = null;
      setTelemetrySource("genuine");
      restoreBaselinePosition();
      setAdaptationSource(null);
    }, RECOVERY_STEP_MS);
    return () => window.clearTimeout(timeout);
  }, [machine.state, restoreBaselinePosition, telemetry]);

  useEffect(() => {
    if (
      machine.state !== "ADAPTATION_REQUESTED" ||
      machine.activeRequestToken === null ||
      !machine.requestKind
    ) {
      return;
    }
    const token = machine.activeRequestToken;
    if (startedRequestTokensRef.current.has(token)) return;

    let request: AdaptRequest | null = null;
    if (machine.requestKind === "telemetry" && machine.assessment) {
      const source = adaptationSource;
      if (!source || source.episodeId !== machine.assessment.episodeId) {
        const timeout = window.setTimeout(() => {
          setRequestStatus(
            "That support offer expired after the source changed. No request was sent.",
          );
          dispatch({ type: "RESET" });
          restoreBaselinePosition();
        }, 0);
        return () => window.clearTimeout(timeout);
      }
      request = {
        authorization: "telemetry-consent",
        assessment: machine.assessment,
        sourceSectionId: source.sectionId,
        sourceSectionText: source.sourceText,
      };
    } else if (machine.requestKind === "manual" && manualRequestRef.current) {
      const manualRequest = manualRequestRef.current;
      request = {
        authorization: "learner-request",
        manualRequest,
        fallbackModes: manualRequest.requestedMode
          ? [manualRequest.requestedMode]
          : ["focus", "plain-language"],
      };
    }
    if (!request) return;
    startedRequestTokensRef.current.add(token);

    const controller = new AbortController();
    requestControllersRef.current.set(token, controller);
    setRequestStatus("Building a focused learning view…");

    void (async () => {
      try {
        const response = await fetch("/api/adapt", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(`Adaptation failed (${response.status})`);
        const body: unknown = await response.json();
        const parsedBody =
          typeof body === "object" && body !== null
            ? (body as { plan?: unknown; fallback?: unknown })
            : {};
        const parsedPlan = adaptationPlanSchema.safeParse(parsedBody.plan);
        if (!parsedPlan.success) throw new Error("Invalid adaptation plan");
        if (requestControllersRef.current.get(token) !== controller) return;

        setRequestStatus(
          parsedBody.fallback === true
            ? "The assistant was unavailable, so a complete safe fallback is shown."
            : "The focused learning view is ready.",
        );
        if (parsedBody.fallback === true) {
          dispatch({
            type: "REQUEST_FAILED",
            requestToken: token,
            fallbackPlan: parsedPlan.data,
          });
        } else {
          dispatch({
            type: "REQUEST_SUCCEEDED",
            requestToken: token,
            plan: parsedPlan.data,
          });
        }
      } catch (error) {
        if (
          isAbortError(error) ||
          requestControllersRef.current.get(token) !== controller
        ) {
          return;
        }
        setRequestStatus(
          "The assistant is unavailable, so a complete safe fallback is shown.",
        );
        dispatch({
          type: "REQUEST_FAILED",
          requestToken: token,
          fallbackPlan: buildFallbackAdaptationPlan(request),
        });
      } finally {
        requestControllersRef.current.delete(token);
      }
    })();
  }, [
    machine.activeRequestToken,
    adaptationSource,
    machine.assessment,
    machine.requestKind,
    machine.state,
    restoreBaselinePosition,
  ]);

  useEffect(
    () => () => {
      requestControllersRef.current.forEach((controller) => controller.abort());
    },
    [],
  );

  useEffect(() => {
    if (
      demoStatus !== "arming" ||
      telemetrySource !== "demo" ||
      telemetry.episodeId === demoPreviousEpisodeRef.current
    ) {
      return;
    }
    telemetry.recordSelectionRepeat();
    telemetry.recordSelectionRepeat();
    telemetry.recordQuizIncorrect();
    telemetry.recordQuizIncorrect();
    telemetry.recordGlossaryHoverStart();
    const timeout = window.setTimeout(() => {
      telemetry.recordGlossaryHoverEnd();
      setDemoStatus("idle");
    }, DEMO_JARGON_DWELL_MS);
    return () => window.clearTimeout(timeout);
  }, [demoStatus, telemetry, telemetry.episodeId, telemetrySource]);

  function triggerDemo() {
    if (
      machine.state !== "OBSERVING" ||
      demoStatus !== "idle" ||
      telemetry.status === "paused"
    ) {
      return;
    }
    demoPreviousEpisodeRef.current = telemetry.episodeId;
    setDemoStatus("arming");
    setTelemetrySource("demo");
    if (telemetrySource === "demo") telemetry.reset();
  }

  function changeConsentMode(nextMode: AssistanceConsentMode) {
    setConsentMode(nextMode);
    const pendingMode =
      machine.state === "AUTOMATIC_ADAPTATION_NOTICE"
        ? "automatic"
        : machine.state === "ADAPTATION_OFFERED"
          ? "offer"
          : null;
    if (pendingMode === null || nextMode === pendingMode) return;
    if (nextMode === "manual-only") {
      if (telemetrySource === "demo") {
        setDemoStatus("idle");
        telemetry.reset();
        previousAssessmentRef.current = null;
        setLatestAssessment(null);
        setTelemetrySource("genuine");
      }
      setAdaptationSource(null);
    }
    dispatch({ type: "ROUTE_ASSESSMENT", consentMode: nextMode });
  }

  function declineAdaptation() {
    if (machine.assessment) {
      setProactiveGate((gate) =>
        recordProactiveDecline(gate, machine.assessment!.episodeId, Date.now()),
      );
    }
    if (telemetrySource === "demo") {
      setDemoStatus("idle");
      telemetry.reset();
      previousAssessmentRef.current = null;
      setLatestAssessment(null);
      setTelemetrySource("genuine");
      setAdaptationSource(null);
    }
    dispatch({ type: "DECLINE_ADAPTATION" });
    restoreBaselinePosition();
  }

  function requestManualHelp(request: ManualHelpRequest) {
    preserveBaselineContext();
    preserveSourceContext(
      request.sectionId,
      request.activeSectionAnchor,
      null,
      request.sourceSectionText,
    );
    manualRequestRef.current = request;
    dispatch({ type: "MANUAL_HELP_REQUESTED" });
  }

  function resetWorkspace() {
    requestControllersRef.current.forEach((controller) => controller.abort());
    requestControllersRef.current.clear();
    manualRequestRef.current = null;
    previousAssessmentRef.current = null;
    setLatestAssessment(null);
    setRequestStatus("");
    setDemoStatus("idle");
    setTelemetrySource("genuine");
    telemetry.reset();
    dispatch({ type: "RESET" });
    restoreBaselinePosition();
    setAdaptationSource(null);
  }

  function dismissAdaptation() {
    dispatch({ type: "DISMISS_ADAPTATION" });
    telemetry.reset();
    previousAssessmentRef.current = null;
    setTelemetrySource("genuine");
    restoreBaselinePosition();
    setAdaptationSource(null);
  }

  return (
    <div
      className={`adaptive-workspace${preparingAdaptation ? " is-preparing-adaptation" : ""}`}
    >
      <aside className="demo-console" aria-label="Hackathon demo controls">
        <div className="demo-console-copy">
          <p className="adaptive-eyebrow">
            Reference implementation · Technical reading
          </p>
          <strong>Watch one learning interface reshape itself</strong>
          <span>
            Run the labeled simulation, or answer the knowledge check
            incorrectly twice for a genuine trigger. Only interaction summaries
            are evaluated; no diagnosis is made.
          </span>
          <FrictionDecisionTrace assessment={latestAssessment} />
        </div>
        <div className="demo-console-actions">
          <p>
            Current behavior:{" "}
            <strong>{CONSENT_MODE_LABELS[consentMode]}</strong>
          </p>
          {!adapted && (
            <a href="#region-learning-support">Change assistance behavior</a>
          )}
          <a href="#region-knowledge-check">Try the genuine quiz trigger</a>
          <button
            ref={demoTriggerRef}
            type="button"
            className="demo-trigger"
            aria-label="Run the 5-second adaptive demo: simulate reading friction"
            disabled={
              machine.state !== "OBSERVING" ||
              demoStatus !== "idle" ||
              telemetry.status === "paused"
            }
            onClick={triggerDemo}
          >
            {demoStatus === "idle"
              ? "Run the 5-second adaptive demo"
              : "Evaluating privacy-safe evidence…"}
          </button>
        </div>
      </aside>

      {telemetry.status === "paused" && !adapted && (
        <div className="telemetry-paused-banner" role="status">
          <span>
            Reading telemetry is paused. Manual help remains available.
          </span>
          <button type="button" onClick={telemetry.resume}>
            Resume telemetry
          </button>
        </div>
      )}

      {(machine.state === "ADAPTATION_OFFERED" ||
        machine.state === "AUTOMATIC_ADAPTATION_NOTICE") && (
        <div className="workspace-transition-panel" role="status">
          <AdaptationNotice
            reason={reasonSummary(machine.assessment)}
            eyebrow={
              machine.state === "AUTOMATIC_ADAPTATION_NOTICE"
                ? "Your automatic preference is active"
                : undefined
            }
            title={
              machine.state === "AUTOMATIC_ADAPTATION_NOTICE"
                ? "Preparing a clearer view"
                : undefined
            }
            primaryLabel={
              machine.state === "AUTOMATIC_ADAPTATION_NOTICE"
                ? "Continue now"
                : undefined
            }
            onAdapt={() => {
              dispatch({
                type:
                  machine.state === "AUTOMATIC_ADAPTATION_NOTICE"
                    ? "CONTINUE_AUTOMATIC"
                    : "ACCEPT_ADAPTATION",
              });
            }}
            onStay={declineAdaptation}
          />
        </div>
      )}

      {machine.state === "ADAPTATION_REQUESTED" && (
        <main
          className="workspace-loading"
          aria-labelledby="workspace-loading-title"
        >
          <span className="workspace-loader" aria-hidden="true" />
          <div className="workspace-loading-copy">
            <p className="adaptive-eyebrow">Polymorph is adapting</p>
            <div role="status" aria-live="polite">
              <h2 id="workspace-loading-title">
                Creating a quieter path through this section
              </h2>
              <p>The original lesson and your position remain preserved.</p>
            </div>
            <button
              ref={loadingCancelRef}
              type="button"
              onClick={resetWorkspace}
            >
              Cancel and return to the lesson
            </button>
          </div>
        </main>
      )}

      {adapted && machine.plan && (
        <main className="workspace-adapted-shell">
          {machine.state === "RECOVERING" && (
            <p className="recovery-status" role="status">
              Nice work — restoring the full lesson…
            </p>
          )}
          {machine.state === "RECOVERED" && (
            <p className="recovery-status recovered" role="status">
              Momentum restored. Returning to your original place.
            </p>
          )}
          <AdaptiveExperience
            plan={machine.plan}
            sourceTitle={adaptationSource?.title ?? currentSection.title}
            sourceText={adaptationSource?.sourceText ?? sourceText}
            telemetryPaused={telemetry.status === "paused"}
            focusReturnRef={focusReturnRef}
            onDismiss={dismissAdaptation}
            onReset={resetWorkspace}
            onTelemetryPauseChange={(paused) =>
              paused ? telemetry.pause() : telemetry.resume()
            }
            onKnowledgeConfirmed={() => dispatch({ type: "RECOVERY_DETECTED" })}
          />
        </main>
      )}

      <div
        ref={baselineRef}
        className="baseline-workspace"
        tabIndex={-1}
        hidden={adapted || machine.state === "ADAPTATION_REQUESTED"}
      >
        <BaselineReader
          onActiveSectionChange={setActiveSection}
          onTextInteraction={(interaction) => {
            if (interaction.type === "reread") {
              telemetry.recordSelectionRepeat();
            }
          }}
          onGlossaryInteraction={(interaction) => {
            if (interaction.action === "open") {
              telemetry.recordGlossaryHoverStart();
            } else {
              telemetry.recordGlossaryHoverEnd();
            }
          }}
          onQuizAttempt={(attempt) => {
            if (!attempt.correct) telemetry.recordQuizIncorrect();
          }}
          onAssistancePreferenceChange={changeConsentMode}
          onManualHelp={requestManualHelp}
        />
      </div>

      <div className="sr-status" role="status" aria-live="polite">
        {requestStatus}
      </div>

      {process.env.NODE_ENV !== "production" && (
        <details className="development-inspector">
          <summary>Development inspector</summary>
          <dl>
            <div>
              <dt>State</dt>
              <dd>{machine.state}</dd>
            </div>
            <div>
              <dt>Evidence source</dt>
              <dd>{telemetrySource}</dd>
            </div>
            <div>
              <dt>Score</dt>
              <dd>{latestAssessment?.score ?? 0}</dd>
            </div>
            <div>
              <dt>Reason codes</dt>
              <dd>{latestAssessment?.reasonCodes.join(", ") || "none"}</dd>
            </div>
            <div>
              <dt>Selected modes</dt>
              <dd>
                {machine.plan
                  ? [
                      machine.plan.primaryMode,
                      ...machine.plan.supportingModes,
                    ].join(", ")
                  : "none"}
              </dd>
            </div>
          </dl>
        </details>
      )}
    </div>
  );
}
