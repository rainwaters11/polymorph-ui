import type {
  GlossaryInteractionCallback,
  GlossaryTerm as GlossaryTermContract,
} from "@/lib/contracts/document";

type GlossaryTermProps = {
  term: GlossaryTermContract;
  onInteraction?: GlossaryInteractionCallback;
};

export function GlossaryTerm({ term, onInteraction }: GlossaryTermProps) {
  return (
    <details
      id={term.id}
      className="glossary-term"
      onToggle={(event) =>
        onInteraction?.({
          termId: term.id,
          action: event.currentTarget.open ? "open" : "close",
        })
      }
    >
      <summary>
        <span>{term.term}</span>
        <span aria-hidden="true">+</span>
      </summary>
      <p>{term.definition}</p>
    </details>
  );
}
