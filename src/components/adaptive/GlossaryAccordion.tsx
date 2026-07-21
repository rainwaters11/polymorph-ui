import type { AdaptationPlan } from "@/lib/contracts/adaptation";

type GlossaryAccordionProps = {
  items: AdaptationPlan["instructionalSupport"]["glossary"];
};

export function GlossaryAccordion({ items }: GlossaryAccordionProps) {
  if (items.length === 0) return null;

  return (
    <section
      className="adaptive-glossary"
      aria-labelledby="adaptive-glossary-title"
    >
      <div className="adaptive-section-heading">
        <p>Useful language</p>
        <h3 id="adaptive-glossary-title">Open a term when you need it</h3>
      </div>
      <div className="adaptive-glossary-list">
        {items.map((item) => (
          <details key={item.term}>
            <summary>{item.term}</summary>
            <p>{item.definition}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
