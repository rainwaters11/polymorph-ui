import type { AdaptationPlan } from "@/lib/contracts/adaptation";
import { TextToSpeechControl } from "@/components/adaptive/TextToSpeechControl";

type InstructionalSupport = AdaptationPlan["instructionalSupport"];

export function StandardReader({
  title,
  sourceText,
}: {
  title: string;
  sourceText: string;
}) {
  return (
    <article
      className="adaptive-card standard-reader"
      aria-label="Original text"
    >
      <p className="adaptive-eyebrow">Original lesson</p>
      <h3>{title}</h3>
      <p className="original-source-text">{sourceText}</p>
    </article>
  );
}

export function FocusReader({
  sourceSectionId,
  title,
  sourceText,
}: {
  sourceSectionId: string;
  title: string;
  sourceText: string;
}) {
  return (
    <article
      className="adaptive-card focus-reader"
      data-source-section={sourceSectionId}
      aria-labelledby="focused-source-heading"
    >
      <p className="adaptive-eyebrow">Focused section</p>
      <h3 id="focused-source-heading">{title}</h3>
      <p className="focus-source-text">{sourceText}</p>
    </article>
  );
}

export function GlossaryAccordion({
  glossary,
}: {
  glossary: InstructionalSupport["glossary"];
}) {
  if (glossary.length === 0) return null;

  return (
    <div className="adaptive-glossary" aria-label="Terms in this explanation">
      {glossary.map((item) => (
        <details key={item.term}>
          <summary>{item.term}</summary>
          <p>{item.definition}</p>
        </details>
      ))}
    </div>
  );
}

export function PlainLanguagePanel({
  support,
  showListenControl = false,
}: {
  support: InstructionalSupport;
  showListenControl?: boolean;
}) {
  return (
    <section
      className="adaptive-card plain-language-panel"
      aria-labelledby="plain-language-heading"
    >
      <div className="plain-language-heading-row">
        <div>
          <p className="adaptive-eyebrow">Plain-language explanation</p>
          <h3 id="plain-language-heading">{support.heading}</h3>
        </div>
        {showListenControl && (
          <TextToSpeechControl
            text={`${support.heading}. ${support.explanation}`}
          />
        )}
      </div>
      <p className="adaptive-lead">{support.explanation}</p>
      {support.analogy && (
        <aside className="adaptive-analogy" aria-label="Helpful analogy">
          <strong>Think of it this way</strong>
          <p>{support.analogy}</p>
        </aside>
      )}
      <GlossaryAccordion glossary={support.glossary} />
    </section>
  );
}

export function VisualStepper({ steps }: { steps: string[] }) {
  if (steps.length === 0) {
    return (
      <section className="adaptive-card visual-stepper" role="status">
        <p className="adaptive-eyebrow">Step-by-step</p>
        <p>
          The focused explanation is ready. No additional steps were needed.
        </p>
      </section>
    );
  }

  return (
    <section
      className="adaptive-card visual-stepper"
      aria-labelledby="stepper-heading"
    >
      <p className="adaptive-eyebrow">One stage at a time</p>
      <h3 id="stepper-heading">Follow the request safely</h3>
      <ol>
        {steps.map((step, index) => (
          <li key={`${index}-${step}`}>
            <span aria-hidden="true">{index + 1}</span>
            <p>{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function AdaptationReason({
  transparency,
}: {
  transparency: AdaptationPlan["transparency"];
}) {
  return (
    <aside
      className="adaptation-reason"
      aria-labelledby="adaptation-reason-title"
    >
      <span className="reason-icon" aria-hidden="true">
        i
      </span>
      <div>
        <h3 id="adaptation-reason-title">Why this view changed</h3>
        <p>{transparency.reasonSummary}</p>
      </div>
    </aside>
  );
}
