"use client";

import { useId, useState } from "react";
import type { AdaptationPlan } from "@/lib/contracts/adaptation";
import type { AdaptiveModeComponentProps } from "@/lib/adaptation/registry";

type AdaptiveQuizProps =
  | AdaptiveModeComponentProps
  | { knowledgeCheck?: AdaptationPlan["knowledgeCheck"] };

export function AdaptiveQuiz(props: AdaptiveQuizProps) {
  const groupId = useId();
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [submitted, setSubmitted] = useState(false);
  const check = "plan" in props ? props.plan.knowledgeCheck : props.knowledgeCheck;
  const explanation = "plan" in props ? props.plan.instructionalSupport.explanation : undefined;

  if (!check) {
    return (
      <section className="adaptive-panel adaptive-quiz" data-adaptive-mode="check-understanding" role="status">
        <div className="mode-chip"><span aria-hidden="true">?</span>Check understanding</div>
        <h2>{explanation ? "Keep the key idea in view" : "No practice question was needed for this view"}</h2>
        {explanation && <p>{explanation}</p>}
      </section>
    );
  }

  const correct = selectedIndex === check.correctIndex;
  return (
    <section className="adaptive-panel adaptive-quiz" data-adaptive-mode="check-understanding" aria-labelledby={`${groupId}-title`}>
      <div className="mode-chip"><span aria-hidden="true">?</span>Check understanding</div>
      <p className="adaptive-overline">A quick confidence check</p>
      <h2 id={`${groupId}-title`}>Try the idea once</h2>
      <fieldset>
        <legend>{check.question}</legend>
        <div className="adaptive-quiz-options">
          {check.options.map((option, index) => (
            <label key={option}>
              <input type="radio" name={groupId} checked={selectedIndex === index} onChange={() => { setSelectedIndex(index); setSubmitted(false); }} />
              <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
              <strong>{option}</strong>
            </label>
          ))}
        </div>
      </fieldset>
      <button className="adaptive-primary-action" type="button" disabled={selectedIndex === undefined} onClick={() => setSubmitted(true)}>Check my answer</button>
      <div className={submitted ? `adaptive-feedback ${correct ? "correct" : "retry"}` : "adaptive-feedback"} role="status" aria-live="polite">
        {submitted && <><strong>{correct ? "That's it." : "Try once more."}</strong><p>{check.explanation}</p></>}
      </div>
    </section>
  );
}
