import type {
  DocumentSection as DocumentSectionContract,
  ReaderTextInteractionCallback,
} from "@/lib/contracts/document";
import { CodeExample } from "@/components/reader/CodeExample";
import { HeaderReferenceTable } from "@/components/reader/HeaderReferenceTable";

type DocumentSectionProps = {
  section: DocumentSectionContract;
  sectionNumber: number;
  active: boolean;
  onTextInteraction?: ReaderTextInteractionCallback;
};

export function DocumentSection({
  section,
  sectionNumber,
  active,
  onTextInteraction,
}: DocumentSectionProps) {
  function reportSelection() {
    const selection = window.getSelection()?.toString().trim() ?? "";
    if (selection.length < 2) return;

    onTextInteraction?.({
      sectionId: section.id,
      anchor: section.anchor,
      type: "selection",
      selectedCharacterCount: selection.length,
    });
  }

  return (
    <section
      id={section.anchor}
      className={active ? "document-section is-active" : "document-section"}
      data-document-section={section.id}
      data-section-anchor={section.anchor}
      tabIndex={-1}
      aria-labelledby={`${section.anchor}-title`}
      onMouseUp={reportSelection}
    >
      <div className="section-marker" aria-hidden="true">
        {String(sectionNumber).padStart(2, "0")}
      </div>
      <div className="section-content">
        <p className="section-eyebrow">{section.eyebrow}</p>
        <h2 id={`${section.anchor}-title`}>{section.title}</h2>
        <p className="section-summary">{section.summary}</p>

        <div className="section-body">
          {section.blocks.map((block) => {
            if (block.type === "paragraph") {
              return <p key={block.id}>{block.text}</p>;
            }

            if (block.type === "code") {
              return (
                <CodeExample
                  key={block.id}
                  id={block.id}
                  label={block.label}
                  language={block.language}
                  code={block.code}
                />
              );
            }

            if (block.type === "table") {
              return (
                <HeaderReferenceTable
                  key={block.id}
                  id={block.id}
                  caption={block.caption}
                  columns={block.columns}
                  rows={block.rows}
                />
              );
            }

            if (block.type === "callout") {
              return (
                <aside
                  key={block.id}
                  id={block.id}
                  className={`document-callout ${block.tone}`}
                  aria-label={block.title}
                >
                  <span className="callout-icon" aria-hidden="true">
                    {block.tone === "warning" ? "!" : "i"}
                  </span>
                  <div>
                    <h3>{block.title}</h3>
                    <p>{block.text}</p>
                  </div>
                </aside>
              );
            }

            return (
              <figure key={block.id} id={block.id} className="retry-timeline">
                <div className="timeline-heading">
                  <p>Visual reference</p>
                  <h3>{block.title}</h3>
                </div>
                <ol aria-label={block.description}>
                  {block.steps.map((step, index) => (
                    <li key={step.label}>
                      <span className="timeline-node">{index + 1}</span>
                      <strong>{step.label}</strong>
                      <span>{step.delay}</span>
                      <small>{step.detail}</small>
                    </li>
                  ))}
                </ol>
                <figcaption>{block.description}</figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
