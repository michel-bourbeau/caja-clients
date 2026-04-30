/**
 * csvEngine.ts
 * Lightweight CSV generation and download utility.
 *
 * Usage:
 *   import { buildCsv, downloadCsv } from "@/lib/export/csvEngine";
 *
 *   const csv = buildCsv(
 *     [
 *       { label: "Fecha",  value: (r) => r.date },
 *       { label: "Total",  value: (r) => String(r.total) },
 *     ],
 *     rows
 *   );
 *   downloadCsv("transacciones-2025-04.csv", csv);
 */

export interface CsvColumn<T> {
  /** Column header text */
  label: string;
  /** Extracts the cell value from a row */
  value: (row: T) => string;
}

/**
 * Builds a UTF-8 CSV string with a BOM so Excel opens it correctly.
 * Values containing commas, quotes, or newlines are properly quoted.
 */
export function buildCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const escape = (v: string): string => {
    if (v.includes('"') || v.includes(",") || v.includes("\n") || v.includes(";")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escape(c.value(row))).join(","))
    .join("\r\n");

  // UTF-8 BOM (\uFEFF) ensures Excel auto-detects encoding
  return "\uFEFF" + header + "\r\n" + body;
}

/**
 * Triggers a browser download of the CSV string as a file.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convenience: build and immediately download a CSV.
 */
export function exportCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[]
): void {
  downloadCsv(filename, buildCsv(columns, rows));
}
