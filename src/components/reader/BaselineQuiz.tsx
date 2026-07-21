"use client";

import { useState } from "react";
import type {
  QuizAttemptCallback,
  QuizQuestion,
} from "@/lib/contracts/document";

type BaselineQuizProps = {
  question: QuizQuestion;
  onAttempt?: QuizAttemptCallback;
};

export function BaselineQuiz({ question, onAttempt }: BaselineQuizProps) {
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);

  function checkAnswer() {
    if (!selectedOptionId) return;
    const correct = selectedOptionId === question.correctOptionId;
    setResult(correct ? "correct" : "incorrect");
    onAttempt?.({
      questionId: question.id,
      selectedOptionId,
      correct,
      attemptedAt: new Date().toISOString(),
    });
  }

  return (
    <section
      id="region-knowledge-check"
      className="knowledge-check"
      aria-labelledby="knowledge-check-title"
    >
      <div className="quiz-intro">
        <span aria-hidden="true">?</span>
        <div>
          <p>Knowledge check</p>
          <h2 id="knowledge-check-title">Check your understanding</h2>
        </div>
      </div>

      <fieldset>
        <legend>{question.prompt}</legend>
        <div className="quiz-options">
          {question.options.map((option, index) => (
            <label key={option.id}>
              <input
                type="radio"
                name={question.id}
                value={option.id}
                checked={selectedOptionId === option.id}
                onChange={() => {
                  setSelectedOptionId(option.id);
                  setResult(null);
                }}
              />
              <span className="option-letter" aria-hidden="true">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="quiz-actions">
        <button
          type="button"
          disabled={!selectedOptionId}
          onClick={checkAnswer}
        >
          Check answer
        </button>
        <p
          className={result ? `quiz-feedback ${result}` : "quiz-feedback"}
          role="status"
          aria-live="polite"
        >
          {result === "correct" && question.correctFeedback}
          {result === "incorrect" && question.incorrectFeedback}
        </p>
      </div>
    </section>
  );
}
