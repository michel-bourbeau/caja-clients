"use client";

/**
 * ExportButton.tsx
 * Reusable export/print button component.
 *
 * Simple mode (icon-only or with label, single action):
 *   <ExportButton onPrint={handlePrint} />
 *   <ExportButton onCsv={handleCsv} label="Exporter CSV" />
 *
 * Menu mode (dropdown with multiple options):
 *   <ExportButton
 *     onPrint={handlePrint}
 *     onCsv={handleCsv}
 *   />
 *
 * In menu mode the component renders a split button:
 *   [🖨 Imprimir / PDF] [▾]  — dropdown shows "Imprimir / PDF" + "Exportar CSV"
 */

import React, { useState, useRef, useEffect } from "react";
import { Printer, Download, FileText, ChevronDown } from "lucide-react";

export interface ExportButtonProps {
  /** Trigger a print / PDF-preview window */
  onPrint?: () => void;
  /** Trigger a CSV download */
  onCsv?: () => void;
  /** Override the print button label */
  printLabel?: string;
  /** Override the CSV button label */
  csvLabel?: string;
  /** Overall disabled state */
  disabled?: boolean;
  /** "sm" | "md" (default) */
  size?: "sm" | "md";
  /** Extra Tailwind classes for the container */
  className?: string;
}

const sizeMap = {
  sm: "px-2.5 py-1.5 text-xs gap-1.5",
  md: "px-3.5 py-2 text-sm gap-2",
};

const iconSize = { sm: "w-3.5 h-3.5", md: "w-4 h-4" };

export function ExportButton({
  onPrint,
  onCsv,
  printLabel,
  csvLabel,
  disabled = false,
  size = "md",
  className = "",
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const sz = sizeMap[size];
  const ic = iconSize[size];

  const baseBtn =
    `inline-flex items-center font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${sz}`;
  const primaryBtn = `${baseBtn} bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed`;
  const secondaryBtn = `${baseBtn} bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed`;

  // ── Single-action modes ───────────────────────────────────────────────────

  // Only CSV
  if (onCsv && !onPrint) {
    return (
      <button
        onClick={onCsv}
        disabled={disabled}
        className={`${secondaryBtn} ${className}`}
        title="Exportar CSV"
      >
        <Download className={ic} />
        {csvLabel ?? "CSV"}
      </button>
    );
  }

  // Only Print
  if (onPrint && !onCsv) {
    return (
      <button
        onClick={onPrint}
        disabled={disabled}
        className={`${primaryBtn} ${className}`}
        title="Imprimir / PDF"
      >
        <Printer className={ic} />
        {printLabel ?? "Imprimir"}
      </button>
    );
  }

  // ── Menu mode (both actions) ──────────────────────────────────────────────

  if (onPrint && onCsv) {
    return (
      <div ref={containerRef} className={`relative inline-flex ${className}`}>
        {/* Primary action button */}
        <button
          onClick={onPrint}
          disabled={disabled}
          className={`${primaryBtn} rounded-r-none border-r border-blue-700`}
          title="Imprimir / Guardar como PDF"
        >
          <Printer className={ic} />
          {printLabel ?? "Imprimir"}
        </button>

        {/* Chevron / dropdown toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          className={`${primaryBtn} rounded-l-none px-2 border-l border-blue-700`}
          aria-label="Más opciones de exportación"
          aria-expanded={open}
        >
          <ChevronDown className={ic} />
        </button>

        {/* Dropdown menu */}
        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={() => { onPrint(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              {printLabel ?? "Imprimir / PDF"}
            </button>
            <button
              onClick={() => { onCsv(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 border-t border-slate-100"
            >
              <FileText className="w-3.5 h-3.5 text-green-600" />
              {csvLabel ?? "Exportar CSV"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Nothing provided — render nothing
  return null;
}
