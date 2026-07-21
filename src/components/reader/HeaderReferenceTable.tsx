type HeaderReferenceTableProps = {
  id: string;
  caption: string;
  columns: [string, string, string];
  rows: Array<[string, string, string]>;
};

export function HeaderReferenceTable({
  id,
  caption,
  columns,
  rows,
}: HeaderReferenceTableProps) {
  return (
    <div
      id={id}
      className="reference-table-wrap"
      data-region="reference-content"
      tabIndex={0}
      aria-label={`${caption}. Scroll horizontally to view every column.`}
    >
      <table className="reference-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              <th scope="row">
                <code>{row[0]}</code>
              </th>
              <td>{row[1]}</td>
              <td>{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
