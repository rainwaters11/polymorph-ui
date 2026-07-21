"use client";

import { useState } from "react";
import type { AdaptiveModeComponentProps } from "@/lib/adaptation/registry";

export function VisualStepper({ plan }: AdaptiveModeComponentProps) {
  const steps =
    plan.instructionalSupport.steps.length > 0
      ? plan.instructionalSupport.steps
      : [plan.instructionalSupport.explanation];
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section
      className="adaptive-panel visual-stepper"
      data-adaptive-mode="step-by-step"
      aria-labelledby="visual-stepper-title"
    >
      <div className="mode-chip">
        <span aria-hidden="true">1—2</span>
        Step-by-step
      </div>
      <div className="adaptive-section-heading">
        <p>One stage at a time</p>
        <h2 id="visual-stepper-title">Follow the request safely</h2>
      </div>

      <div className="stepper-progress" aria-label="Step progress">
        {steps.map((_, index) => (
          <button
            key={index}
            type="button"
            className={index === activeStep ? "is-current" : ""}
            aria-label={`Show step ${index + 1} of ${steps.length}`}
            aria-current={index === activeStep ? "step" : undefined}
            onClick={() => setActiveStep(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <div className="stepper-stage" aria-live="polite">
        <p>
          Step {activeStep + 1} of {steps.length}
        </p>
        <strong>{steps[activeStep]}</strong>
      </div>

      <div className="stepper-actions">
        <button
          type="button"
          disabled={activeStep === 0}
          onClick={() => setActiveStep((step) => Math.max(0, step - 1))}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={activeStep === steps.length - 1}
          onClick={() =>
            setActiveStep((step) => Math.min(steps.length - 1, step + 1))
          }
        >
          Next step
        </button>
      </div>
    </section>
  );
}
