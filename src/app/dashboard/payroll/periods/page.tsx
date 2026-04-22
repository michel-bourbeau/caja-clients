"use client";

import { useState, useEffect, useCallback } from "react";
import { useTenantId } from "@/lib/utils/tenant";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FREQ_LABEL: Record<string, string> = {
  weekly:   "Semanal",
  biweekly: "Bisemanal",
  monthly:  "Mensual",
};

const WEEK_DAYS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

// ─── Component ────────────────────────────────────────────────────────────────

function PayrollPeriodsContent() {
  const tenantId = useTenantId();

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
      if (!res.ok) throw new Error("Error cargando configuracion");
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
      if (!res.ok) throw new Error("Error guardando configuracion");
      const data = await res.json();
      setConfig(data);
      // Reload periods after config change
      await loadData();
    } catch (e) {
      console.error(e);
      alert("Error guardando configuración: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Períodos de Pago</h1>
        <p className="text-sm text-slate-500 mt-2">
          Gestiona los períodos de pago y su configuración
        </p>
      </div>

      {/* Configuration Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Configuración de Períodos</h2>
        
        <div className="space-y-4 max-w-md">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Frecuencia
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              <option value="weekly">Semanal</option>
              <option value="biweekly">Bisemanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>

          {/* Week Start Day */}
          {(frequency === "weekly" || frequency === "biweekly") && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Día de inicio de semana
              </label>
              <select
                value={weekStartDay}
                onChange={(e) => setWeekStartDay(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
              >
                {WEEK_DAYS.map((day, idx) => (
                  <option key={idx} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month Start Day */}
          {frequency === "monthly" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Día de inicio de mes
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
            {saving ? "Guardando..." : "Guardar Configuración"}
          </button>
        </div>
      </div>

      {/* Periods List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">Períodos</h2>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-400 text-sm">Cargando períodos...</div>
        ) : periods.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <p className="text-lg mb-2">📅</p>
            <p>No hay períodos configurados</p>
            <p className="text-xs mt-2">Guarda la configuración para generar períodos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 text-left">Período</th>
                  <th className="px-6 py-3 text-left">Fecha Inicio</th>
                  <th className="px-6 py-3 text-left">Fecha Fin</th>
                  <th className="px-6 py-3 text-center">Estado</th>
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
                          ● Actual
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
