/**
 * printTemplates.ts
 * Pre-built HTML body generators for common report types.
 * These produce the <body> content that goes inside buildPrintDocument().
 *
 * Supported templates:
 *   - buildTableReportHtml()  — generic table with optional stats row
 *   - buildSummaryReportHtml() — stats cards + table
 *
 * Usage:
 *   import { buildTableReportHtml, buildPrintDocument, openPrintWindow } from "@/lib/export";
 *
 *   const body = buildTableReportHtml({ title: "Transacciones", columns, rows });
 *   const doc  = buildPrintDocument(body, { title: "Transacciones", layout: "a4" });
 *   openPrintWindow(doc);
 */

import { escHtml } from "./printEngine";

// ─── Shared types ────────────────────────────────────────────────────────────

export interface TableColumn {
  key: string;
  label: string;
  /** "left" (default) | "right" | "center" */
  align?: "left" | "right" | "center";
  /** Optional CSS class applied to each <td> (e.g. "muted", "badge-green") */
  className?: string;
}

export interface StatCard {
  label: string;
  value: string;
  sub?: string;
}

export interface ReportMeta {
  /** Business/company name shown at top right */
  companyName?: string;
  /** Period label, e.g. "Abril 2025" */
  period?: string;
  /** Printed date (defaults to today) */
  printedAt?: string;
  /** Free-form subtitle below the title */
  subtitle?: string;
}

// ─── TableReport ─────────────────────────────────────────────────────────────

export interface TableReportConfig extends ReportMeta {
  title: string;
  columns: TableColumn[];
  /** Each row is a plain object; keys must match TableColumn.key values. */
  rows: Record<string, unknown>[];
  /**
   * Optional totals row rendered at the bottom of the table in dark style.
   * Keys must match column keys.
   */
  totalsRow?: Record<string, unknown>;
  /**
   * Optional group key: when provided, consecutive rows sharing the same
   * value for this key get a group-header row injected between them.
   * The group header spans all columns and shows the group value.
   */
  groupByKey?: string;
  groupLabelFn?: (value: unknown) => string;
}

/** Generates the HTML <body> for a plain table report (A4 layout). */
export function buildTableReportHtml(config: TableReportConfig): string {
  const {
    title,
    columns,
    rows,
    totalsRow,
    groupByKey,
    groupLabelFn,
    companyName,
    period,
    subtitle,
    printedAt,
  } = config;

  const dateStr =
    printedAt ??
    new Intl.DateTimeFormat("es-NI", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

  // Build header row
  const headerCells = columns
    .map(
      (c) =>
        `<th class="${c.align === "right" ? "right" : ""}">${escHtml(c.label)}</th>`
    )
    .join("");

  // Build body rows (with optional grouping)
  let lastGroup: unknown = Symbol(); // unique sentinel
  const bodyRows: string[] = [];
  for (const row of rows) {
    if (groupByKey !== undefined) {
      const groupVal = row[groupByKey];
      if (groupVal !== lastGroup) {
        lastGroup = groupVal;
        const label = groupLabelFn ? groupLabelFn(groupVal) : String(groupVal ?? "");
        bodyRows.push(
          `<tr class="group-header"><td colspan="${columns.length}" class="group-label">${escHtml(label)}</td></tr>`
        );
      }
    }
    const cells = columns
      .map((c) => {
        const raw = row[c.key];
        const val = raw === null || raw === undefined ? "" : String(raw);
        const cls = [c.align === "right" ? "right" : "", c.className ?? ""]
          .filter(Boolean)
          .join(" ");
        return `<td class="${cls}">${escHtml(val)}</td>`;
      })
      .join("");
    bodyRows.push(`<tr>${cells}</tr>`);
  }

  // Totals row
  const totalsHtml = totalsRow
    ? `<tr class="grand-total">${columns
        .map((c) => {
          const raw = totalsRow[c.key];
          const val = raw === null || raw === undefined ? "" : String(raw);
          const cls = c.align === "right" ? "right" : "";
          return `<td class="${cls}">${escHtml(val)}</td>`;
        })
        .join("")}</tr>`
    : "";

  return `
<div class="report-header">
  ${companyName ? `<div class="company">${escHtml(companyName)}</div>` : ""}
  <h1>${escHtml(title)}</h1>
  ${subtitle ? `<div class="meta">${escHtml(subtitle)}</div>` : ""}
  <div class="meta">
    ${period ? `<span>${escHtml(period)}</span> &nbsp;·&nbsp; ` : ""}
    <span>${escHtml(dateStr)}</span>
  </div>
</div>

<table>
  <thead>
    <tr>${headerCells}</tr>
  </thead>
  <tbody>
    ${bodyRows.join("\n    ")}
    ${totalsHtml}
  </tbody>
</table>

<div class="report-footer">
  ${companyName ? `${escHtml(companyName)} &nbsp;·&nbsp; ` : ""}
  ${escHtml(dateStr)}
</div>
`.trim();
}

// ─── SummaryReport ────────────────────────────────────────────────────────────

export interface SummaryReportConfig extends TableReportConfig {
  /** KPI cards displayed above the table */
  stats: StatCard[];
}

/** Generates the HTML <body> for a summary report: KPI cards + table (A4). */
export function buildSummaryReportHtml(config: SummaryReportConfig): string {
  const { stats, ...tableConfig } = config;

  const statCards = stats
    .map(
      (s) => `
    <div class="stat-card">
      <div class="stat-label">${escHtml(s.label)}</div>
      <div class="stat-value">${escHtml(s.value)}</div>
      ${s.sub ? `<div class="stat-sub">${escHtml(s.sub)}</div>` : ""}
    </div>`
    )
    .join("");

  const statsHtml = `<div class="stats-grid">${statCards}</div>`;

  // Inject stats between header and table by splitting the table template
  const tableHtml = buildTableReportHtml(tableConfig);

  // Insert stats-grid after the report-header block
  return tableHtml.replace(
    /(<\/div>\s*\n\s*<table)/,
    `${'</div>'}\n\n${statsHtml}\n\n<table`
  );
}
