import type {
  GlossaryInteractionCallback,
  GlossaryTerm as GlossaryTermContract,
} from "@/lib/contracts/document";
import { GlossaryTerm } from "@/components/reader/GlossaryTerm";

type GlossaryPanelProps = {
  terms: GlossaryTermContract[];
  onInteraction?: GlossaryInteractionCallback;
};

export function GlossaryPanel({ terms, onInteraction }: GlossaryPanelProps) {
  return (
    <section
      id="region-glossary"
      className="glossary-panel"
      aria-labelledby="glossary-title"
    >
      <div className="panel-heading">
        <p>Reference</p>
        <h2 id="glossary-title">Small glossary</h2>
        <span>{terms.length} terms</span>
      </div>
      <div className="glossary-grid">
        {terms.map((term) => (
          <GlossaryTerm
            key={term.id}
            term={term}
            onInteraction={onInteraction}
          />
        ))}
      </div>
    </section>
  );
}
