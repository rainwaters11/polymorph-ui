"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import {
  resolveAdaptationComposition,
  type ApprovedAdaptiveComponent,
} from "@/lib/adaptation/componentRegistry";
import { AdaptiveQuiz } from "@/components/adaptive/AdaptiveQuiz";
import {
  DismissAdaptationControl,
  PauseTelemetryControl,
  ResetViewButton,
  ShowOriginalControl,
} from "@/components/adaptive/AdaptiveControls";
import { ApprovedVisualMap } from "@/components/adaptive/AdaptiveDiagrams";
import {
  AdaptationReason,
  FocusReader,
  PlainLanguagePanel,
  StandardReader,
  VisualStepper,
} from "@/components/adaptive/AdaptiveModes";

export type AdaptiveExperienceProps = {
  plan: unknown;
  sourceTitle: string;
  sourceText: string;
  telemetryPaused?: boolean;
  focusReturnRef?: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  onReset: () => void;
  onTelemetryPauseChange: (paused: boolean) => void;
  onShowOriginalChange?: (showing: boolean) => void;
};

export function AdaptiveExperience({
  plan,
  sourceTitle,
  sourceText,
  telemetryPaused = false,
  focusReturnRef,
  onDismiss,
  onReset,
  onTelemetryPauseChange,
  onShowOriginalChange,
}: AdaptiveExperienceProps) {
  const composition = resolveAdaptationComposition(plan);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    previousFocusRef.current =
      focusReturnRef?.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    headingRef.current?.focus({ preventScroll: true });

    return () => {
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [focusReturnRef]);

  if (!composition.valid) {
    return (
      <div className="adaptive-experience invalid-adaptation" role="status">
        <p className="adaptive-status-message">
          This adaptation could not be validated. The original lesson is still
          available.
        </p>
        <StandardReader title={sourceTitle} sourceText={sourceText} />
      </div>
    );
  }

  const { plan: validPlan } = composition;

  function renderComponent(component: ApprovedAdaptiveComponent) {
    if (component === "FocusReader") {
      return (
        <FocusReader
          key={component}
          sourceSectionId={validPlan.sourceSectionId}
          title={sourceTitle}
          sourceText={sourceText}
        />
      );
    }
    if (component === "PlainLanguagePanel") {
      return (
        <PlainLanguagePanel
          key={component}
          support={validPlan.instructionalSupport}
        />
      );
    }
    if (component === "ApprovedVisualMap") {
      return (
        <ApprovedVisualMap
          key={component}
          diagramType={validPlan.instructionalSupport.diagramType}
        />
      );
    }
    if (component === "VisualStepper") {
      return (
        <VisualStepper
          key={component}
          steps={validPlan.instructionalSupport.steps}
        />
      );
    }
    if (component === "AdaptiveQuiz") {
      return (
        <AdaptiveQuiz
          key={component}
          knowledgeCheck={validPlan.knowledgeCheck}
        />
      );
    }
    return (
      <StandardReader
        key={component}
        title={sourceTitle}
        sourceText={sourceText}
      />
    );
  }

  function toggleOriginal() {
    const next = !showOriginal;
    setShowOriginal(next);
    onShowOriginalChange?.(next);
  }

  return (
    <section
      className={`adaptive-experience density-${validPlan.presentation.density}`}
      data-primary-mode={validPlan.primaryMode}
      data-source-section={validPlan.sourceSectionId}
      aria-labelledby="adaptive-experience-heading"
    >
      <header className="adaptive-experience-header">
        <div>
          <p className="adaptive-eyebrow">Adapted learning view</p>
          <h2 id="adaptive-experience-heading" ref={headingRef} tabIndex={-1}>
            {validPlan.instructionalSupport.heading}
          </h2>
        </div>
        <span className="adaptive-mode-badge">
          {validPlan.primaryMode.replaceAll("-", " ")}
        </span>
      </header>

      <AdaptationReason transparency={validPlan.transparency} />

      <div className="adaptive-component-stack">
        {composition.components.map(renderComponent)}
      </div>

      {showOriginal && (
        <StandardReader title={sourceTitle} sourceText={sourceText} />
      )}

      <footer className="adaptive-control-bar" aria-label="Adaptation controls">
        <ShowOriginalControl
          showingOriginal={showOriginal}
          onClick={toggleOriginal}
        />
        <PauseTelemetryControl
          paused={telemetryPaused}
          onClick={() => onTelemetryPauseChange(!telemetryPaused)}
        />
        <ResetViewButton onClick={onReset} />
        <DismissAdaptationControl onClick={onDismiss} />
      </footer>
    </section>
  );
}
