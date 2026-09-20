// A small, dependency-free CSV parser geared at the upload dialog.
// Handles quoted fields, escaped quotes ("" → "), and CRLF / LF line endings.
// Works for the mid-sized (≤ few-MB) CSVs we expect from ERP imports —
// if we ever need to stream GB-scale files we'd swap in Papaparse.

export interface ParsedCsv {
  header: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const lines = splitCsvLines(text);
  if (lines.length === 0) return { header: [], rows: [] };
  const [header, ...rest] = lines;
  return { header, rows: rest };
}

// splitCsvLines walks the source character-by-character so we can respect
// newlines inside quoted fields (a common trip-up of "split on \n").
function splitCsvLines(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          // Escaped quote → literal "
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\r") {
      // peek — we'll handle the \n next iteration
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      // Skip completely blank rows.
      if (!(row.length === 1 && row[0] === "")) out.push(row);
      row = [];
      field = "";
      continue;
    }
    field += ch;
  }

  // Flush trailing field/row (file without terminating newline).
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (!(row.length === 1 && row[0] === "")) out.push(row);
  }

  return out;
}

// rowsToObjects maps CSV arrays to objects keyed by header.
// Extra/missing columns are tolerated — the row editor surfaces them.
export function rowsToObjects(
  header: string[],
  rows: string[][]
): Record<string, string>[] {
  return rows.map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h.trim()] = (r[i] ?? "").trim();
    });
    return obj;
  });
}
