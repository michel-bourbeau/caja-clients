/**
 * printEngine.ts
 * Core printing engine — opens a styled print window for any HTML content.
 * Supports two layouts: "receipt" (thermal 80mm) and "a4" / "a4-landscape".
 *
 * Usage:
 *   import { openPrintWindow, buildPrintDocument } from "@/lib/export/printEngine";
 *
 *   const html = buildPrintDocument(bodyHtml, { title: "Mon rapport", layout: "a4" });
 *   openPrintWindow(html);
 */

export type PrintLayout = "receipt" | "a4" | "a4-landscape";

export interface PrintWindowOptions {
  /** Page layout — determines window size and CSS. Default: "a4". */
  layout?: PrintLayout;
  /** Auto-trigger window.print() when the window loads. Default: true. */
  autoPrint?: boolean;
  /** Auto-close window after printing. Default: true. */
  autoClose?: boolean;
}

/** Opens a new window, injects HTML, and triggers printing. */
export function openPrintWindow(html: string, opts: PrintWindowOptions = {}): void {
  const { layout = "a4", autoPrint = true, autoClose = true } = opts;

  const dimensions =
    layout === "receipt"
      ? "width=420,height=700"
      : layout === "a4-landscape"
      ? "width=1100,height=780"
      : "width=820,height=1100";

  const win = window.open("", "_blank", `${dimensions},toolbar=0,menubar=0,scrollbars=yes`);
  if (!win) {
    // Popup blocked — fallback: open in same tab (rare, but safe)
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  win.document.write(html);
  win.document.close();
  win.focus();

  if (autoPrint) {
    // Small delay so fonts/images render before the dialog opens
    setTimeout(() => {
      win.print();
      if (autoClose) {
        setTimeout(() => win.close(), 500);
      }
    }, 350);
  }
}

/** Returns the shared base CSS reset. */
function baseCss(): string {
  return `* { margin: 0; padding: 0; box-sizing: border-box; }`;
}

/** Returns CSS optimised for a thermal receipt (58–80 mm roll). */
export function getReceiptStyles(): string {
  return `
    ${baseCss()}
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      width: 300px;
      padding: 8px;
    }
    h1 { font-size: 16px; text-align: center; margin-bottom: 2px; }
    .center { text-align: center; }
    .sub { text-align: center; font-size: 11px; color: #444; margin-bottom: 2px; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { font-size: 12px; vertical-align: top; }
    .total-row td { font-size: 14px; font-weight: bold; padding-top: 4px; }
    .footer { text-align: center; margin-top: 12px; font-size: 11px; color: #444; }
    @media print { body { width: 100%; padding: 4px; } }
  `.trim();
}

/** Returns CSS optimised for A4 report pages. */
export function getA4Styles(landscape = false): string {
  return `
    ${baseCss()}
    @page {
      size: ${landscape ? "A4 landscape" : "A4 portrait"};
      margin: 18mm 15mm;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #1e293b;
      background: #fff;
      padding: 20px;
      max-width: ${landscape ? "1050px" : "740px"};
      margin: 0 auto;
    }
    /* Header */
    .report-header { margin-bottom: 20px; border-bottom: 2px solid #1e293b; padding-bottom: 12px; }
    .report-header h1 { font-size: 18px; font-weight: 700; color: #0f172a; }
    .report-header .meta { font-size: 10px; color: #64748b; margin-top: 4px; }
    .report-header .company { font-size: 13px; font-weight: 600; color: #334155; }
    /* Stats row */
    .stats-grid { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
    .stat-card {
      flex: 1; min-width: 110px;
      border: 1px solid #e2e8f0; border-radius: 6px;
      padding: 8px 12px; background: #f8fafc;
    }
    .stat-card .stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
    .stat-card .stat-value { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .stat-card .stat-sub { font-size: 9px; color: #94a3b8; margin-top: 1px; }
    /* Table */
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    thead tr { background: #1e293b; }
    thead th {
      padding: 7px 10px; text-align: left;
      font-size: 10px; font-weight: 600;
      color: #fff; text-transform: uppercase; letter-spacing: 0.04em;
    }
    thead th.right { text-align: right; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:hover { background: #f8fafc; }
    tbody tr.group-header { background: #f1f5f9; font-weight: 700; }
    tbody tr.subtotal { background: #fef9c3; font-weight: 600; }
    tbody tr.grand-total { background: #1e293b; color: #fff; font-weight: 700; }
    td { padding: 5px 10px; font-size: 10.5px; color: #334155; vertical-align: top; }
    td.right { text-align: right; }
    td.muted { color: #94a3b8; font-size: 10px; }
    .badge {
      display: inline-block; padding: 1px 6px; border-radius: 3px;
      font-size: 9px; font-weight: 600; text-transform: uppercase;
    }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-blue  { background: #dbeafe; color: #1e40af; }
    .badge-red   { background: #fee2e2; color: #991b1b; }
    .badge-slate { background: #f1f5f9; color: #475569; }
    /* Footer */
    .report-footer {
      margin-top: 24px; padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px; color: #94a3b8; text-align: center;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  `.trim();
}

export interface BuildDocumentOptions {
  title: string;
  layout?: PrintLayout;
  /** Extra CSS injected after the layout styles */
  extraStyles?: string;
  /** If true, auto-print on window load (default false — openPrintWindow handles it) */
  autoPrint?: boolean;
  autoClose?: boolean;
}

/**
 * Wraps raw body HTML in a complete, self-contained HTML document
 * ready to be injected into a print window.
 */
export function buildPrintDocument(bodyHtml: string, opts: BuildDocumentOptions): string {
  const { title, layout = "a4", extraStyles = "", autoPrint = false, autoClose = true } = opts;

  const styles =
    layout === "receipt" ? getReceiptStyles() : getA4Styles(layout === "a4-landscape");

  const autoScript =
    autoPrint
      ? `<script>
          window.onload = function() {
            window.print();
            ${autoClose ? "setTimeout(function(){ window.close(); }, 600);" : ""}
          };
        </script>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <style>${styles}${extraStyles ? "\n" + extraStyles : ""}</style>
</head>
<body>
${bodyHtml}
${autoScript}
</body>
</html>`;
}

/** Minimal HTML-escape for use inside attributes / title. */
export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
