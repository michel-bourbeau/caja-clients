"use client";

import { useState, useEffect, useCallback } from "react";
import { useTenantId } from "@/lib/utils/tenant";
import { useLanguage } from "@/context/LanguageContext";
import { FeatureGuard } from "@/components/FeatureGuard";
import { DashboardHeader, PageIcon } from "@/components";
import { PayrollConfig, PeriodInfo } from "@/lib/types";

// ─── Component ────────────────────────────────────────────────────────────────

function PayrollPeriodsContent() {
  const tenantId = useTenantId();
  const { t } = useLanguage();

  const [config, setConfig] = useState<PayrollConfig | null>(null);
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [weekStartDay, setWeekStartDay] = useState(0);
  const [monthStartDay, setMonthStartDay] = useState(1);
  const [saving, setSaving] = useState(false);

  // Load config + periods on mount
  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/payroll`);
      if (!res.ok) throw new Error(t("payroll.periods.errorLoad"));
      const data = await res.json();
      setConfig(data.config);
      setPeriods(data.periods ?? []);
      if (data.config) {
        setFrequency(data.config.frequency);
        setWeekStartDay(data.config.weekStartDay);
        setMonthStartDay(data.config.monthStartDay);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save configuration
  const saveConfig = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/payroll/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frequency,
          weekStartDay,
          monthStartDay,
        }),
      });
      if (!res.ok) throw new Error(t("payroll.periods.errorSave"));
      const data = await res.json();
      setConfig(data);
      // Reload periods after config change
      await loadData();
    } catch (e) {
      console.error(e);
      alert(t("payroll.periods.errorSave") + ": " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <DashboardHeader
        pageType="periods"
        title={t("payroll.periods.title")}
        subtitle={t("payroll.periods.subtitle")}
      />

      {/* Configuration Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t("payroll.periods.configTitle")}</h2>
        
        <div className="space-y-4 max-w-md">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t("payroll.periods.freqLabel")}
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              <option value="weekly">{t("payroll.freqWeekly")}</option>
              <option value="biweekly">{t("payroll.freqBiweekly")}</option>
              <option value="monthly">{t("payroll.freqMonthly")}</option>
            </select>
          </div>

          {/* Week Start Day */}
          {(frequency === "weekly" || frequency === "biweekly") && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t("payroll.periods.weekStartLabel")}
              </label>
              <select
                value={weekStartDay}
                onChange={(e) => setWeekStartDay(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
              >
                {[0,1,2,3,4,5,6].map((idx) => (
                  <option key={idx} value={idx}>
                    {t(`payroll.weekDay${idx}`)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month Start Day */}
          {frequency === "monthly" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t("payroll.periods.monthStartLabel")}
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={monthStartDay}
                onChange={(e) => setMonthStartDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          )}

          <button
            onClick={saveConfig}
            disabled={saving}
            className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
          >
            {saving ? t("payroll.periods.saving") : t("payroll.periods.saveBtn")}
          </button>
        </div>
      </div>

      {/* Periods List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">{t("payroll.periods.periodsTitle")}</h2>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-400 text-sm">{t("payroll.periods.loading")}</div>
        ) : periods.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <p className="text-lg mb-2">📅</p>
            <p>{t("payroll.periods.empty")}</p>
            <p className="text-xs mt-2">{t("payroll.periods.emptySub")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 text-left">{t("payroll.periods.colPeriod")}</th>
                  <th className="px-6 py-3 text-left">{t("payroll.periods.colStart")}</th>
                  <th className="px-6 py-3 text-left">{t("payroll.periods.colEnd")}</th>
                  <th className="px-6 py-3 text-center">{t("payroll.periods.colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map((period) => (
                  <tr
                    key={period.id}
                    className={`transition-colors ${
                      period.isCurrent ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">{period.label}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(period.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(period.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {period.isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                          ● {t("payroll.periods.current")}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Los períodos se generan automáticamente según la configuración de frecuencia.
        Cambia la frecuencia para generar nuevos períodos.
      </p>
    </div>
  );
}

export default function PayrollPeriodsPage() {
  return (
    <FeatureGuard feature="payroll">
      <PayrollPeriodsContent />
    </FeatureGuard>
  );
}
