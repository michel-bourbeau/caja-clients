"use client";

import { useState, useEffect, useCallback } from "react";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useLanguage } from "@/context/LanguageContext";
import { FeatureGuard } from "@/components/FeatureGuard";
import { Button, Container, Section } from "@/components/StripeUIComponents";
import { DashboardHeader } from "@/components";

// ─── Types ────────────────────────────────────────────────────────────────────

import { PayrollConfig, PeriodInfo } from "@/lib/types";
import { fmtHours } from "../_helpers";

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

// ─── Component ────────────────────────────────────────────────────────────────

function PayrollContent() {
  const tenantId = useTenantId();
  const { fmt } = useCurrency();
  const { t } = useLanguage();

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
      if (!res.ok) throw new Error(t("payroll.receipts.errorLoad"));
      const data = await res.json();
      setConfig(data.config);
      setPeriods(data.periods ?? []);
      const current = (data.periods as PeriodInfo[]).find((p) => p.isCurrent) ?? data.periods[0];
      if (current) setSelectedPeriod(current);
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
          notes: unpaidInfo.isPartial ? t("payroll.receipts.additionalPayNote", { hours: fmtHours(hoursToPayNow) }) : null,
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

  const payrollSubtitle = config
    ? `${
        config.frequency === "weekly" ? t("payroll.freqWeekly") :
        config.frequency === "biweekly" ? t("payroll.freqBiweekly") :
        t("payroll.freqMonthly")
      }${
        (config.frequency === "weekly" || config.frequency === "biweekly")
          ? ` \u00b7 ${t("payroll.receipts.startsOn")} ${t("payroll.weekDay" + config.weekStartDay)}`
          : config.frequency === "monthly"
          ? ` \u00b7 ${t("payroll.receipts.startsDay")} ${config.monthStartDay}`
          : ""
      }`
    : "";

  return (
    <Container>
      <Section>
        {/* Header */}
        <DashboardHeader
          pageType="payroll"
          title={t("payroll.receipts.title")}
          subtitle={payrollSubtitle}
        >
          <a href="/dashboard/settings">
            <Button variant="secondary">
              {t("payroll.receipts.configBtn")}
            </Button>
          </a>
        </DashboardHeader>

        {/* ── Period navigator ──────────────────────────────────────────────── */}
        {!loadingPeriods && periods.length > 0 && (() => {
          const idx = selectedPeriod ? periods.findIndex((p) => p.id === selectedPeriod.id) : 0;
          const canPrev = idx < periods.length - 1;
          const canNext = idx > 0;
          return (
            <div className="flex items-center gap-2 mb-6 w-full">
              <button
                onClick={() => canPrev && setSelectedPeriod(periods[idx + 1])}
                disabled={!canPrev}
                className="flex-shrink-0 p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <select
                value={selectedPeriod?.id ?? ""}
                onChange={(e) => {
                  const p = periods.find((p) => p.id === e.target.value);
                  if (p) setSelectedPeriod(p);
                }}
                className="flex-1 min-w-0 px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}{p.isCurrent ? ` ${t("payroll.receipts.currentLabel")}` : ""}
                  </option>
                ))}
              </select>

              <button
                onClick={() => canNext && setSelectedPeriod(periods[idx - 1])}
                disabled={!canNext}
                className="flex-shrink-0 p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          );
        })()}

        {selectedPeriod && (
          <div className="flex flex-col gap-4">
            {/* Period stats + pay-all */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                {!loadingSummary && summary.length > 0 && (
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-xs text-slate-600">{t("payroll.receipts.statsHours")}</p>
                      <p className="text-xl font-bold text-slate-900">{fmtHours(totalHours)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">{t("payroll.receipts.statsDue")}</p>
                      <p className="text-xl font-bold text-slate-900">{fmt(totalSalaryDue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">{t("payroll.receipts.statsPaid")}</p>
                      <p className="text-xl font-bold text-emerald-600">{fmt(totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">{t("payroll.receipts.statsPending")}</p>
                      <p className="text-xl font-bold text-amber-600">{fmt(totalUnpaid)}</p>
                    </div>
                  </div>
                )}
                {!loadingSummary && unpaidCount > 0 && (
                  <Button variant="primary" onClick={payAll} disabled={payingAll} className="shrink-0">
                    {payingAll ? "Pagando..." : `✓ Pagar todos (${unpaidCount})`}
                  </Button>
                )}
              </div>
            </div>

            {/* Employee table */}
            {loadingSummary ? (
              <div className="py-10 text-center text-slate-400 text-sm">{t("payroll.receipts.loadingHours")}</div>
            ) : summary.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <p className="text-3xl mb-2">👥</p>
                <p>{t("payroll.receipts.noEmployees")}</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-900 text-xs uppercase tracking-wide">
                      <th className="px-5 py-3 text-left text-white font-semibold">{t("payroll.receipts.colEmployee")}</th>
                      <th className="px-5 py-3 text-right text-white font-semibold">{t("payroll.receipts.colHours")}</th>
                      <th className="px-5 py-3 text-right text-white font-semibold">{t("payroll.receipts.colRate")}</th>
                      <th className="px-5 py-3 text-right font-bold text-white">{t("payroll.receipts.colDue")}</th>
                      <th className="px-5 py-3 text-center text-white font-semibold">{t("payroll.receipts.colStatus")}</th>
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
                              <span className="ml-2 text-xs text-amber-600 font-medium">{t("payroll.receipts.openShift")}</span>
                            )}
                            {payment?.notes && (
                              <p className="text-xs text-slate-400 mt-0.5">{payment.notes}</p>
                            )}
                            {isPartiallyPaid && (
                              <p className="text-xs text-amber-600 font-semibold mt-0.5">
                                {t("payroll.receipts.newHoursNote", { hours: fmtHours(unpaidInfo.unpaidHours) })}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-700 font-medium">
                            {emp.hoursWorked > 0 ? fmtHours(emp.hoursWorked) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-600">
                              {emp.hourlyRate > 0 ? fmt(emp.hourlyRate) : <span className="text-red-400 text-xs">{t("payroll.receipts.noRate")}</span>}
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
                                  {t("payroll.receipts.paid")}
                                </span>
                                {deleteConfirm === payment.id ? (
                                  <span className="inline-flex gap-1">
                                    <button onClick={() => deletePayment(payment)} className="text-xs text-red-600 font-semibold hover:underline">{t("payroll.receipts.annul")}</button>
                                    <button onClick={() => setDeleteConfirm(null)} className="text-xs text-slate-400 hover:underline">{t("payroll.receipts.no")}</button>
                                  </span>
                                ) : (
                                  <button onClick={() => setDeleteConfirm(payment.id)} className="text-xs text-slate-300 hover:text-red-400 transition-colors" title="Anular pago">↩</button>
                                )}
                              </span>
                            ) : isPartiallyPaid && payment ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                                  {t("payroll.receipts.partialPay")}
                                </span>
                                <Button variant="secondary" size="sm" onClick={() => payEmployee(emp)} disabled={isPayingThis || payingAll}>
                                  {isPayingThis ? t("payroll.receipts.loading2") : t("payroll.receipts.payAmount", { amount: fmt(unpaidInfo.unpaidAmount) })}
                                </Button>
                                {deleteConfirm === payment.id ? (
                                  <span className="inline-flex gap-1">
                                    <button onClick={() => deletePayment(payment)} className="text-xs text-red-600 font-semibold hover:underline">{t("payroll.receipts.annul")}</button>
                                    <button onClick={() => setDeleteConfirm(null)} className="text-xs text-slate-400 hover:underline">{t("payroll.receipts.no")}</button>
                                  </span>
                                ) : (
                                  <button onClick={() => setDeleteConfirm(payment.id)} className="text-xs text-slate-300 hover:text-red-400 transition-colors" title="Anular pago">↩</button>
                                )}
                              </span>
                            ) : emp.salaryDue > 0 ? (
                              <Button variant="primary" size="sm" onClick={() => payEmployee(emp)} disabled={isPayingThis || payingAll}>
                                {isPayingThis ? t("payroll.receipts.loading2") : t("payroll.receipts.pay")}
                              </Button>
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
                        <td className="px-5 py-3 text-sm font-bold text-slate-900" colSpan={2}>{t("payroll.receipts.footerTotal")}</td>
                        <td></td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900 text-base">
                          <div>{fmt(totalSalaryDue)}</div>
                          {totalUnpaid > 0 && <div className="text-amber-600 text-sm font-bold">{t("payroll.receipts.footerPending", { amount: fmt(totalUnpaid) })}</div>}
                        </td>
                        <td className="px-5 py-3 text-center text-xs text-emerald-700 font-semibold">
                          {unpaidCount > 0 && <div className="text-amber-600 font-bold">{t("payroll.receipts.pendingCount", { n: unpaidCount })}</div>}
                          {periodPayments.length > 0 && `${periodPayments.length}/${summary.filter(e => e.salaryDue > 0).length} ${t("payroll.receipts.statsPaid").toLowerCase()}`}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            <p className="text-xs text-slate-600">
              {t("payroll.receipts.legalNote")}
            </p>
          </div>
        )}
      </Section>
    </Container>
  );
}

export default function PayrollPage() {
  return (
    <FeatureGuard feature="payroll">
      <PayrollContent />
    </FeatureGuard>
  );
}