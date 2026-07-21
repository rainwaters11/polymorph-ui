import { GlossaryAccordion } from "@/components/adaptive/GlossaryAccordion";
import type { AdaptiveModeComponentProps } from "@/lib/adaptation/registry";

export function PlainLanguagePanel({
  plan,
  prominence,
}: AdaptiveModeComponentProps) {
  const supporting = prominence === "supporting";

  return (
    <section
      className="adaptive-panel plain-language-panel"
      data-adaptive-mode="plain-language"
    >
      <div className="mode-chip">
        <span aria-hidden="true">Aa</span>
        Plain language
      </div>
      <p className="adaptive-overline">The core idea</p>
      <h2>{plan.instructionalSupport.heading}</h2>
      <p className="plain-language-copy">
        {plan.instructionalSupport.explanation}
      </p>
      {!supporting && plan.instructionalSupport.analogy && (
        <aside className="adaptive-analogy" aria-label="A useful analogy">
          <span aria-hidden="true">↗</span>
          <div>
            <strong>A useful analogy</strong>
            <p>{plan.instructionalSupport.analogy}</p>
          </div>
        </aside>
      )}
      <GlossaryAccordion
        items={
          supporting
            ? plan.instructionalSupport.glossary.slice(0, 2)
            : plan.instructionalSupport.glossary
        }
      />
    </section>
  );
}
