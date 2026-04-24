"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";

interface LoyaltyConfig {
  enabled: boolean;
  rewardThreshold: number;
  rewardType: string;
  rewardValue: number;
}

export default function LoyaltySettingsPage() {
  const { features, loading: featuresLoading } = useTenantFeatures();
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>({
    enabled: true,
    rewardThreshold: 2000,
    rewardType: "DISCOUNT_PERCENT",
    rewardValue: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenantId") : null;

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const loadLoyaltyConfig = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/loyalty/settings`);
      if (res.ok) {
        const l = await res.json();
        setLoyaltyConfig({
          enabled: l.enabled ?? true,
          rewardThreshold: l.reward_threshold ?? 2000,
          rewardType: l.reward_type ?? "DISCOUNT_PERCENT",
          rewardValue: l.reward_value ?? 10,
        });
      }
    } catch (e) {
      console.error("Error loading loyalty config:", e);
      showMessage("error", "Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadLoyaltyConfig();
  }, [loadLoyaltyConfig]);

  const saveLoyaltyConfig = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/loyalty/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: loyaltyConfig.enabled,
          reward_threshold: loyaltyConfig.rewardThreshold,
          reward_type: loyaltyConfig.rewardType,
          reward_value: loyaltyConfig.rewardValue,
        }),
      });
      if (res.ok) showMessage("success", "Configuracion de Fidelización guardada");
      else showMessage("error", "Error al guardar");
    } catch {
      showMessage("error", "Error de conexion");
    } finally {
      setSaving(false);
    }
  };

  if (featuresLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (!features.loyalty) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Configuracion de Fidelización</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            ℹ️ El módulo de Fidelización no está disponible en tu plan actual. Contacta con el administrador para activarlo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configuracion de Fidelización</h1>
        <Link href="/dashboard/settings" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
          ← Volver a Configuración General
        </Link>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6 max-w-2xl">
        <Card title="Configuracion de Fidelización">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900">
                      Activar módulo de Fidelización
                    </label>
                    <p className="text-xs text-slate-500 mt-1">Habilita el programa de clientes fieles</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={loyaltyConfig.enabled}
                    onChange={(e) => setLoyaltyConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                    className="accent-blue-600 w-5 h-5 rounded border-slate-300"
                  />
                </div>
              </div>

              {loyaltyConfig.enabled && (
                <>
                  <div className="border-t border-slate-200 pt-6">
                    <label className="block text-sm font-medium text-slate-900 mb-1">
                      Monto Minimo para Recompensa (NIO)
                    </label>
                    <p className="text-xs text-slate-500 mb-2">Los clientes reciben una recompensa despues de gastar este monto</p>
                    <input
                      type="number"
                      value={loyaltyConfig.rewardThreshold}
                      onChange={(e) =>
                        setLoyaltyConfig((prev) => ({
                          ...prev,
                          rewardThreshold: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-1">
                      Tipo de Recompensa
                    </label>
                    <select
                      value={loyaltyConfig.rewardType}
                      onChange={(e) =>
                        setLoyaltyConfig((prev) => ({ ...prev, rewardType: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DISCOUNT_PERCENT">Porcentaje de Descuento (%)</option>
                      <option value="DISCOUNT_FIXED">Descuento Fijo (NIO)</option>
                      <option value="FREE_ITEM">Articulo Gratis</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-1">
                      Valor de la Recompensa
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      {loyaltyConfig.rewardType === "DISCOUNT_PERCENT"
                        ? "Porcentaje de descuento (ej: 10 = 10%)"
                        : "Cantidad en NIO"}
                    </p>
                    <input
                      type="number"
                      value={loyaltyConfig.rewardValue}
                      onChange={(e) =>
                        setLoyaltyConfig((prev) => ({
                          ...prev,
                          rewardValue: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <span className="font-semibold">Ejemplo:</span> Si un cliente gasta {loyaltyConfig.rewardThreshold} NIO, recibirá{" "}
                      {loyaltyConfig.rewardType === "DISCOUNT_PERCENT"
                        ? `un ${loyaltyConfig.rewardValue}% de descuento`
                        : `${loyaltyConfig.rewardValue} NIO de descuento`}{" "}
                      en su próxima compra.
                    </p>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <Button onClick={saveLoyaltyConfig} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
