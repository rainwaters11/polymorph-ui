import type { DocumentSection } from "@/lib/contracts/document";

type OriginalSourcePanelProps = {
  section: DocumentSection;
};

export function OriginalSourcePanel({ section }: OriginalSourcePanelProps) {
  return (
    <section
      className="original-source-panel"
      aria-labelledby={`${section.anchor}-original-title`}
    >
      <div className="original-source-heading">
        <div>
          <p>Unchanged source</p>
          <h2 id={`${section.anchor}-original-title`}>{section.title}</h2>
        </div>
        <span>Original wording</span>
      </div>
      <p className="original-source-summary">{section.summary}</p>
      <div className="original-source-body">
        {section.blocks.map((block) => {
          if (block.type === "paragraph") {
            return <p key={block.id}>{block.text}</p>;
          }

          if (block.type === "code") {
            return (
              <figure key={block.id} className="original-code">
                <figcaption>{block.label}</figcaption>
                <pre
                  tabIndex={0}
                  aria-label={`${block.label}, ${block.language} code`}
                >
                  <code>{block.code}</code>
                </pre>
              </figure>
            );
          }

          if (block.type === "table") {
            return (
              <div key={block.id} className="original-table-wrap">
                <table>
                  <caption>{block.caption}</caption>
                  <thead>
                    <tr>
                      {block.columns.map((column) => (
                        <th key={column} scope="col">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row) => (
                      <tr key={row[0]}>
                        <th scope="row">{row[0]}</th>
                        <td>{row[1]}</td>
                        <td>{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          if (block.type === "callout") {
            return (
              <aside key={block.id} className="original-callout">
                <strong>{block.title}</strong>
                <p>{block.text}</p>
              </aside>
            );
          }

          return (
            <figure key={block.id} className="original-timeline">
              <h3>{block.title}</h3>
              <ol>
                {block.steps.map((step) => (
                  <li key={step.label}>
                    <strong>{step.label}</strong>
                    <span>{step.delay}</span>
                    <p>{step.detail}</p>
                  </li>
                ))}
              </ol>
              <figcaption>{block.description}</figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
