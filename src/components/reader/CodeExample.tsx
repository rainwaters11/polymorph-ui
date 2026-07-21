type CodeExampleProps = {
  id: string;
  label: string;
  language: string;
  code: string;
};

export function CodeExample({ id, label, language, code }: CodeExampleProps) {
  return (
    <figure id={id} className="code-example" data-region="reference-content">
      <figcaption>
        <span>{label}</span>
        <span>{language}</span>
      </figcaption>
      <pre tabIndex={0} aria-label={`${label}, ${language} code`}>
        <code>{code}</code>
      </pre>
    </figure>
  );
}
