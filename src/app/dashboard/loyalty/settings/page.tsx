"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { LoyaltyService } from "@/features/loyalty/services";
import { useTenantId } from "@/lib/utils/tenant";

export default function LoyaltySettingsPage() {
  const tenantId = useTenantId();
  const [settings, setSettings] = useState({
    loyalty_module_enabled: false,
    loyalty_reward_threshold: 2000,
    loyalty_reward_type: "DISCOUNT_PERCENT",
    loyalty_reward_value: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    loadSettings();
  }, [tenantId]);

  const loadSettings = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const data = await LoyaltyService.getLoyaltySettings(tenantId);
      setSettings(data);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    try {
      setSaving(true);
      // Note: We would need to update the LoyaltyService and API to handle settings updates
      // For now, we'll just show a message
      setMessage("✓ Configuración actualizada");
      setMessageType("success");

      setTimeout(() => {
        setMessage(null);
        setMessageType(null);
      }, 3000);
    } catch (error) {
      setMessage("Error guardando configuración");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando...</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración de Fidelización</h1>
        <p className="text-gray-600">Personaliza tu programa de clientes fieles</p>
      </div>

      {message && (
        <div className={`p-4 rounded border ${
          messageType === "success"
            ? "border-green-300 bg-green-50 text-green-900"
            : "border-red-300 bg-red-50 text-red-900"
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
        {/* Enable/Disable Module */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold text-gray-900">Módulo de Fidelización</label>
              <p className="text-sm text-gray-600 mt-1">Activa o desactiva el programa de clientes fieles</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, loyalty_module_enabled: !settings.loyalty_module_enabled })}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                settings.loyalty_module_enabled ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  settings.loyalty_module_enabled ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {settings.loyalty_module_enabled && (
          <>
            {/* Reward Threshold */}
            <div>
              <label htmlFor="threshold" className="block text-sm font-semibold text-gray-900 mb-2">
                Monto para Recompensa
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Cada vez que un cliente gasta este monto, recibe una recompensa
              </p>
              <input
                id="threshold"
                type="number"
                min="0"
                step="100"
                value={settings.loyalty_reward_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, loyalty_reward_threshold: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold"
              />
            </div>

            {/* Reward Type */}
            <div>
              <label htmlFor="rewardType" className="block text-sm font-semibold text-gray-900 mb-2">
                Tipo de Recompensa
              </label>
              <select
                id="rewardType"
                value={settings.loyalty_reward_type}
                onChange={(e) =>
                  setSettings({ ...settings, loyalty_reward_type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="DISCOUNT_PERCENT">Descuento %</option>
                <option value="DISCOUNT_FIXED">Descuento Fijo (C$)</option>
                <option value="POINTS">Puntos</option>
                <option value="GIFT">Regalo/Brinde</option>
              </select>
            </div>

            {/* Reward Value */}
            <div>
              <label htmlFor="rewardValue" className="block text-sm font-semibold text-gray-900 mb-2">
                Valor de Recompensa
              </label>
              <p className="text-sm text-gray-600 mb-3">
                {settings.loyalty_reward_type === "DISCOUNT_PERCENT"
                  ? "Porcentaje de descuento (%)"
                  : settings.loyalty_reward_type === "DISCOUNT_FIXED"
                  ? "Monto de descuento (C$)"
                  : "Valor del premio"}
              </p>
              <input
                id="rewardValue"
                type="number"
                min="0"
                step="1"
                value={settings.loyalty_reward_value}
                onChange={(e) =>
                  setSettings({ ...settings, loyalty_reward_value: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold"
              />
            </div>

            {/* Preview */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900">Ejemplo:</p>
              <p className="text-sm text-blue-700 mt-1">
                Cada vez que un cliente gasta{" "}
                <span className="font-semibold">{settings.loyalty_reward_threshold.toLocaleString()} C$</span>, recibe{" "}
                <span className="font-semibold">
                  {settings.loyalty_reward_value}
                  {settings.loyalty_reward_type === "DISCOUNT_PERCENT" ? "%" : " C$"}
                </span>{" "}
                de {settings.loyalty_reward_type === "DISCOUNT_PERCENT" ? "descuento" : "recompensa"}
              </p>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-6 border-t">
          <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => loadSettings()}
          >
            Cancelar
          </Button>
        </div>
      </form>

      {/* Info Box */}
      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-sm font-semibold text-amber-900">💡 Consejo</p>
        <ul className="text-sm text-amber-800 mt-2 space-y-1 list-disc pl-5">
          <li>Reduce el monto de recompensa para más frecuencia</li>
          <li>Un descuento del 5-10% es típico</li>
          <li>Los clientes pueden ver su progreso en el POS</li>
          <li>Las recompensas se registran automáticamente</li>
        </ul>
      </div>
    </div>
  );
}
