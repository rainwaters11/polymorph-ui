"use client";

import { useEffect, useRef, useState } from "react";
import { AdaptiveRenderer } from "@/components/adaptive/AdaptiveRenderer";
import { BaselineReader } from "@/components/reader/BaselineReader";
import { rateLimitingLesson } from "@/content/rate-limiting-lesson";
import { createMockAdaptationPlan } from "@/content/mock-adaptation-plans";
import type { AdaptationPlan } from "@/lib/contracts/adaptation";
import type { ManualHelpRequest } from "@/lib/contracts/assistance";
import type { DocumentSection } from "@/lib/contracts/document";

type ActiveAdaptation = {
  plan: AdaptationPlan;
  sourceSection: DocumentSection;
  scrollTop: number;
};

type RestoreTarget = {
  anchor: string;
  scrollTop: number;
};

export function AdaptiveReaderExperience() {
  const [adaptation, setAdaptation] = useState<ActiveAdaptation>();
  const [telemetryPaused, setTelemetryPaused] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const restoreTarget = useRef<RestoreTarget | undefined>(undefined);

  function handleManualHelp(request: ManualHelpRequest) {
    const sourceSection = rateLimitingLesson.sections.find(
      (section) => section.id === request.sectionId,
    );
    if (!sourceSection) {
      setStatusMessage("The requested source section could not be found.");
      return;
    }

    setAdaptation({
      plan: createMockAdaptationPlan(request, sourceSection),
      sourceSection,
      scrollTop: window.scrollY,
    });
    setStatusMessage(
      `Adapted view opened for ${sourceSection.title}. Keyboard focus moved to the adapted heading.`,
    );
  }

  function restoreStandardView(message: string) {
    if (!adaptation) return;
    restoreTarget.current = {
      anchor: adaptation.sourceSection.anchor,
      scrollTop: adaptation.scrollTop,
    };
    setAdaptation(undefined);
    setStatusMessage(message);
  }

  useEffect(() => {
    if (adaptation || !restoreTarget.current) return;
    const target = restoreTarget.current;
    restoreTarget.current = undefined;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: target.scrollTop, behavior: "auto" });
      document.getElementById(target.anchor)?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [adaptation]);

  return (
    <>
      {adaptation ? (
        <AdaptiveRenderer
          plan={adaptation.plan}
          sourceSection={adaptation.sourceSection}
          preservedScrollTop={adaptation.scrollTop}
          telemetryPaused={telemetryPaused}
          onTelemetryToggle={() => {
            setTelemetryPaused((paused) => !paused);
            setStatusMessage(
              telemetryPaused
                ? "Reading-friction signals resumed."
                : "Reading-friction signals paused. Manual help remains available.",
            );
          }}
          onDismiss={() =>
            restoreStandardView(
              "Adaptation dismissed. The original section and reading position were restored.",
            )
          }
          onReset={() =>
            restoreStandardView(
              "Standard view restored at the original section.",
            )
          }
        />
      ) : (
        <BaselineReader onManualHelp={handleManualHelp} />
      )}
      <div className="sr-status" role="status" aria-live="polite">
        {statusMessage}
      </div>
    </>
  );
}
