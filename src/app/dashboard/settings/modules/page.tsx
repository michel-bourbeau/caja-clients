"use client";

import { useState, useEffect } from "react";
import { useTenantId } from "@/lib/utils/tenant";
import { LoyaltyService } from "@/features/loyalty/services";

type ModuleKey = "pos" | "inventory" | "employees" | "schedules" | "payroll" | "reports" | "loyalty" | "expenses" | "settings";

interface ModuleConfig {
  enabled: boolean;
  name: string;
  icon: string;
  description: string;
}

interface LoyaltySettings {
  enabled: boolean;
  rewardThreshold: number;
  rewardType: string;
  rewardValue: number;
}

const MODULES: Record<ModuleKey, ModuleConfig> = {
  pos: {
    enabled: true,
    name: "Punto de Venta (POS)",
    icon: "🛒",
    description: "Sistema de ventas y caja",
  },
  inventory: {
    enabled: true,
    name: "Inventario",
    icon: "📦",
    description: "Gestión de productos y stock",
  },
  employees: {
    enabled: true,
    name: "Empleados",
    icon: "👥",
    description: "Gestión del personal",
  },
  schedules: {
    enabled: true,
    name: "Asistencia",
    icon: "🕐",
    description: "Control de horarios y asistencia",
  },
  payroll: {
    enabled: true,
    name: "Nómina",
    icon: "💰",
    description: "Cálculo de salarios",
  },
  reports: {
    enabled: true,
    name: "Reportes",
    icon: "📈",
    description: "Análisis y reportes",
  },
  loyalty: {
    enabled: true,
    name: "Fidelización",
    icon: "💳",
    description: "Programa de clientes fieles",
  },
  expenses: {
    enabled: true,
    name: "Gastos",
    icon: "💸",
    description: "Gestión de gastos y proveedores",
  },
  settings: {
    enabled: true,
    name: "Configuración",
    icon: "⚙️",
    description: "Configuración avanzada",
  },
};

export default function ModulesPage() {
  const tenantId = useTenantId();
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>(
    Object.fromEntries(Object.keys(MODULES).map((k) => [k, true])) as Record<ModuleKey, boolean>
  );
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>({
    enabled: true,
    rewardThreshold: 2000,
    rewardType: "DISCOUNT_PERCENT",
    rewardValue: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load modules and loyalty settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!tenantId) return;
      try {
        // Load modules
        const featuresRes = await fetch(`/api/tenants/${tenantId}/features`);
        if (featuresRes.ok) {
          const data = await featuresRes.json();
          setModules(data.features || {});
        }

        // Load loyalty settings
        try {
          const loyaltyRes = await fetch(`/api/tenants/${tenantId}/loyalty/settings`);
          if (loyaltyRes.ok) {
            const loyaltyData = await loyaltyRes.json();
            setLoyaltySettings({
              enabled: loyaltyData.enabled ?? true,
              rewardThreshold: loyaltyData.reward_threshold ?? 2000,
              rewardType: loyaltyData.reward_type ?? "DISCOUNT_PERCENT",
              rewardValue: loyaltyData.reward_value ?? 10,
            });
          }
        } catch (err) {

        }
      } catch (err) {
        console.error("Error loading settings:", err);
        setMessage({ type: "error", text: "Error al cargar configuración" });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [tenantId]);

  const handleModuleToggle = (moduleKey: ModuleKey) => {
    setModules((prev) => ({
      ...prev,
      [moduleKey]: !prev[moduleKey],
    }));
  };

  const handleSaveModules = async () => {
    if (!tenantId) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/tenants/${tenantId}/features`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: modules }),
      });

      if (!res.ok) throw new Error("Error al guardar módulos");

      setMessage({ type: "success", text: "Módulos actualizados exitosamente" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLoyalty = async () => {
    if (!tenantId) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/tenants/${tenantId}/loyalty/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: loyaltySettings.enabled,
          reward_threshold: loyaltySettings.rewardThreshold,
          reward_type: loyaltySettings.rewardType,
          reward_value: loyaltySettings.rewardValue,
        }),
      });

      if (!res.ok) throw new Error("Error al guardar configuración de fidelización");

      setMessage({ type: "success", text: "Configuración de fidelización guardada" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-slate-400">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración de Módulos</h1>
        <p className="text-sm text-slate-500 mt-2">
          Activa o desactiva los módulos disponibles para tu aplicación
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Modules Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Módulos Disponibles</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {(Object.keys(MODULES) as ModuleKey[]).map((key) => (
            <label
              key={key}
              className="flex items-center p-4 rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer transition-all"
            >
              <input
                type="checkbox"
                checked={modules[key] ?? true}
                onChange={() => handleModuleToggle(key)}
                className="w-5 h-5 rounded border-slate-300 cursor-pointer"
              />
              <div className="ml-4 flex-1">
                <p className="font-medium text-slate-900">
                  {MODULES[key].icon} {MODULES[key].name}
                </p>
                <p className="text-xs text-slate-500">{MODULES[key].description}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                modules[key] ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
              }`}>
                {modules[key] ? "Activo" : "Inactivo"}
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleSaveModules}
          disabled={saving}
          className="px-6 py-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
        >
          {saving ? "Guardando..." : "✓ Guardar Módulos"}
        </button>
      </div>

      {/* Loyalty Configuration Section */}
      {modules.loyalty && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            💳 Configuración de Fidelización
          </h2>

          <div className="space-y-6">
            {/* Enable/Disable Loyalty */}
            <div>
              <label className="flex items-center p-4 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loyaltySettings.enabled}
                  onChange={(e) =>
                    setLoyaltySettings((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="w-5 h-5 rounded border-slate-300"
                />
                <span className="ml-3 font-medium text-slate-900">
                  Activar módulo de Fidelización
                </span>
              </label>
            </div>

            {loyaltySettings.enabled && (
              <>
                {/* Reward Threshold */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Monto Mínimo para Recompensa (NIO)
                  </label>
                  <input
                    type="number"
                    value={loyaltySettings.rewardThreshold}
                    onChange={(e) =>
                      setLoyaltySettings((prev) => ({
                        ...prev,
                        rewardThreshold: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900 focus:ring-opacity-10"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Los clientes reciben una recompensa después de gastar este monto
                  </p>
                </div>

                {/* Reward Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Tipo de Recompensa
                  </label>
                  <select
                    value={loyaltySettings.rewardType}
                    onChange={(e) =>
                      setLoyaltySettings((prev) => ({ ...prev, rewardType: e.target.value }))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900 focus:ring-opacity-10"
                  >
                    <option value="DISCOUNT_PERCENT">Porcentaje de Descuento (%)</option>
                    <option value="DISCOUNT_FIXED">Descuento Fijo (NIO)</option>
                    <option value="FREE_ITEM">Artículo Gratis</option>
                  </select>
                </div>

                {/* Reward Value */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Valor de la Recompensa
                  </label>
                  <input
                    type="number"
                    value={loyaltySettings.rewardValue}
                    onChange={(e) =>
                      setLoyaltySettings((prev) => ({
                        ...prev,
                        rewardValue: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900 focus:ring-opacity-10"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {loyaltySettings.rewardType === "DISCOUNT_PERCENT"
                      ? "Porcentaje de descuento (ej: 10 = 10%)"
                      : "Cantidad en NIO"}
                  </p>
                </div>
              </>
            )}

            <button
              onClick={handleSaveLoyalty}
              disabled={saving}
              className="px-6 py-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
            >
              {saving ? "Guardando..." : "✓ Guardar Fidelización"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
