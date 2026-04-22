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

interface PeriodPayment {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  hours_worked: number;
  hourly_rate: number;
  amount: number;
  notes: string | null;
  paid_at: string;
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
  const [periodPayments, setPeriodPayments] = useState<PeriodPayment[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);   // employeeId being paid
  const [payingAll, setPayingAll] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // paymentId

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
      const current = (data.periods as PeriodInfo[]).find((p) => p.isCurrent) ?? data.periods[0];
      if (current) setSelectedPeriod(current);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPeriods(false);
    }
  }, [tenantId]);

  useEffect(() => { loadPeriods(); }, [loadPeriods]);

  // Load employee hours + existing payments when period is selected
  const loadPeriodData = useCallback(async (period: PeriodInfo) => {
    if (!tenantId) return;
    setLoadingSummary(true);
    setSummary([]);
    setPeriodPayments([]);
    setDeleteConfirm(null);
    try {
      const [summaryRes, paymentsRes] = await Promise.all([
        fetch(`/api/tenants/${tenantId}/payroll?from=${period.startDate}&to=${period.endDate}`),
        fetch(`/api/tenants/${tenantId}/payroll/payments?from=${period.startDate}&to=${period.endDate}`),
      ]);
      const summaryData = await summaryRes.json();
      const paymentsData = await paymentsRes.json();
      setSummary(summaryData.summary ?? []);
      setPeriodPayments(Array.isArray(paymentsData) ? paymentsData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSummary(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (selectedPeriod) loadPeriodData(selectedPeriod);
  }, [selectedPeriod, loadPeriodData]);

  // Pay a single employee
  const payEmployee = async (emp: EmployeeSummary) => {
    if (!tenantId || !selectedPeriod) return;
    setPayingId(emp.employeeId);
    try {
      const unpaidInfo = getUnpaidInfo(emp);
      // For partial payments, only send unpaid hours
      const hoursToPayNow = unpaidInfo.isPartial ? unpaidInfo.unpaidHours : emp.hoursWorked;
      const amountToPayNow = unpaidInfo.isPartial ? unpaidInfo.unpaidAmount : emp.salaryDue;
      
      const res = await fetch(`/api/tenants/${tenantId}/employees/${emp.employeeId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: selectedPeriod.startDate,
          periodEnd:   selectedPeriod.endDate,
          hoursWorked: hoursToPayNow,
          hourlyRate:  emp.hourlyRate,
          amount:      amountToPayNow,
          notes:       unpaidInfo.isPartial ? `Pago adicional de ${fmtHours(hoursToPayNow)} nuevas horas` : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const newPay: PeriodPayment = await res.json();
      setPeriodPayments((prev) => [...prev, newPay]);
      // Refresh the summary to get updated hours
      if (selectedPeriod) loadPeriodData(selectedPeriod);
    } catch (e) {
      console.error(e);
    } finally {
      setPayingId(null);
    }
  };

  // Pay all unpaid employees in one go
  const payAll = async () => {
    if (!tenantId || !selectedPeriod) return;
    const unpaid = summary.filter((emp) => {
      const info = getUnpaidInfo(emp);
      return info.unpaidAmount > 0;
    });
    if (unpaid.length === 0) return;
    setPayingAll(true);
    try {
      await Promise.all(unpaid.map((emp) => payEmployee(emp)));
    } finally {
      setPayingAll(false);
    }
  };

  // Delete / undo a payment
  const deletePayment = async (payment: PeriodPayment) => {
    if (!tenantId) return;
    await fetch(`/api/tenants/${tenantId}/employees/${payment.employee_id}/payments/${payment.id}`, {
      method: "DELETE",
    });
    setPeriodPayments((prev) => prev.filter((p) => p.id !== payment.id));
    setDeleteConfirm(null);
  };

  // Calculate unpaid amounts (considering new hours added after payment)
  const getUnpaidInfo = (emp: EmployeeSummary) => {
    const payment = periodPayments.find((p) => p.employee_id === emp.employeeId);
    if (!payment) {
      return { unpaidHours: emp.hoursWorked, unpaidAmount: emp.salaryDue, isPartial: false };
    }
    // Hours/amount paid already
    const paidHours = payment.hours_worked;
    const paidAmount = payment.amount;
    // New hours added after payment
    const unpaidHours = Math.max(0, emp.hoursWorked - paidHours);
    const unpaidAmount = Math.round(unpaidHours * emp.hourlyRate * 100) / 100;
    return { unpaidHours, unpaidAmount, isPartial: unpaidHours > 0 };
  };

  const totalSalaryDue  = summary.reduce((acc, e) => acc + e.salaryDue, 0);
  const totalHours      = summary.reduce((acc, e) => acc + e.hoursWorked, 0);
  const totalPaid       = periodPayments.reduce((acc, p) => acc + p.amount, 0);
  const totalUnpaid     = summary.reduce((acc, e) => acc + getUnpaidInfo(e).unpaidAmount, 0);
  const unpaidCount     = summary.filter(
    (e) => {
      const info = getUnpaidInfo(e);
      return info.unpaidAmount > 0;
    }
  ).length;

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

      {/* ── Period navigator ──────────────────────────────────────────────── */}
      {!loadingPeriods && periods.length > 0 && (() => {
        const idx = selectedPeriod ? periods.findIndex((p) => p.id === selectedPeriod.id) : 0;
        const canPrev = idx < periods.length - 1;
        const canNext = idx > 0;
        return (
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => canPrev && setSelectedPeriod(periods[idx + 1])}
              disabled={!canPrev}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Periodo anterior"
            >
              <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <select
              value={selectedPeriod?.id ?? ""}
              onChange={(e) => {
                const p = periods.find((p) => p.id === e.target.value);
                if (p) setSelectedPeriod(p);
              }}
              className="flex-1 px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}{p.isCurrent ? " (actual)" : ""}
                </option>
              ))}
            </select>

            <button
              onClick={() => canNext && setSelectedPeriod(periods[idx - 1])}
              disabled={!canNext}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Periodo siguiente"
            >
              <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        );
      })()}

      {selectedPeriod && (
        <div className="flex flex-col gap-4">
          {/* Period stats + pay-all */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              {!loadingSummary && summary.length > 0 && (
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-slate-500">Total horas</p>
                    <p className="text-xl font-bold text-slate-900">{fmtHours(totalHours)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total a pagar</p>
                    <p className="text-xl font-bold text-slate-700">{fmt(totalSalaryDue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pagado</p>
                    <p className="text-xl font-bold text-emerald-600">{fmt(totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pendiente</p>
                    <p className="text-xl font-bold text-amber-600">{fmt(totalUnpaid)}</p>
                  </div>
                </div>
              )}
              {!loadingSummary && unpaidCount > 0 && (
                <button
                  onClick={payAll}
                  disabled={payingAll}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  {payingAll ? "Pagando..." : `✓ Pagar todos (${unpaidCount})`}
                </button>
              )}
            </div>
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
                    <th className="px-5 py-3 text-right">Horas</th>
                    <th className="px-5 py-3 text-right">Tarifa/h</th>
                    <th className="px-5 py-3 text-right font-bold text-slate-700">A pagar</th>
                    <th className="px-5 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.map((emp) => {
                    const payment = periodPayments.find((p) => p.employee_id === emp.employeeId);
                    const unpaidInfo = getUnpaidInfo(emp);
                    const isPayingThis = payingId === emp.employeeId;
                    const isPaid = unpaidInfo.unpaidAmount === 0 && payment;
                    const isPartiallyPaid = unpaidInfo.isPartial;
                    return (
                      <tr key={emp.employeeId}
                        className={`transition-colors ${
                          isPaid ? "bg-emerald-50 hover:bg-emerald-100" :
                          isPartiallyPaid ? "bg-amber-50 hover:bg-amber-100" :
                          emp.hoursWorked === 0 ? "opacity-40 hover:opacity-60" :
                          "hover:bg-slate-50"
                        }`}>
                        <td className="px-5 py-3">
                          <span className="font-semibold text-slate-900">{emp.firstName} {emp.lastName}</span>
                          {emp.hasOpenShift && (
                            <span className="ml-2 text-xs text-amber-600 font-medium">turno abierto</span>
                          )}
                          {payment?.notes && (
                            <p className="text-xs text-slate-400 mt-0.5">{payment.notes}</p>
                          )}
                          {isPartiallyPaid && (
                            <p className="text-xs text-amber-600 font-semibold mt-0.5">
                              💡 +{fmtHours(unpaidInfo.unpaidHours)} nuevas horas por pagar
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-700 font-medium">
                          {emp.hoursWorked > 0 ? fmtHours(emp.hoursWorked) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-500">
                          {emp.hourlyRate > 0 ? fmt(emp.hourlyRate) : <span className="text-red-400 text-xs">Sin tarifa</span>}
                        </td>
                        <td className="px-5 py-3 text-right font-bold">
                          <div className="text-slate-900">{emp.salaryDue > 0 ? fmt(emp.salaryDue) : <span className="text-slate-300">—</span>}</div>
                          {isPartiallyPaid && (
                            <div className="text-amber-600 font-bold text-sm">{fmt(unpaidInfo.unpaidAmount)}</div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                                ✓ Pagado
                              </span>
                              {deleteConfirm === payment.id ? (
                                <span className="inline-flex gap-1">
                                  <button onClick={() => deletePayment(payment)} className="text-xs text-red-600 font-semibold hover:underline">Anular</button>
                                  <button onClick={() => setDeleteConfirm(null)} className="text-xs text-slate-400 hover:underline">No</button>
                                </span>
                              ) : (
                                <button onClick={() => setDeleteConfirm(payment.id)} className="text-xs text-slate-300 hover:text-red-400 transition-colors" title="Anular pago">↩</button>
                              )}
                            </span>
                          ) : isPartiallyPaid && payment ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                                ⚠ Pago Parcial
                              </span>
                              <button
                                onClick={() => payEmployee(emp)}
                                disabled={isPayingThis || payingAll}
                                className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                              >
                                {isPayingThis ? "..." : `Pagar ${fmt(unpaidInfo.unpaidAmount)}`}
                              </button>
                              {deleteConfirm === payment.id ? (
                                <span className="inline-flex gap-1">
                                  <button onClick={() => deletePayment(payment)} className="text-xs text-red-600 font-semibold hover:underline">Anular</button>
                                  <button onClick={() => setDeleteConfirm(null)} className="text-xs text-slate-400 hover:underline">No</button>
                                </span>
                              ) : (
                                <button onClick={() => setDeleteConfirm(payment.id)} className="text-xs text-slate-300 hover:text-red-400 transition-colors" title="Anular pago">↩</button>
                              )}
                            </span>
                          ) : emp.salaryDue > 0 ? (
                            <button
                              onClick={() => payEmployee(emp)}
                              disabled={isPayingThis || payingAll}
                              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                            >
                              {isPayingThis ? "..." : "Pagar"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {summary.length > 1 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td className="px-5 py-3 text-sm font-bold text-slate-700" colSpan={2}>Total</td>
                      <td></td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900 text-base">
                        <div>{fmt(totalSalaryDue)}</div>
                        {totalUnpaid > 0 && <div className="text-amber-600 text-sm font-bold">{fmt(totalUnpaid)} pendiente</div>}
                      </td>
                      <td className="px-5 py-3 text-center text-xs text-emerald-700 font-semibold">
                        {unpaidCount > 0 && <div className="text-amber-600 font-bold">{unpaidCount} con pagos pendientes</div>}
                        {periodPayments.length > 0 && `${periodPayments.length}/${summary.filter(e => e.salaryDue > 0).length} pagados`}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          <p className="text-xs text-slate-400">
            * Calculo basado en tarifa por hora × horas registradas en asistencia.
            Las entradas sin hora de salida no se incluyen. Los pagos quedan registrados en el historial
            de cada empleado y se usan para calcular vacaciones y 13° mes.
          </p>
        </div>
      )}
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