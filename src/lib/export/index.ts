/**
 * src/lib/export/index.ts
 * Barrel export for the export/print infrastructure.
 *
 * Import anything you need from this single entry point:
 *
 *   import {
 *     openPrintWindow,
 *     buildPrintDocument,
 *     buildTableReportHtml,
 *     buildSummaryReportHtml,
 *     exportCsv,
 *     buildCsv,
 *     downloadCsv,
 *   } from "@/lib/export";
 */

// Core print engine
export {
  openPrintWindow,
  buildPrintDocument,
  getA4Styles,
  getReceiptStyles,
  escHtml,
} from "./printEngine";

export type { PrintLayout, PrintWindowOptions, BuildDocumentOptions } from "./printEngine";

// HTML template builders
export { buildTableReportHtml, buildSummaryReportHtml } from "./printTemplates";

export type {
  TableColumn,
  StatCard,
  ReportMeta,
  TableReportConfig,
  SummaryReportConfig,
} from "./printTemplates";

// CSV engine
export { buildCsv, downloadCsv, exportCsv } from "./csvEngine";

export type { CsvColumn } from "./csvEngine";
