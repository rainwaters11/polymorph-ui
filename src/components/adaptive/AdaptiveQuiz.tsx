"use client";

import { useId, useState } from "react";
import type { AdaptationPlan } from "@/lib/contracts/adaptation";

export function AdaptiveQuiz({
  knowledgeCheck,
  onCorrect,
  onIncorrect,
  showExplanationOnIncorrect = true,
  incorrectMessage,
}: {
  knowledgeCheck?: AdaptationPlan["knowledgeCheck"];
  onCorrect?: () => void;
  onIncorrect?: () => void;
  showExplanationOnIncorrect?: boolean;
  incorrectMessage?: string;
}) {
  const groupName = useId();
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [submitted, setSubmitted] = useState(false);

  if (!knowledgeCheck) {
    return (
      <section className="adaptive-card adaptive-quiz" role="status">
        <p className="adaptive-eyebrow">Check understanding</p>
        <h3>No practice question was needed for this view</h3>
      </section>
    );
  }

  const isCorrect = selectedIndex === knowledgeCheck.correctIndex;

  return (
    <section
      className="adaptive-card adaptive-quiz"
      aria-labelledby="adaptive-quiz-title"
    >
      <p className="adaptive-eyebrow">Check understanding</p>
      <h3 id="adaptive-quiz-title">Try one quick question</h3>
      <fieldset>
        <legend>{knowledgeCheck.question}</legend>
        <div className="adaptive-quiz-options">
          {knowledgeCheck.options.map((option, index) => (
            <label key={option}>
              <input
                type="radio"
                name={groupName}
                checked={selectedIndex === index}
                onChange={() => {
                  setSelectedIndex(index);
                  setSubmitted(false);
                }}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button
        className="adaptive-primary-action"
        type="button"
        disabled={selectedIndex === undefined}
        onClick={() => {
          setSubmitted(true);
          if (isCorrect) onCorrect?.();
          else onIncorrect?.();
        }}
      >
        Check my answer
      </button>
      {submitted && (
        <p
          className={`adaptive-quiz-feedback ${isCorrect ? "correct" : "incorrect"}`}
          role="status"
        >
          <strong>{isCorrect ? "That’s it." : "Try once more."}</strong>{" "}
          {isCorrect || showExplanationOnIncorrect
            ? knowledgeCheck.explanation
            : (incorrectMessage ??
              "Use the support in this view, then try again when you’re ready.")}
        </p>
      )}
    </section>
  );
}
