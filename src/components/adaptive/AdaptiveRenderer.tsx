"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  PauseTelemetryControl,
  ResetViewButton,
  ShowOriginalControl,
} from "@/components/adaptive/AdaptationControls";
import { AdaptationReason } from "@/components/adaptive/AdaptationReason";
import { OriginalSourcePanel } from "@/components/adaptive/OriginalSourcePanel";
import { resolveAdaptationComposition } from "@/lib/adaptation/registry";
import type { DocumentSection } from "@/lib/contracts/document";

type AdaptiveRendererProps = {
  plan: unknown;
  sourceSection: DocumentSection;
  preservedScrollTop?: number;
  telemetryPaused: boolean;
  onTelemetryToggle: () => void;
  onDismiss: () => void;
  onReset: () => void;
};

function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => undefined;
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener?.("change", onChange);
      return () => query.removeEventListener?.("change", onChange);
    },
    () =>
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function AdaptiveRenderer({
  plan,
  sourceSection,
  preservedScrollTop = 0,
  telemetryPaused,
  onTelemetryToggle,
  onDismiss,
  onReset,
}: AdaptiveRendererProps) {
  const result = useMemo(
    () => resolveAdaptationComposition(plan, sourceSection),
    [plan, sourceSection],
  );
  const [showOriginal, setShowOriginal] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (result.status !== "ready") return;
    window.scrollTo({ top: preservedScrollTop, behavior: "auto" });
    headingRef.current?.focus({ preventScroll: true });
  }, [preservedScrollTop, result]);

  if (result.status === "invalid") {
    return (
      <main className="adaptive-safe-fallback">
        <section role="status" aria-live="polite">
          <p className="adaptive-overline">Standard view preserved</p>
          <h1>That adaptation could not be displayed safely.</h1>
          <p>
            The plan did not match the approved component contract. No generated
            content was rendered, and the original source remains available.
          </p>
          <nav
            className="adaptive-control-bar"
            aria-label="Adaptation fallback controls"
          >
            <PauseTelemetryControl
              paused={telemetryPaused}
              onToggle={onTelemetryToggle}
            />
            <ResetViewButton onReset={onReset} />
            <button type="button" onClick={onDismiss}>
              Dismiss adaptation
            </button>
          </nav>
        </section>
        <OriginalSourcePanel section={sourceSection} />
      </main>
    );
  }

  const { composition } = result;
  const { plan: validatedPlan, primary, supporting } = composition;
  const PrimaryComponent = primary.Component;
  const layoutClasses = [
    "adaptive-workspace",
    validatedPlan.presentation.density === "reduced" ? "density-reduced" : "",
    validatedPlan.presentation.increaseSpacing ? "spacing-increased" : "",
    reducedMotion ? "motion-reduced" : "motion-standard",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      id={sourceSection.anchor}
      className={layoutClasses}
      data-document-section={sourceSection.id}
      data-section-anchor={sourceSection.anchor}
      data-motion={reducedMotion ? "immediate" : "animated"}
    >
      <a className="skip-link" href="#adaptive-main-content">
        Skip to adapted lesson
      </a>
      <header className="adaptive-header">
        <a
          className="adaptive-brand"
          href="#adaptive-main-content"
          aria-label="Polymorph UI adapted lesson"
        >
          <span aria-hidden="true">P</span>
          <strong>Polymorph UI</strong>
        </a>
        <div className="adaptive-view-status">
          <span aria-hidden="true">✦</span>
          Adapted view
        </div>
        <button
          type="button"
          className="dismiss-adaptation"
          onClick={onDismiss}
        >
          Dismiss adaptation
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <main id="adaptive-main-content" className="adaptive-main">
        <section
          className="adaptive-hero"
          aria-labelledby="adaptive-view-title"
        >
          <div>
            <p className="adaptive-kicker">Focused learning path</p>
            <h1 id="adaptive-view-title" ref={headingRef} tabIndex={-1}>
              {validatedPlan.instructionalSupport.heading}
            </h1>
          </div>
          <AdaptationReason transparency={validatedPlan.transparency} />
        </section>

        <nav
          className="adaptive-control-bar"
          aria-label="Adapted view controls"
        >
          <ShowOriginalControl
            showing={showOriginal}
            onToggle={() => setShowOriginal((showing) => !showing)}
          />
          <PauseTelemetryControl
            paused={telemetryPaused}
            onToggle={onTelemetryToggle}
          />
          <ResetViewButton onReset={onReset} />
        </nav>

        <div className="adaptive-mode-composition">
          <div
            className="primary-mode-region"
            aria-label={`${primary.mode} primary adaptation`}
          >
            <PrimaryComponent
              plan={validatedPlan}
              sourceSection={sourceSection}
              prominence="primary"
            />
          </div>
          {supporting.length > 0 && (
            <div
              className="supporting-mode-region"
              aria-label="Supporting adaptations"
            >
              {supporting.map(({ mode, Component }) => (
                <Component
                  key={mode}
                  plan={validatedPlan}
                  sourceSection={sourceSection}
                  prominence="supporting"
                />
              ))}
            </div>
          )}
        </div>

        {showOriginal && <OriginalSourcePanel section={sourceSection} />}

        <footer className="adaptive-footer">
          <p>
            The source section is unchanged. You can return to the standard
            lesson at any time.
          </p>
          <button type="button" onClick={onDismiss}>
            Return to standard lesson
          </button>
        </footer>
      </main>
    </div>
  );
}
