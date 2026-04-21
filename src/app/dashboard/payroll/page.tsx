"use client";

import { useState, useEffect, useCallback } from "react";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { FeatureGuard } from "@/components/FeatureGuard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayrollConfig {
  frequency: "weekly" | "biweekly" | "monthly";
  weekStartDay: number;
  monthStartDay: number;
}

interface PeriodInfo {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
  isCurrent: boolean;
}

interface EmployeeSummary {
  employeeId: string;
  firstName: string;
  lastName: string;
  hourlyRate: number;
  hoursWorked: number;
  shiftsCount: number;
  salaryDue: number;
  hasOpenShift: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FREQ_LABEL: Record<string, string> = {
  weekly:   "Semanal",
  biweekly: "Bisemanal",
  monthly:  "Mensual",
};

const WEEK_DAYS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function fmtHours(h: number): string {
  const hrs = Math.floor(h);
  const min = Math.round((h - hrs) * 60);
  if (min === 0) return `${hrs}h`;
  return `${hrs}h ${String(min).padStart(2, "0")}m`;
}

// ─── Component ────────────────────────────────────────────────────────────────

function PayrollContent() {
  const tenantId = useTenantId();
  const { fmt } = useCurrency();

  const [config, setConfig]   = useState<PayrollConfig | null>(null);
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodInfo | null>(null);
  const [summary, setSummary] = useState<EmployeeSummary[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Load config + periods on mount
  const loadPeriods = useCallback(async () => {
    if (!tenantId) return;
    setLoadingPeriods(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/payroll`);
      if (!res.ok) throw new Error("Error cargando configuracion");
      const data = await res.json();
      setConfig(data.config);
      setPeriods(data.periods ?? []);
      // Auto-select current period
      const current = (data.periods as PeriodInfo[]).find((p) => p.isCurrent) ?? data.periods[0];
      if (current) setSelectedPeriod(current);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPeriods(false);
    }
  }, [tenantId]);

  useEffect(() => { loadPeriods(); }, [loadPeriods]);

  // Load employee summary when period is selected
  const loadSummary = useCallback(async (period: PeriodInfo) => {
    if (!tenantId) return;
    setLoadingSummary(true);
    setSummary([]);
    try {
      const url = `/api/tenants/${tenantId}/payroll?from=${period.startDate}&to=${period.endDate}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error cargando resumen");
      const data = await res.json();
      setSummary(data.summary ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSummary(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (selectedPeriod) loadSummary(selectedPeriod);
  }, [selectedPeriod, loadSummary]);

  const totalSalaryDue = summary.reduce((acc, e) => acc + e.salaryDue, 0);
  const totalHours     = summary.reduce((acc, e) => acc + e.hoursWorked, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nomina</h1>
          {config && (
            <p className="text-sm text-slate-500 mt-1">
              {FREQ_LABEL[config.frequency]}
              {(config.frequency === "weekly" || config.frequency === "biweekly") &&
                ` · inicia el ${WEEK_DAYS[config.weekStartDay]}`
              }
              {config.frequency === "monthly" &&
                ` · inicia el dia ${config.monthStartDay}`
              }
            </p>
          )}
        </div>
        <a
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 rounded-lg transition-colors"
        >
          ⚙️ Configurar frecuencia
        </a>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Period List ───────────────────────────────────────────────────── */}
        <div className="w-full lg:w-64 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 px-1">Periodos</p>
          {loadingPeriods ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {periods.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriod(p)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors border ${
                    selectedPeriod?.id === p.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <span className="block font-medium">{p.label}</span>
                  {p.isCurrent && (
                    <span className={`text-xs ${selectedPeriod?.id === p.id ? "text-blue-300" : "text-blue-600"}`}>
                      Periodo actual
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Period Detail ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {!selectedPeriod ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-3xl mb-2">📆</p>
              <p>Selecciona un periodo</p>
            </div>
          ) : (
            <>
              {/* Period header */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <p className="text-lg font-bold text-slate-900">{selectedPeriod.label}</p>
                <p className="text-sm text-slate-500">
                  {selectedPeriod.startDate} → {selectedPeriod.endDate}
                </p>
                {!loadingSummary && summary.length > 0 && (
                  <div className="flex gap-6 mt-3 pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500">Total horas</p>
                      <p className="text-xl font-bold text-slate-900">{fmtHours(totalHours)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total a pagar</p>
                      <p className="text-xl font-bold text-blue-700">{fmt(totalSalaryDue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Empleados</p>
                      <p className="text-xl font-bold text-slate-900">{summary.filter((e) => e.hoursWorked > 0).length} / {summary.length}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Employee table */}
              {loadingSummary ? (
                <div className="py-10 text-center text-slate-400 text-sm">Calculando horas...</div>
              ) : summary.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <p className="text-3xl mb-2">👥</p>
                  <p>No hay empleados activos</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3 text-left">Empleado</th>
                        <th className="px-5 py-3 text-right">Turnos</th>
                        <th className="px-5 py-3 text-right">Horas</th>
                        <th className="px-5 py-3 text-right">Tarifa/h</th>
                        <th className="px-5 py-3 text-right font-bold text-slate-700">A pagar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.map((emp) => (
                        <tr key={emp.employeeId} className={`hover:bg-slate-50 ${emp.hoursWorked === 0 ? "opacity-50" : ""}`}>
                          <td className="px-5 py-3">
                            <span className="font-semibold text-slate-900">
                              {emp.firstName} {emp.lastName}
                            </span>
                            {emp.hasOpenShift && (
                              <span className="ml-2 text-xs text-amber-600 font-medium">turno abierto</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-600">{emp.shiftsCount}</td>
                          <td className="px-5 py-3 text-right text-slate-700 font-medium">
                            {emp.hoursWorked > 0 ? fmtHours(emp.hoursWorked) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-500">
                            {emp.hourlyRate > 0 ? fmt(emp.hourlyRate) : <span className="text-red-400 text-xs">Sin tarifa</span>}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-slate-900">
                            {emp.salaryDue > 0 ? fmt(emp.salaryDue) : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {summary.length > 1 && (
                      <tfoot>
                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                          <td className="px-5 py-3 text-sm font-bold text-slate-700" colSpan={3}>Total</td>
                          <td></td>
                          <td className="px-5 py-3 text-right font-bold text-blue-700 text-base">{fmt(totalSalaryDue)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* Disclaimer */}
              <p className="mt-3 text-xs text-slate-400">
                * Calculo basado en tarifa por hora × horas registradas en asistencia.
                Las entradas sin hora de salida no se incluyen en el calculo.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PayrollPage() {
  return (
    <FeatureGuard feature="payroll">
      <PayrollContent />
    </FeatureGuard>
  );
}