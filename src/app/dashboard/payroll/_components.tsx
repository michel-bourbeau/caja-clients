"use client";

// Shared presentational pieces for the payroll pages (periods, receipts).

import type React from "react";
import type { PeriodInfo } from "@/lib/types";

// ─── Period navigator (prev/next arrows + select) ──────────────────────────

interface PeriodNavigatorProps {
  periods: PeriodInfo[];
  selected: PeriodInfo | null;
  onChange: (period: PeriodInfo) => void;
  currentLabel?: string;
}

export function PeriodNavigator({ periods, selected, onChange, currentLabel }: PeriodNavigatorProps) {
  if (periods.length === 0) return null;
  const idx = selected ? periods.findIndex((p) => p.id === selected.id) : 0;
  const canPrev = idx < periods.length - 1;
  const canNext = idx > 0;

  return (
    <div className="flex items-center gap-2 mb-6 w-full">
      <button
        onClick={() => canPrev && onChange(periods[idx + 1])}
        disabled={!canPrev}
        className="flex-shrink-0 p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <select
        value={selected?.id ?? ""}
        onChange={(e) => {
          const p = periods.find((p) => p.id === e.target.value);
          if (p) onChange(p);
        }}
        className="flex-1 min-w-0 px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}{p.isCurrent && currentLabel ? ` ${currentLabel}` : ""}
          </option>
        ))}
      </select>

      <button
        onClick={() => canNext && onChange(periods[idx - 1])}
        disabled={!canNext}
        className="flex-shrink-0 p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// ─── Inline label/value stat ────────────────────────────────────────────────

const INLINE_STAT_TONE = {
  slate: "text-slate-900",
  emerald: "text-emerald-600",
  amber: "text-amber-600",
} as const;

interface InlineStatProps {
  label: string;
  value: string;
  tone?: keyof typeof INLINE_STAT_TONE;
}

export function InlineStat({ label, value, tone = "slate" }: InlineStatProps) {
  return (
    <div>
      <p className="text-xs text-slate-600">{label}</p>
      <p className={`text-xl font-bold ${INLINE_STAT_TONE[tone]}`}>{value}</p>
    </div>
  );
}

// ─── Status pill (paid / partial / current period, etc.) ───────────────────

const STATUS_PILL_TONE = {
  emerald: "text-emerald-700 bg-emerald-100",
  amber: "text-amber-700 bg-amber-100",
  blue: "text-blue-700 bg-blue-100",
} as const;

interface StatusPillProps {
  tone: keyof typeof STATUS_PILL_TONE;
  children: React.ReactNode;
}

export function StatusPill({ tone, children }: StatusPillProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_PILL_TONE[tone]}`}>
      {children}
    </span>
  );
}

// ─── Undo-confirm button (used next to a paid/partial status pill) ─────────

interface UndoConfirmButtonProps {
  confirming: boolean;
  onAskConfirm: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel: string;
  cancelLabel: string;
}

export function UndoConfirmButton({ confirming, onAskConfirm, onConfirm, onCancel, confirmLabel, cancelLabel }: UndoConfirmButtonProps) {
  if (confirming) {
    return (
      <span className="inline-flex gap-1">
        <button onClick={onConfirm} className="text-xs text-red-600 font-semibold hover:underline">{confirmLabel}</button>
        <button onClick={onCancel} className="text-xs text-slate-400 hover:underline">{cancelLabel}</button>
      </span>
    );
  }
  return (
    <button onClick={onAskConfirm} className="text-xs text-slate-300 hover:text-red-400 transition-colors" title="Anular pago">↩</button>
  );
}
