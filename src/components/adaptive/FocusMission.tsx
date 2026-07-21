"use client";

import { useState } from "react";
import { ApprovedVisualMap } from "@/components/adaptive/AdaptiveDiagrams";
import { AdaptiveQuiz } from "@/components/adaptive/AdaptiveQuiz";
import {
  PlainLanguagePanel,
  VisualStepper,
} from "@/components/adaptive/AdaptiveModes";
import type { AdaptationPlan } from "@/lib/contracts/adaptation";

const SUPPORT_STAGES = ["Hint", "Visual", "Explanation"] as const;

type FocusMissionProps = {
  plan: AdaptationPlan;
  readingComfort: boolean;
  onReadingComfortChange: (enabled: boolean) => void;
  onKnowledgeConfirmed?: () => void;
};

function presentationChanges(plan: AdaptationPlan) {
  const changes: string[] = [];
  if (plan.presentation.hideSecondaryNavigation)
    changes.push("Secondary navigation hidden");
  if (plan.presentation.emphasizeCurrentSection)
    changes.push("One concept isolated");
  if (plan.presentation.increaseSpacing)
    changes.push("Reading space increased");
  changes.push("Original lesson preserved");
  return changes;
}

export function FocusMission({
  plan,
  readingComfort,
  onReadingComfortChange,
  onKnowledgeConfirmed,
}: FocusMissionProps) {
  const [supportLevel, setSupportLevel] = useState<0 | 1 | 2>(0);
  const [canRevealMore, setCanRevealMore] = useState(false);
  const support = plan.instructionalSupport;
  const hasPracticeCheck = Boolean(plan.knowledgeCheck);
  const firstHint =
    support.steps[0] ??
    "Return to the signal in this section, then identify the next action it supports.";

  function revealNextSupport() {
    setSupportLevel((current) =>
      current === 0 ? 1 : current === 1 ? 2 : current,
    );
    setCanRevealMore(false);
  }

  return (
    <div className="focus-mission">
      <aside className="focus-mission-change-summary">
        <div>
          <p className="adaptive-eyebrow">Focus mode engaged</p>
          <h3>The workspace quieted the noise</h3>
          <p>
            Polymorph isolated one learning goal and kept the learner in control
            of how much support appears.
          </p>
        </div>
        <div className="focus-mission-preferences">
          <ul aria-label="Changes made to this view">
            {presentationChanges(plan).map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
          <label className="reading-comfort-toggle">
            <span className="reading-comfort-copy">
              <strong>Reading comfort</strong>
              <small id="reading-comfort-description">
                Use sans-serif text, wider spacing, and softer contrast.
              </small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={readingComfort}
              aria-describedby="reading-comfort-description"
              onChange={(event) =>
                onReadingComfortChange(event.currentTarget.checked)
              }
            />
            <span className="reading-comfort-track" aria-hidden="true">
              <span />
            </span>
          </label>
        </div>
      </aside>

      {!hasPracticeCheck ? (
        <section className="focus-mission-safe-fallback">
          <p className="adaptive-eyebrow">One focused explanation</p>
          <PlainLanguagePanel support={support} showListenControl />
          <p className="focus-mission-fallback-note" role="status">
            The practice check is unavailable, so no answer or visual has been
            invented. The original lesson remains one click away.
          </p>
        </section>
      ) : (
        <div className="focus-mission-learning-loop">
          <ol className="focus-mission-progress" aria-label="Support progress">
            {SUPPORT_STAGES.map((stage, index) => (
              <li
                key={stage}
                className={
                  index === supportLevel
                    ? "is-current"
                    : index < supportLevel
                      ? "is-complete"
                      : undefined
                }
                aria-current={index === supportLevel ? "step" : undefined}
              >
                <span aria-hidden="true">{index + 1}</span>
                {stage}
              </li>
            ))}
          </ol>

          <section className="focus-mission-support" aria-live="polite">
            <div className="focus-mission-support-heading">
              <div>
                <p className="adaptive-eyebrow">
                  Support {supportLevel + 1} of 3
                </p>
                <h3>
                  {supportLevel === 0
                    ? "Start with one clue"
                    : supportLevel === 1
                      ? "See the sequence"
                      : "Connect the idea"}
                </h3>
              </div>
              <span>One goal</span>
            </div>

            {supportLevel === 0 && (
              <div className="focus-mission-hint">
                <span aria-hidden="true">1</span>
                <p>{firstHint}</p>
              </div>
            )}

            {supportLevel >= 1 &&
              (support.diagramType !== "none" ? (
                <ApprovedVisualMap diagramType={support.diagramType} />
              ) : support.steps.length > 0 ? (
                <VisualStepper steps={support.steps} />
              ) : (
                <p className="focus-mission-unavailable" role="status">
                  No source-grounded visual is available for this section.
                </p>
              ))}

            {supportLevel >= 2 && (
              <PlainLanguagePanel support={support} showListenControl />
            )}
          </section>

          <AdaptiveQuiz
            key={`focus-mission-quiz-${supportLevel}`}
            knowledgeCheck={plan.knowledgeCheck}
            onCorrect={onKnowledgeConfirmed}
            onIncorrect={() => setCanRevealMore(true)}
            showExplanationOnIncorrect={false}
            incorrectMessage="Not yet. Use the current clue, or choose another form of support when you’re ready."
          />

          {supportLevel < 2 && canRevealMore && (
            <div className="focus-mission-reveal">
              <div>
                <p className="adaptive-eyebrow">You choose the pace</p>
                <p>
                  The answer stays hidden. Reveal one more form of support, or
                  try the question again.
                </p>
              </div>
              <button
                type="button"
                className="adaptive-primary-action"
                onClick={revealNextSupport}
              >
                {supportLevel === 0
                  ? "Reveal visual cue"
                  : "Show short explanation"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
