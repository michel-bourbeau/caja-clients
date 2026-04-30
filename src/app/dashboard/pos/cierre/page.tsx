"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Button, Card, Container, Section, Alert } from "@/components/StripeUIComponents";
import { PageIcon } from "@/components";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { toNicaraguaDateString } from "@/lib/utils/formatters";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemTotals {
  system_cash: number;
  system_card: number;
  system_transfer: number;
  system_total: number;
  tx_count: number;
}

interface CashClosing {
  id: string;
  closing_date: string;
  system_cash: number;
  system_card: number;
  system_transfer: number;
  system_total: number;
  declared_cash: number;
  declared_card: number;
  declared_transfer: number;
  diff_cash: number;
  diff_card: number;
  diff_transfer: number;
  notes: string | null;
  closed_by: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DiffBadge({ diff, t }: { diff: number; t: (k: string) => string }) {
  const abs = Math.abs(diff);
  if (abs < 0.01) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        {t("cierre.diffCuadrado")}
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
        ▲ {t("cierre.diffSobrante")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
      ▼ {t("cierre.diffFaltante")}
    </span>
  );
}

function fmtLocalDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString("es-NI", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CierreCajaPage() {
  const tenantId = useTenantId();
  const { fmt } = useCurrency();
  const { t } = useLanguage();
  const { user, hasPermission, refreshPermissions } = useAuth();

  // pos.cierre_review = see system totals, diffs and print (managers/admins)
  // settings.manage_roles is a fallback for admins whose DB role predates this permission
  const isManager = hasPermission("pos.cierre_review") || hasPermission("settings.manage_roles");

  const today = toNicaraguaDateString(new Date());

  // Refresh permissions on mount so an admin role update takes effect immediately
  // without requiring the user to log out and back in
  useEffect(() => {
    refreshPermissions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── state: form ──
  const [selectedDate, setSelectedDate] = useState(today);
  const [declaredCash, setDeclaredCash] = useState("");
  const [declaredCard, setDeclaredCard] = useState("");
  const [declaredTransfer, setDeclaredTransfer] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── refs for number inputs (disable mouse wheel) ──
  const declaredCashRef = useRef<HTMLInputElement>(null);
  const declaredCardRef = useRef<HTMLInputElement>(null);
  const declaredTransferRef = useRef<HTMLInputElement>(null);

  // ── state: live system totals (always loaded, independent of saved closing) ──
  const [systemTotals, setSystemTotals] = useState<SystemTotals | null>(null);
  const [loadingTotals, setLoadingTotals] = useState(false);

  // ── state: current closing for selected date ──
  const [current, setCurrent] = useState<CashClosing | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);

  // ── state: history ──
  const [history, setHistory] = useState<CashClosing[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // ── load history ──
  const loadHistory = useCallback(async () => {
    if (!tenantId) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/cash-closings`);
      if (res.ok) setHistory(await res.json());
    } finally {
      setLoadingHistory(false);
    }
  }, [tenantId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── load system totals from transactions (no saved closing required) ──
  const loadSystemTotals = useCallback(async () => {
    if (!tenantId || !selectedDate) return;
    setLoadingTotals(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/cash-closings?date=${selectedDate}&preview`);
      const data = await res.json();
      setSystemTotals(data);
    } catch {
      setSystemTotals(null);
    } finally {
      setLoadingTotals(false);
    }
  }, [tenantId, selectedDate]);

  useEffect(() => {
    loadSystemTotals();
  }, [loadSystemTotals]);

  // ── Prevent mouse wheel from changing numeric inputs ──
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    const inputs = [declaredCashRef.current, declaredCardRef.current, declaredTransferRef.current].filter(Boolean);
    
    inputs.forEach((input) => {
      if (input) {
        input.addEventListener("wheel", handleWheel, { passive: false });
      }
    });

    return () => {
      inputs.forEach((input) => {
        if (input) {
          input.removeEventListener("wheel", handleWheel);
        }
      });
    };
  }, []);

  // ── load existing saved closing for selected date ──
  useEffect(() => {
    if (!tenantId || !selectedDate) return;
    setLoadingCurrent(true);
    fetch(`/api/tenants/${tenantId}/cash-closings?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        setCurrent(data || null);
        // Always clear the input fields for a fresh entry
        setDeclaredCash("");
        setDeclaredCard("");
        setDeclaredTransfer("");
        setNotes(data?.notes ?? "");
      })
      .catch(() => {
        setCurrent(null);
        setDeclaredCash("");
        setDeclaredCard("");
        setDeclaredTransfer("");
        setNotes("");
      })
      .finally(() => setLoadingCurrent(false));
  }, [tenantId, selectedDate]);

  // ── computed live diff (uses systemTotals — available even before saving) ──
  const preview = useMemo(() => {
    if (!systemTotals) return null;
    const dCash = parseFloat(declaredCash) || 0;
    const dCard = parseFloat(declaredCard) || 0;
    const dTransfer = parseFloat(declaredTransfer) || 0;
    return {
      diff_cash: dCash - systemTotals.system_cash,
      diff_card: dCard - systemTotals.system_card,
      diff_transfer: dTransfer - systemTotals.system_transfer,
    };
  }, [systemTotals, declaredCash, declaredCard, declaredTransfer]);

  // ── submit ──
  const handleSubmit = async () => {
    if (!tenantId) return;
    setSaving(true);
    setFormMessage(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/cash-closings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closing_date: selectedDate,
          declared_cash: parseFloat(declaredCash) || 0,
          declared_card: parseFloat(declaredCard) || 0,
          declared_transfer: parseFloat(declaredTransfer) || 0,
          notes: notes.trim() || null,
          closed_by: user ? `${user.firstName} ${user.lastName}`.trim() : null,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setCurrent(saved);
        setFormMessage({ type: "success", text: t("cierre.successSaved") });
        loadHistory();
        loadSystemTotals(); // Refresh system totals after closing
        // Clear form inputs and notes
        setDeclaredCash("");
        setDeclaredCard("");
        setDeclaredTransfer("");
        setNotes("");
        setTimeout(() => setFormMessage(null), 4000);
      } else {
        const err = await res.json();
        setFormMessage({ type: "error", text: err.error || t("cierre.errorSave") });
      }
    } catch {
      setFormMessage({ type: "error", text: t("cierre.errorNetwork") });
    } finally {
      setSaving(false);
    }
  };

  // ── print ──
  const handlePrint = () => {
    if (!systemTotals) return;
    const dCash = parseFloat(declaredCash) || (current?.declared_cash ?? 0);
    const dCard = parseFloat(declaredCard) || (current?.declared_card ?? 0);
    const dTransfer = parseFloat(declaredTransfer) || (current?.declared_transfer ?? 0);
    const diffCash = dCash - systemTotals.system_cash;
    const diffCard = dCard - systemTotals.system_card;
    const diffTransfer = dTransfer - systemTotals.system_transfer;

    const win = window.open("", "_blank", "width=420,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>{t("cierre.title")} — ${selectedDate}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 16px; max-width: 380px; }
          h1 { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 2px; }
          .center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .row.bold { font-weight: bold; }
          .diff-ok { color: #166534; }
          .diff-bad { color: #991b1b; font-weight: bold; }
          .diff-over { color: #1e40af; }
          .section-title { font-weight: bold; margin: 6px 0 2px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
          .notes { border-top: 1px dashed #000; margin-top: 8px; padding-top: 6px; font-style: italic; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>${t("cierre.printTitle")}</h1>
        <p class="center">${fmtLocalDate(selectedDate)}</p>
        ${current && current.closed_by ? `<p class="center">${t("cierre.printCashier").replace("{{name}}", current.closed_by)}</p>` : ""}
        <div class="divider"></div>

        <p class="section-title">${t("cierre.printSystemSales")}</p>
        <div class="row"><span>${t("cierre.labelCash").replace(" (CASH)","")}</span><span>${fmt(systemTotals.system_cash)}</span></div>
        <div class="row"><span>${t("cierre.labelCard").replace(" (CARD)","")}</span><span>${fmt(systemTotals.system_card)}</span></div>
        <div class="row"><span>${t("cierre.labelTransfer")}</span><span>${fmt(systemTotals.system_transfer)}</span></div>
        <div class="row bold"><span>${t("cierre.labelSystemTotal")}</span><span>${fmt(systemTotals.system_total)}</span></div>

        <div class="divider"></div>

        <p class="section-title">${t("cierre.printDeclared")}</p>
        <div class="row"><span>${t("cierre.printCashCounted")}</span><span>${fmt(dCash)}</span></div>
        <div class="row"><span>${t("cierre.printCardReport")}</span><span>${fmt(dCard)}</span></div>
        <div class="row"><span>${t("cierre.printTransfers")}</span><span>${fmt(dTransfer)}</span></div>

        <div class="divider"></div>

        <p class="section-title">${t("cierre.printDiffs")}</p>
        <div class="row">
          <span>${t("cierre.labelCash").replace(" (CASH)","")}</span>
          <span class="${Math.abs(diffCash) < 0.01 ? "diff-ok" : diffCash < 0 ? "diff-bad" : "diff-over"}">
            ${diffCash >= 0 ? "+" : ""}${fmt(diffCash)}
            ${Math.abs(diffCash) < 0.01 ? "\u2713" : diffCash < 0 ? t("cierre.printShort") : t("cierre.printOver")}
          </span>
        </div>
        <div class="row">
          <span>${t("cierre.labelCard").replace(" (CARD)","")}</span>
          <span class="${Math.abs(diffCard) < 0.01 ? "diff-ok" : diffCard < 0 ? "diff-bad" : "diff-over"}">
            ${diffCard >= 0 ? "+" : ""}${fmt(diffCard)}
            ${Math.abs(diffCard) < 0.01 ? "\u2713" : diffCard < 0 ? t("cierre.printShort") : t("cierre.printOver")}
          </span>
        </div>
        <div class="row">
          <span>${t("cierre.labelTransfer")}</span>
          <span class="${Math.abs(diffTransfer) < 0.01 ? "diff-ok" : diffTransfer < 0 ? "diff-bad" : "diff-over"}">
            ${diffTransfer >= 0 ? "+" : ""}${fmt(diffTransfer)}
            ${Math.abs(diffTransfer) < 0.01 ? "\u2713" : diffTransfer < 0 ? t("cierre.printShort") : t("cierre.printOver")}
          </span>
        </div>

        ${current && current.notes ? `<div class="notes">${t("cierre.printNotes").replace("{{text}}", current.notes)}</div>` : ""}

        <div class="divider"></div>
        <p class="center" style="font-size:10px;color:#555;">${t("cierre.printPrinted").replace("{{datetime}}", new Date().toLocaleString())}</p>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Container className="pb-12">
      <Section>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <PageIcon type="cierre" size="lg" displayType="lucide" />
            <h1 className="text-3xl font-bold text-slate-900">{t("cierre.title")}</h1>
          </div>
          <p className="text-slate-600 text-sm">
            {isManager
              ? t("cierre.subtitleManager")
              : t("cierre.subtitleCashier")}
          </p>
        </div>

        {/* Main form card */}
        <Card>

          {/* Card header — date selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50 -m-6 mb-0 rounded-t-lg">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{t("cierre.dateLabel")}</p>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-2">
              {t("cierre.datePlaceholder")}
            </p>
          </div>
        </div>

        <div className={`p-6 grid grid-cols-1 gap-6 ${isManager ? "lg:grid-cols-2" : ""}`}>

          {/* Left: System totals — MANAGER ONLY (blind count security) */}
          {isManager && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">
                {t("cierre.systemSales")}
              </h2>
              {loadingTotals ? (
                <div className="space-y-2 animate-pulse">
                  {[1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg" />)}
                </div>
              ) : systemTotals && systemTotals.tx_count > 0 ? (
                <div className="space-y-2">
                  {[
                    { label: t("cierre.labelCash"), value: systemTotals.system_cash, color: "text-green-700", bg: "bg-green-50 border-green-200" },
                    { label: t("cierre.labelCard"), value: systemTotals.system_card, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
                    { label: t("cierre.labelTransfer"), value: systemTotals.system_transfer, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`flex justify-between items-center px-4 py-2.5 rounded-lg border ${bg}`}>
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                      <span className={`text-sm font-bold ${color}`}>{fmt(value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-4 py-3 rounded-lg border border-slate-300 bg-slate-100">
                    <span className="text-sm font-bold text-slate-800">{t("cierre.labelSystemTotal")}</span>
                    <span className="text-base font-bold text-slate-900">{fmt(systemTotals.system_total)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {systemTotals.tx_count === 1
                      ? t("cierre.basedOn").replace("{{count}}", String(systemTotals.tx_count)).replace("{{date}}", fmtLocalDate(selectedDate))
                      : t("cierre.basedOnPlural").replace("{{count}}", String(systemTotals.tx_count)).replace("{{date}}", fmtLocalDate(selectedDate))}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
                  <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M9 17H5a2 2 0 01-2-2V9a2 2 0 012-2h14a2 2 0 012 2v6a2 2 0 01-2 2h-4M9 17h6" />
                  </svg>
                  <p className="text-sm text-slate-500">{t("cierre.noSales")}</p>
                </div>
              )}
            </div>
          )}

          {/* Right: Cashier declaration — always visible */}
          <div className={isManager ? "" : "max-w-lg mx-auto w-full"}>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">
              {t("cierre.cashDeclaration")}
            </h2>
            {/* Blind count notice for cashiers */}
            {!isManager && (
              <div className="flex items-start gap-3 px-4 py-3 mb-4 rounded-lg bg-amber-50 border border-amber-200">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <p className="text-sm text-amber-800">
                  <strong>{t("cierre.blindCountTitle")}:</strong> {t("cierre.blindCountNotice")}
                </p>
              </div>
            )}
            <div className="space-y-4">

              {/* Cash */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t("cierre.inputCash")}
                </label>
                <input
                  ref={declaredCashRef}
                  type="number"
                  step="0.01"
                  value={declaredCash === "" ? "" : declaredCash}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setDeclaredCash("");
                    } else {
                      const num = Number(val);
                      if (!isNaN(num) && num >= 0) {
                        setDeclaredCash(String(num));
                      }
                    }
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 text-right font-mono"
                />
                {/* Live diff preview — MANAGER ONLY */}
                {isManager && systemTotals && declaredCash !== "" && preview && (
                  <div className={`mt-1.5 flex items-center justify-between text-xs px-3 py-1.5 rounded-lg ${
                    Math.abs(preview.diff_cash) < 0.01
                      ? "bg-green-50 text-green-700"
                      : preview.diff_cash < 0
                      ? "bg-red-50 text-red-700"
                      : "bg-blue-50 text-blue-700"
                  }`}>
                    <span>
                      {Math.abs(preview.diff_cash) < 0.01
                        ? t("cierre.diffMatch")
                        : preview.diff_cash < 0
                        ? t("cierre.diffShort").replace("{{amount}}", fmt(Math.abs(preview.diff_cash)))
                        : t("cierre.diffOver").replace("{{amount}}", fmt(preview.diff_cash))}
                    </span>
                    <span className="font-mono">{t("cierre.systemLabel").replace("{{amount}}", fmt(systemTotals.system_cash))}</span>
                  </div>
                )}
              </div>

              {/* Card */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t("cierre.inputCard")}
                </label>
                <input
                  ref={declaredCardRef}
                  type="number"
                  step="0.01"
                  value={declaredCard === "" ? "" : declaredCard}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setDeclaredCard("");
                    } else {
                      const num = Number(val);
                      if (!isNaN(num) && num >= 0) {
                        setDeclaredCard(String(num));
                      }
                    }
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-mono"
                />
                {/* Live diff preview — MANAGER ONLY */}
                {isManager && systemTotals && declaredCard !== "" && preview && (
                  <div className={`mt-1.5 flex items-center justify-between text-xs px-3 py-1.5 rounded-lg ${
                    Math.abs(preview.diff_card) < 0.01
                      ? "bg-green-50 text-green-700"
                      : preview.diff_card < 0
                      ? "bg-red-50 text-red-700"
                      : "bg-blue-50 text-blue-700"
                  }`}>
                    <span>
                      {Math.abs(preview.diff_card) < 0.01
                        ? t("cierre.diffMatch")
                        : preview.diff_card < 0
                        ? t("cierre.diffShort").replace("{{amount}}", fmt(Math.abs(preview.diff_card)))
                        : t("cierre.diffOver").replace("{{amount}}", fmt(preview.diff_card))}
                    </span>
                    <span className="font-mono">{t("cierre.systemLabel").replace("{{amount}}", fmt(systemTotals.system_card))}</span>
                  </div>
                )}
              </div>

              {/* Transfer */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t("cierre.inputTransfer")}
                </label>
                <input
                  ref={declaredTransferRef}
                  type="number"
                  step="0.01"
                  value={declaredTransfer === "" ? "" : declaredTransfer}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setDeclaredTransfer("");
                    } else {
                      const num = Number(val);
                      if (!isNaN(num) && num >= 0) {
                        setDeclaredTransfer(String(num));
                      }
                    }
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-mono"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t("cierre.notesLabel")}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("cierre.notesPlaceholder")}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Actions */}
              {formMessage && (
                <Alert
                  variant={formMessage.type === "success" ? "success" : "error"}
                  title={formMessage.type === "success" ? t("cierre.successTitle") : t("cierre.errorTitle")}
                >
                  {formMessage.text}
                </Alert>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="whitespace-nowrap"
                >
                  {saving ? t("cierre.saving") : t("cierre.save")}
                </Button>
                {/* Print — MANAGER ONLY (report contains system totals) */}
                {isManager && systemTotals && (
                  <Button
                    variant="secondary"
                    onClick={handlePrint}
                    title={t("cierre.print")}
                    className="flex items-center justify-center p-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

          {/* Summary row — MANAGER ONLY */}
          {isManager && systemTotals && systemTotals.tx_count > 0 && (declaredCash !== "" || declaredCard !== "") && preview && (
            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: t("cierre.summaryLabel"), diff: preview.diff_cash },
                { label: t("cierre.summaryCard"), diff: preview.diff_card },
                { label: t("cierre.summaryTransfer"), diff: preview.diff_transfer },
              ].map(({ label, diff }) => (
                <div key={label} className="text-center">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">{label}</p>
                  <DiffBadge diff={diff} t={t} />
                  <p className={`text-sm font-bold mt-1 ${
                    Math.abs(diff) < 0.01 ? "text-green-700" : diff < 0 ? "text-red-600" : "text-blue-700"
                  }`}>
                    {diff >= 0 ? "+" : ""}{fmt(diff)}
                  </p>
                </div>
              ))}
              <div className="text-center col-span-2 sm:col-span-1">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">{t("cierre.summarySystemTotal")}</p>
                <p className="text-lg font-bold text-slate-900">{fmt(systemTotals.system_total)}</p>
              </div>
            </div>
          )}
        </Card>

        {/* History */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4">{t("cierre.historyTitle")}</h2>
          {loadingHistory ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
              <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm text-slate-500">{t("cierre.historyEmpty")}</p>
            </div>
          ) : (
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-800 text-white text-xs font-semibold uppercase tracking-wide">
                    <th className="px-4 py-3 text-left text-white">{t("cierre.historyDate")}</th>
                    <th className="px-4 py-3 text-right text-white">{t("cierre.historyCash")}</th>
                    <th className="px-4 py-3 text-right text-white">{t("cierre.historyCard")}</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell text-white">{t("cierre.historyTransfer")}</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell text-white">{t("cierre.historyCashier")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    // Group by date
                    const grouped: { [date: string]: typeof history } = {};
                    history.forEach((c) => {
                      if (!grouped[c.closing_date]) {
                        grouped[c.closing_date] = [];
                      }
                      grouped[c.closing_date].push(c);
                    });

                    const rows: React.ReactNode[] = [];
                    Object.entries(grouped).reverse().forEach(([date, closings]) => {
                      // Add rows for each closing on this date, sorted by time (newest first)
                      closings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).forEach((c) => {
                        rows.push(
                          <tr
                            key={c.id}
                            onClick={() => {
                              setSelectedDate(c.closing_date);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="hover:bg-blue-50 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900">{fmtLocalDate(c.closing_date)}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(c.created_at).toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                              {c.notes && <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{c.notes}</p>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <p className="font-mono font-semibold text-slate-700">{fmt(c.system_cash)}</p>
                              <p className={`font-mono text-xs font-semibold ${
                                Math.abs(c.diff_cash) < 0.01 ? "text-green-700" : 
                                c.diff_cash < 0 ? "text-red-600" : "text-blue-700"
                              }`}>
                                {c.diff_cash >= 0 ? "+" : ""}{fmt(c.diff_cash)}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <p className="font-mono font-semibold text-slate-700">{fmt(c.system_card)}</p>
                              <p className={`font-mono text-xs font-semibold ${
                                Math.abs(c.diff_card) < 0.01 ? "text-green-700" : 
                                c.diff_card < 0 ? "text-red-600" : "text-blue-700"
                              }`}>
                                {c.diff_card >= 0 ? "+" : ""}{fmt(c.diff_card)}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right hidden md:table-cell">
                              <p className="font-mono font-semibold text-slate-700">{fmt(c.system_transfer)}</p>
                              <p className={`font-mono text-xs font-semibold ${
                                Math.abs(c.diff_transfer) < 0.01 ? "text-green-700" : 
                                c.diff_transfer < 0 ? "text-red-600" : "text-blue-700"
                              }`}>
                                {c.diff_transfer >= 0 ? "+" : ""}{fmt(c.diff_transfer)}
                              </p>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-sm text-slate-500">
                              {c.closed_by ?? "—"}
                            </td>
                          </tr>
                        );
                      });

                      // Add subtotal row for this date
                      const dayTotal = closings.reduce((sum, c) => sum + c.system_total, 0);
                      const dayCash = closings.reduce((sum, c) => sum + c.system_cash, 0);
                      const dayCard = closings.reduce((sum, c) => sum + c.system_card, 0);
                      const dayTransfer = closings.reduce((sum, c) => sum + c.system_transfer, 0);
                      rows.push(
                        <tr key={`subtotal-${date}`} className="border-t-2 border-slate-300 bg-slate-50">
                          <td className="px-4 py-2 text-left font-bold text-slate-700">
                            {t("cierre.historyDayTotal").replace("{{date}}", fmtLocalDate(date))}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-800">
                            {fmt(dayCash)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-800">
                            {fmt(dayCard)}
                          </td>
                          <td className="px-4 py-2 text-right hidden md:table-cell font-mono font-bold text-slate-800">
                            {fmt(dayTransfer)}
                          </td>
                          <td className="hidden md:table-cell"></td>
                        </tr>
                      );
                    });

                    return rows;
                  })()}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </Section>
    </Container>
  );
}
