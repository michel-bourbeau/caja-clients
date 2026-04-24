"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Container, Section, Alert } from "@/components/StripeUIComponents";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { toNicaraguaDateString } from "@/lib/utils/formatters";
import { useAuth } from "@/context/AuthContext";

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
  diff_cash: number;
  diff_card: number;
  notes: string | null;
  closed_by: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DiffBadge({ diff }: { diff: number }) {
  const abs = Math.abs(diff);
  if (abs < 0.01) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Cuadrado
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
        ▲ Sobrante
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
      ▼ Faltante
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
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
  useEffect(() => {
    if (!tenantId || !selectedDate) return;
    setLoadingTotals(true);
    fetch(`/api/tenants/${tenantId}/cash-closings?date=${selectedDate}&preview`)
      .then((r) => r.json())
      .then((data) => setSystemTotals(data))
      .catch(() => setSystemTotals(null))
      .finally(() => setLoadingTotals(false));
  }, [tenantId, selectedDate]);

  // ── load existing saved closing for selected date ──
  useEffect(() => {
    if (!tenantId || !selectedDate) return;
    setLoadingCurrent(true);
    fetch(`/api/tenants/${tenantId}/cash-closings?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        setCurrent(data);
        if (data) {
          setDeclaredCash(String(data.declared_cash));
          setDeclaredCard(String(data.declared_card));
          setNotes(data.notes ?? "");
        } else {
          setDeclaredCash("");
          setDeclaredCard("");
          setNotes("");
        }
      })
      .catch(() => setCurrent(null))
      .finally(() => setLoadingCurrent(false));
  }, [tenantId, selectedDate]);

  // ── computed live diff (uses systemTotals — available even before saving) ──
  const preview = useMemo(() => {
    if (!systemTotals) return null;
    const dCash = parseFloat(declaredCash) || 0;
    const dCard = parseFloat(declaredCard) || 0;
    return {
      diff_cash: dCash - systemTotals.system_cash,
      diff_card: dCard - systemTotals.system_card,
    };
  }, [systemTotals, declaredCash, declaredCard]);

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
          notes: notes.trim() || null,
          closed_by: user ? `${user.firstName} ${user.lastName}`.trim() : null,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setCurrent(saved);
        setFormMessage({ type: "success", text: "✓ Cierre registrado exitosamente" });
        loadHistory();
        setTimeout(() => setFormMessage(null), 4000);
      } else {
        const err = await res.json();
        setFormMessage({ type: "error", text: err.error || "Error al guardar" });
      }
    } catch {
      setFormMessage({ type: "error", text: "Error de red" });
    } finally {
      setSaving(false);
    }
  };

  // ── print ──
  const handlePrint = () => {
    if (!systemTotals) return;
    const dCash = parseFloat(declaredCash) || (current?.declared_cash ?? 0);
    const dCard = parseFloat(declaredCard) || (current?.declared_card ?? 0);
    const diffCash = dCash - systemTotals.system_cash;
    const diffCard = dCard - systemTotals.system_card;

    const win = window.open("", "_blank", "width=420,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Cierre de Caja — ${selectedDate}</title>
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
        <h1>CIERRE DE CAJA</h1>
        <p class="center">${fmtLocalDate(selectedDate)}</p>
        ${current && current.closed_by ? `<p class="center">Cajero: ${current.closed_by}</p>` : ""}
        <div class="divider"></div>

        <p class="section-title">Ventas del sistema</p>
        <div class="row"><span>Efectivo</span><span>${fmt(systemTotals.system_cash)}</span></div>
        <div class="row"><span>Tarjeta</span><span>${fmt(systemTotals.system_card)}</span></div>
        <div class="row"><span>Transferencia</span><span>${fmt(systemTotals.system_transfer)}</span></div>
        <div class="row bold"><span>TOTAL SISTEMA</span><span>${fmt(systemTotals.system_total)}</span></div>

        <div class="divider"></div>

        <p class="section-title">Declarado por cajero</p>
        <div class="row"><span>Efectivo contado</span><span>${fmt(dCash)}</span></div>
        <div class="row"><span>Reporte tarjeta</span><span>${fmt(dCard)}</span></div>

        <div class="divider"></div>

        <p class="section-title">Diferencias</p>
        <div class="row">
          <span>Efectivo</span>
          <span class="${Math.abs(diffCash) < 0.01 ? "diff-ok" : diffCash < 0 ? "diff-bad" : "diff-over"}">
            ${diffCash >= 0 ? "+" : ""}${fmt(diffCash)}
            ${Math.abs(diffCash) < 0.01 ? "✓" : diffCash < 0 ? "⚠ FALTANTE" : "▲ SOBRANTE"}
          </span>
        </div>
        <div class="row">
          <span>Tarjeta</span>
          <span class="${Math.abs(diffCard) < 0.01 ? "diff-ok" : diffCard < 0 ? "diff-bad" : "diff-over"}">
            ${diffCard >= 0 ? "+" : ""}${fmt(diffCard)}
            ${Math.abs(diffCard) < 0.01 ? "✓" : diffCard < 0 ? "⚠ FALTANTE" : "▲ SOBRANTE"}
          </span>
        </div>

        ${current && current.notes ? `<div class="notes">Notas: ${current.notes}</div>` : ""}

        <div class="divider"></div>
        <p class="center" style="font-size:10px;color:#555;">Impreso ${new Date().toLocaleString("es-NI")}</p>
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
          <h1 className="text-3xl font-bold text-slate-900">Cierre de Caja</h1>
          <p className="text-slate-600 mt-2 text-sm">
            {isManager
              ? "Reconciliación diaria — compara las ventas registradas con el efectivo contado y el reporte de la terminal de pago."
              : "Cuenta el efectivo de la caja e ingresa el total del reporte de la terminal. No se muestran los montos del sistema hasta que un administrador revise el cierre."}
          </p>
        </div>

        {/* Main form card */}
        <Card>

          {/* Card header — date selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50 -m-6 mb-0 rounded-t-lg">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Fecha de cierre</p>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">
              {loadingCurrent ? "Cargando..." : current ? "Cierre ya registrado — puede actualizar" : "Sin cierre para esta fecha"}
            </p>
            {current && (
              <p className="text-xs text-slate-400 mt-0.5">
                Cerrado por <strong>{current.closed_by ?? "—"}</strong>
              </p>
            )}
          </div>
        </div>

        <div className={`p-6 grid grid-cols-1 gap-6 ${isManager ? "lg:grid-cols-2" : ""}`}>

          {/* Left: System totals — MANAGER ONLY (blind count security) */}
          {isManager && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">
                Ventas del Sistema
              </h2>
              {loadingTotals ? (
                <div className="space-y-2 animate-pulse">
                  {[1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg" />)}
                </div>
              ) : systemTotals && systemTotals.tx_count > 0 ? (
                <div className="space-y-2">
                  {[
                    { label: "Efectivo (CASH)", value: systemTotals.system_cash, color: "text-green-700", bg: "bg-green-50 border-green-200" },
                    { label: "Tarjeta (CARD)", value: systemTotals.system_card, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
                    { label: "Transferencia", value: systemTotals.system_transfer, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`flex justify-between items-center px-4 py-2.5 rounded-lg border ${bg}`}>
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                      <span className={`text-sm font-bold ${color}`}>{fmt(value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-4 py-3 rounded-lg border border-slate-300 bg-slate-100">
                    <span className="text-sm font-bold text-slate-800">TOTAL SISTEMA</span>
                    <span className="text-base font-bold text-slate-900">{fmt(systemTotals.system_total)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Basado en {systemTotals.tx_count} transacción{systemTotals.tx_count !== 1 ? "es" : ""} completada{systemTotals.tx_count !== 1 ? "s" : ""} el {fmtLocalDate(selectedDate)}.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
                  <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M9 17H5a2 2 0 01-2-2V9a2 2 0 012-2h14a2 2 0 012 2v6a2 2 0 01-2 2h-4M9 17h6" />
                  </svg>
                  <p className="text-sm text-slate-500">No hay ventas registradas<br />para esta fecha.</p>
                </div>
              )}
            </div>
          )}

          {/* Right: Cashier declaration — always visible */}
          <div className={isManager ? "" : "max-w-lg mx-auto w-full"}>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">
              Declaración del Cajero
            </h2>
            {/* Blind count notice for cashiers */}
            {!isManager && (
              <div className="flex items-start gap-3 px-4 py-3 mb-4 rounded-lg bg-amber-50 border border-amber-200">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <p className="text-sm text-amber-800">
                  <strong>Conteo a ciegas:</strong> los totales del sistema no son visibles para ti. Cuenta el efectivo y revisa tu terminal de tarjeta de forma independiente.
                </p>
              </div>
            )}
            <div className="space-y-4">

              {/* Cash */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  💵 Efectivo contado físicamente
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={declaredCash}
                  onChange={(e) => setDeclaredCash(e.target.value)}
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
                        ? "✓ Cuadra con el sistema"
                        : preview.diff_cash < 0
                        ? `⚠ Faltante: ${fmt(Math.abs(preview.diff_cash))}`
                        : `▲ Sobrante: ${fmt(preview.diff_cash)}`}
                    </span>
                    <span className="font-mono">Sistema: {fmt(systemTotals.system_cash)}</span>
                  </div>
                )}
              </div>

              {/* Card */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  💳 Total del reporte de la terminal de tarjeta
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={declaredCard}
                  onChange={(e) => setDeclaredCard(e.target.value)}
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
                        ? "✓ Cuadra con el sistema"
                        : preview.diff_card < 0
                        ? `⚠ Faltante: ${fmt(Math.abs(preview.diff_card))}`
                        : `▲ Sobrante: ${fmt(preview.diff_card)}`}
                    </span>
                    <span className="font-mono">Sistema: {fmt(systemTotals.system_card)}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones, explicación de diferencias..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Actions */}
              {formMessage && (
                <Alert
                  variant={formMessage.type === "success" ? "success" : "error"}
                  title={formMessage.type === "success" ? "Éxito" : "Error"}
                >
                  {formMessage.text}
                </Alert>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? "Guardando..." : current ? "Actualizar Cierre" : "Registrar Cierre"}
                </Button>
                {/* Print — MANAGER ONLY (report contains system totals) */}
                {isManager && systemTotals && (
                  <Button
                    variant="secondary"
                    onClick={handlePrint}
                    title="Imprimir reporte"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                { label: "Efectivo", diff: preview.diff_cash },
                { label: "Tarjeta", diff: preview.diff_card },
              ].map(({ label, diff }) => (
                <div key={label} className="text-center">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">{label}</p>
                  <DiffBadge diff={diff} />
                  <p className={`text-sm font-bold mt-1 ${
                    Math.abs(diff) < 0.01 ? "text-green-700" : diff < 0 ? "text-red-600" : "text-blue-700"
                  }`}>
                    {diff >= 0 ? "+" : ""}{fmt(diff)}
                  </p>
                </div>
              ))}
              <div className="text-center col-span-2 sm:col-span-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Total Sistema</p>
                <p className="text-lg font-bold text-slate-900">{fmt(systemTotals.system_total)}</p>
              </div>
            </div>
          )}
        </Card>

        {/* History */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4">Historial de Cierres</h2>
          {loadingHistory ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
              <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm text-slate-500">Sin cierres registrados aún.</p>
            </div>
          ) : (
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-800 text-white text-xs font-semibold uppercase tracking-wide">
                    <th className="px-4 py-3 text-left text-white">Fecha</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell text-white">Total Sistema</th>
                    {isManager && <th className="px-4 py-3 text-center text-white">Efectivo</th>}
                    {isManager && <th className="px-4 py-3 text-center text-white">Tarjeta</th>}
                    <th className="px-4 py-3 text-left hidden md:table-cell text-white">Cajero</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((c) => (
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
                        {c.notes && <p className="text-xs text-slate-400 truncate max-w-xs">{c.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell font-mono font-semibold text-slate-700">
                        {fmt(c.system_total)}
                      </td>
                      {isManager && (
                        <td className="px-4 py-3 text-center">
                          <DiffBadge diff={c.diff_cash} />
                        </td>
                      )}
                      {isManager && (
                        <td className="px-4 py-3 text-center">
                          <DiffBadge diff={c.diff_card} />
                        </td>
                      )}
                      <td className="px-4 py-3 hidden md:table-cell text-sm text-slate-500">
                        {c.closed_by ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </Section>
    </Container>
  );
}
