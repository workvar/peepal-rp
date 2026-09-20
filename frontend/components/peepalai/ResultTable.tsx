"use client";

// Tabular rendering of one PeepalAI query result.
export default function ResultTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  if (!columns.length) return null;
  return (
    <div className="card p-0 overflow-x-auto mt-2">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            {columns.map((c) => (
              <th key={c} className="table-th whitespace-nowrap">{c.replaceAll("_", " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.length === 0 ? (
            <tr>
              <td className="table-td text-muted-foreground/70" colSpan={columns.length}>
                No matching records.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="hover:bg-muted/40">
                {r.map((cell, j) => (
                  <td key={j} className="table-td">{cell || "—"}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
