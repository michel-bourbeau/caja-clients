"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, Alert, Section, Container } from "@/components/StripeUIComponents";
import { PageIcon, LoadingSpinner } from "@/components";
import { DollarSign } from "lucide-react";

interface ExchangeSettings {
  usdExchangeRate: number;
}

export default function ExchangeRatePage() {
  const [settings, setSettings] = useState<ExchangeSettings>({ usdExchangeRate: 37.00 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tempRate, setTempRate] = useState("37.00");

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenantId") : null;

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const loadSettings = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await fetch(`/api/tenants/${tenantId}/settings`);
      if (res.ok) {
        const s = await res.json();
        const rate = s.usdExchangeRate ?? 37.00;
        setSettings({ usdExchangeRate: rate });
        setTempRate(rate.toString());
      }
    } catch (e) {
      console.error("Error loading settings:", e);
      showMessage("error", "Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!tenantId) return;

    const rate = parseFloat(tempRate);
    if (isNaN(rate) || rate <= 0) {
      showMessage("error", "Por favor ingresa un valor válido mayor a 0");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usdExchangeRate: rate }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings({ usdExchangeRate: data.usdExchangeRate });
        setTempRate(data.usdExchangeRate.toString());
        showMessage("success", "Tasa de cambio actualizada correctamente");
      } else {
        showMessage("error", "Error al guardar");
      }
    } catch (e) {
      console.error("Error:", e);
      showMessage("error", "Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempRate(settings.usdExchangeRate.toString());
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Container>
    );
  }

  const nioEquivalent = (parseFloat(tempRate) || 0) * 1;

  return (
    <Container>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tasa de Cambio USD</h1>
            <p className="text-slate-600 mt-1">Configura la tasa de cambio USD a NIO para los reportes</p>
          </div>
          <Link href="/dashboard/settings" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            ← Volver a Configuración General
          </Link>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <PageIcon type="settings" size="lg" displayType="lucide" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tasa de Cambio USD/NIO</h1>
            <p className="text-sm text-slate-600 mt-1">Configura el tipo de cambio para pagos en dólares estadounidenses</p>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <Alert
            variant={message.type === "success" ? "success" : "error"}
            title={message.type === "success" ? "Éxito" : "Error"}
          >
            {message.text}
          </Alert>
        )}

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="text-blue-600" size={24} />
              Configuración de Cambio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-slate-600 text-sm">
              Cuando un cliente paga en dólares estadounidenses en la caja, el sistema convertirá automáticamente la cantidad a Córdobas usando esta tasa de cambio.
            </p>

            {/* Exchange Rate Input */}
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-6 rounded-lg border border-blue-200">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tasa de Cambio USD → NIO
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        step="0.01"
                        value={tempRate}
                        onChange={(e) => setTempRate(e.target.value)}
                        className="w-full px-4 py-3 border border-blue-300 rounded-lg text-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="37.00"
                      />
                    </div>
                    <span className="text-slate-500 text-sm whitespace-nowrap">Córdobas por USD</span>
                  </div>
                </div>

                {/* Conversion Preview */}
                <div className="bg-white p-4 rounded border border-blue-200">
                  <p className="text-sm text-slate-600 mb-2">Ejemplo de conversión:</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-700">1 USD =</span>
                      <span className="font-semibold text-blue-600">{nioEquivalent.toFixed(2)} NIO</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-700">10 USD =</span>
                      <span className="font-semibold text-blue-600">{(nioEquivalent * 10).toFixed(2)} NIO</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-700">100 USD =</span>
                      <span className="font-semibold text-blue-600">{(nioEquivalent * 100).toFixed(2)} NIO</span>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">💡 Nota:</span> Esta tasa se utilizará cuando el cliente seleccione "USD" como método de pago en la caja. El cambio se calculará automáticamente en Córdobas.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={saving}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Guardando..." : "Guardar Tasa"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>¿Cómo funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">📱 En el Punto de Venta:</h4>
                <p>Cuando realizas una venta, podrás seleccionar "USD" como método de pago. El cliente pagará en dólares y el sistema calculará automáticamente el equivalente en Córdobas.</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">💰 Cálculo del Cambio:</h4>
                <p>Si el cliente paga en USD, el sistema multiplicará la cantidad por la tasa de cambio para obtener el monto en Córdobas, y calculará el cambio correspondiente.</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">📊 Historial:</h4>
                <p>El historial de transacciones guardará tanto el monto recibido en USD como el equivalente en Córdobas para tu referencia.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
