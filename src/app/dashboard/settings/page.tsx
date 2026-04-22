"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Button } from "@/components/ui";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";
import { broadcastCurrencyChange } from "@/lib/utils/useCurrency";

const PLAN_LABELS: Record<string, { label: string; color: string; description: string }> = {
  basic:        { label: "Basico",        color: "bg-slate-100 text-slate-700 border-slate-300",    description: "POS + Inventario" },
  professional: { label: "Profesional",   color: "bg-blue-100 text-blue-700 border-blue-300",       description: "POS + Inventario + Empleados, Horarios, Reportes" },
  enterprise:   { label: "Empresarial",   color: "bg-purple-100 text-purple-700 border-purple-300", description: "Todos los modulos incluidos" },
  custom:       { label: "Personalizado", color: "bg-orange-100 text-orange-700 border-orange-300", description: "Configuracion personalizada" },
};

const AVAILABLE_MODULES = [
  { id: "pos",       label: "Punto de Venta (Cajas)",   icon: "\u{1F6D2}" },
  { id: "inventory", label: "Gestion de Inventario",    icon: "\u{1F4E6}" },
  { id: "employees", label: "Gestion de Empleados",     icon: "\u{1F465}" },
  { id: "schedules", label: "Horarios y Turnos",        icon: "\u{1F4C5}" },
  { id: "payroll",   label: "Nomina",                   icon: "\u{1F4B0}" },
  { id: "reports",   label: "Reportes",                 icon: "\u{1F4CA}" },
  { id: "settings",  label: "Configuracion",            icon: "\u2699\uFE0F" },
];

interface PayrollConfig {
  frequency: "weekly" | "biweekly" | "monthly";
  weekStartDay: number;
  monthStartDay: number;
}

interface Settings {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  companyRuc: string;
  currency: string;
  posConfig: { roundTotal: boolean; printReceipt: boolean };
  payrollConfig: PayrollConfig;
}

interface LoyaltyConfig {
  enabled: boolean;
  rewardThreshold: number;
  rewardType: string;
  rewardValue: number;
}

const DEFAULT_SETTINGS: Settings = {
  companyName: "",
  companyPhone: "",
  companyEmail: "",
  companyWebsite: "",
  companyRuc: "",
  currency: "NIO",
  posConfig: { roundTotal: false, printReceipt: true },
  payrollConfig: { frequency: "weekly", weekStartDay: 1, monthStartDay: 1 },
};

export default function SettingsPage() {
  const { features, loading: featuresLoading } = useTenantFeatures();
  const [tenantPlan, setTenantPlan] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>({
    enabled: true,
    rewardThreshold: 2000,
    rewardType: "DISCOUNT_PERCENT",
    rewardValue: 10,
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingPOS, setSavingPOS] = useState(false);
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [savingLoyalty, setSavingLoyalty] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenantId") : null;

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const loadSettings = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [tenantRes, settingsRes, loyaltyRes] = await Promise.all([
        fetch(`/api/tenants/${tenantId}`),
        fetch(`/api/tenants/${tenantId}/settings`),
        fetch(`/api/tenants/${tenantId}/loyalty/settings`).catch(() => ({ ok: false })),
      ]);
      if (tenantRes.ok) {
        const t = await tenantRes.json();
        if (t?.plan) setTenantPlan(t.plan);
      }
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        const cur = s.currency ?? "NIO";
        setSettings({
          companyName:    s.companyName    ?? "",
          companyPhone:   s.companyPhone   ?? "",
          companyEmail:   s.companyEmail   ?? "",
          companyWebsite: s.companyWebsite ?? "",
          companyRuc:     s.companyRuc     ?? "",
          currency:       cur,
          posConfig:      s.posConfig      ?? DEFAULT_SETTINGS.posConfig,
          payrollConfig:  s.payrollConfig  ?? DEFAULT_SETTINGS.payrollConfig,
        });
        broadcastCurrencyChange(cur);
      }
      if (loyaltyRes.ok) {
        const l = await loyaltyRes.json();
        setLoyaltyConfig({
          enabled: l.enabled ?? true,
          rewardThreshold: l.reward_threshold ?? 2000,
          rewardType: l.reward_type ?? "DISCOUNT_PERCENT",
          rewardValue: l.reward_value ?? 10,
        });
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    } finally {
      setLoadingSettings(false);
    }
  }, [tenantId]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const saveCompanyInfo = async () => {
    if (!tenantId) return;
    setSavingCompany(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName:    settings.companyName,
          companyPhone:   settings.companyPhone,
          companyEmail:   settings.companyEmail,
          companyWebsite: settings.companyWebsite,
          companyRuc:     settings.companyRuc,
          currency:       settings.currency,
        }),
      });
      if (res.ok) {
        broadcastCurrencyChange(settings.currency);
        showMessage("success", "Informacion guardada correctamente");
      } else showMessage("error", "Error al guardar");
    } catch {
      showMessage("error", "Error de conexion");
    } finally {
      setSavingCompany(false);
    }
  };

  const savePOSConfig = async () => {
    if (!tenantId) return;
    setSavingPOS(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posConfig: settings.posConfig }),
      });
      if (res.ok) showMessage("success", "Configuracion de Cajas guardada");
      else showMessage("error", "Error al guardar");
    } catch {
      showMessage("error", "Error de conexion");
    } finally {
      setSavingPOS(false);
    }
  };

  const saveLoyaltyConfig = async () => {
    if (!tenantId) return;
    setSavingLoyalty(true);
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
      setSavingLoyalty(false);
    }
  };

  const savePayrollConfig = async () => {
    if (!tenantId) return;
    setSavingPayroll(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payrollConfig: settings.payrollConfig }),
      });
      if (res.ok) showMessage("success", "Configuracion de Nomina guardada");
      else showMessage("error", "Error al guardar");
    } catch {
      showMessage("error", "Error de conexion");
    } finally {
      setSavingPayroll(false);
    }
  };

  const downloadBackup = async () => {
    if (!tenantId) return;
    setBackupLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/backup`);
      if (!res.ok) throw new Error("Error generating backup");
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition") ?? "";
      const match = contentDisposition.match(/filename="(.+?)"/);
      const filename = match?.[1] ?? "backup.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showMessage("success", `Respaldo descargado: ${filename}`);
    } catch {
      showMessage("error", "Error al generar el respaldo");
    } finally {
      setBackupLoading(false);
    }
  };

  const planInfo = tenantPlan ? PLAN_LABELS[tenantPlan] : null;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Configuracion</h1>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Quick Links */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <a href="/dashboard/settings/theme" className="block p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎨</span>
            <div>
              <h3 className="font-bold text-slate-900">Tema y Personalización</h3>
              <p className="text-sm text-slate-500">Colores, logo y tamaño de letra</p>
            </div>
          </div>
        </a>
        <a href="/dashboard/settings/taxes" className="block p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💳</span>
            <div>
              <h3 className="font-bold text-slate-900">Impuestos</h3>
              <p className="text-sm text-slate-500">Gestiona tasas y categorías</p>
            </div>
          </div>
        </a>
      </div>

      <div className="space-y-6 max-w-2xl">

        <Card title="Plan y Modulos Activos">
          {featuresLoading ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : (
            <div className="space-y-4">
              {planInfo && (
                <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg border ${planInfo.color}`}>
                  <span className="text-base font-bold">{planInfo.label}</span>
                  <span className="text-sm opacity-75">— {planInfo.description}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_MODULES.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                      features[m.id]
                        ? "bg-green-50 text-green-800 border-green-200"
                        : "bg-slate-50 text-slate-400 border-slate-200 line-through"
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                    <span className={`ml-auto text-xs ${features[m.id] ? "text-green-600" : "text-slate-400"}`}>
                      {features[m.id] ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">Para cambiar el plan o los modulos, comunicate con el administrador del sistema.</p>
            </div>
          )}
        </Card>

        <Card title="Informacion de la Empresa">
          {loadingSettings ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : (
            <div className="space-y-4">
              <Field
                label="Nombre de la empresa"
                value={settings.companyName}
                onChange={(v) => setSettings((s) => ({ ...s, companyName: v }))}
                placeholder="Mi Negocio S.A."
                required
              />
              <Field
                label="Numero RUC"
                value={settings.companyRuc}
                onChange={(v) => setSettings((s) => ({ ...s, companyRuc: v }))}
                placeholder="J0310000000001"
                hint="Registro Unico del Contribuyente"
              />
              <Field
                label="Correo electronico"
                value={settings.companyEmail}
                onChange={(v) => setSettings((s) => ({ ...s, companyEmail: v }))}
                placeholder="contacto@miempresa.com.ni"
                type="email"
              />
              <Field
                label="Numero de telefono"
                value={settings.companyPhone}
                onChange={(v) => setSettings((s) => ({ ...s, companyPhone: v }))}
                placeholder="+505 2222-0000"
                type="tel"
              />
              <Field
                label="Sitio web"
                value={settings.companyWebsite}
                onChange={(v) => setSettings((s) => ({ ...s, companyWebsite: v }))}
                placeholder="https://miempresa.com.ni"
                type="url"
              />
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Moneda
                </label>
                <p className="text-xs text-slate-500 mb-1">Moneda usada en precios, recibos y reportes</p>
                <div className="flex gap-3">
                  {[
                    { value: "NIO", label: "Cordoba (C$)", sublabel: "Nicaragua" },
                    { value: "USD", label: "Dolar (US$)",  sublabel: "Estados Unidos" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        settings.currency === opt.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="currency"
                        value={opt.value}
                        checked={settings.currency === opt.value}
                        onChange={() => setSettings((s) => ({ ...s, currency: opt.value }))}
                        className="accent-blue-600"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.sublabel}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveCompanyInfo} disabled={savingCompany}>
                  {savingCompany ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Loyalty Configuration */}
        {features.loyalty && (
          <Card title="Configuracion de Fidelización">
            {loadingSettings ? (
              <p className="text-sm text-slate-500">Cargando...</p>
            ) : (
              <div className="space-y-6">
                <Toggle
                  id="loyaltyEnabled"
                  label="Activar módulo de Fidelización"
                  description="Habilita el programa de clientes fieles"
                  checked={loyaltyConfig.enabled}
                  onChange={(v) => setLoyaltyConfig((prev) => ({ ...prev, enabled: v }))}
                />

                {loyaltyConfig.enabled && (
                  <>
                    <div>
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
                  </>
                )}

                <div className="flex justify-end">
                  <Button onClick={saveLoyaltyConfig} disabled={savingLoyalty}>
                    {savingLoyalty ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* <Card title="Configuracion de Cajas">
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : (
            <div className="space-y-4">
              <Toggle
                id="roundTotal"
                label="Redondear totales al numero entero"
                description="El total de la venta se redondeara al entero mas cercano"
                checked={settings.posConfig.roundTotal}
                onChange={(v) => setSettings((s) => ({ ...s, posConfig: { ...s.posConfig, roundTotal: v } }))}
              />
              <Toggle
                id="printReceipt"
                label="Imprimir recibo automaticamente"
                description="Se abrira la ventana de impresion al confirmar cada venta"
                checked={settings.posConfig.printReceipt}
                onChange={(v) => setSettings((s) => ({ ...s, posConfig: { ...s.posConfig, printReceipt: v } }))}
              />
              <div className="flex justify-end">
                <Button onClick={savePOSConfig} disabled={savingPOS}>
                  {savingPOS ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          )}
        </Card> */}

        {/* <Card title="Configuracion de Nomina">
          {loadingSettings ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Frecuencia de pago</label>
                <p className="text-xs text-slate-500 mb-2">Con que frecuencia se paga a los empleados</p>
                <div className="flex gap-3 flex-wrap">
                  {([
                    { id: "weekly",   label: "Semanal",    desc: "Cada 7 dias" },
                    { id: "biweekly", label: "Bisemanal",  desc: "Cada 14 dias" },
                    { id: "monthly",  label: "Mensual",    desc: "Una vez al mes" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSettings((s) => ({ ...s, payrollConfig: { ...s.payrollConfig, frequency: opt.id } }))}
                      className={`px-4 py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors text-left ${
                        settings.payrollConfig.frequency === opt.id
                          ? "border-blue-600 bg-blue-50 text-blue-800"
                          : "border-slate-200 text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      <span className="block">{opt.label}</span>
                      <span className="block text-xs font-normal opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {(settings.payrollConfig.frequency === "weekly" || settings.payrollConfig.frequency === "biweekly") && (
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Primer dia del periodo</label>
                  <p className="text-xs text-slate-500 mb-2">Dia de la semana en que comienza cada periodo</p>
                  <select
                    value={settings.payrollConfig.weekStartDay}
                    onChange={(e) => setSettings((s) => ({ ...s, payrollConfig: { ...s.payrollConfig, weekStartDay: Number(e.target.value) } }))}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Domingo</option>
                    <option value={1}>Lunes</option>
                    <option value={2}>Martes</option>
                    <option value={3}>Miercoles</option>
                    <option value={4}>Jueves</option>
                    <option value={5}>Viernes</option>
                    <option value={6}>Sabado</option>
                  </select>
                </div>
              )}

              {settings.payrollConfig.frequency === "monthly" && (
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Dia de inicio del mes</label>
                  <p className="text-xs text-slate-500 mb-2">Dia del mes en que comienza el periodo (1–28)</p>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={settings.payrollConfig.monthStartDay}
                    onChange={(e) => setSettings((s) => ({ ...s, payrollConfig: { ...s.payrollConfig, monthStartDay: Math.min(28, Math.max(1, Number(e.target.value))) } }))}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={savePayrollConfig} disabled={savingPayroll}>
                  {savingPayroll ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          )}
        </Card> */}

        {/* <Card title="Datos y Respaldos">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-1">Exportar datos</p>
              <p className="text-sm text-blue-700 mb-3">
                Descarga un archivo con todos tus datos: productos, empleados y las ultimas 500 transacciones.
              </p>
              <Button onClick={downloadBackup} disabled={backupLoading} variant="secondary">
                {backupLoading ? "Generando respaldo..." : "Descargar Respaldo"}
              </Button>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-semibold text-amber-900 mb-1">Nota importante</p>
              <p className="text-xs text-amber-700">
                Tus datos estan guardados de forma segura en Supabase. Se recomienda hacer un respaldo mensual.
              </p>
            </div>
          </div>
        </Card> */}

      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", required, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-1">
        {label}{!required && <span className="ml-1 text-xs text-slate-400">(opcional)</span>}
      </label>
      {hint && <p className="text-xs text-slate-500 mb-1">{hint}</p>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function Toggle({
  id, label, description, checked, onChange,
}: {
  id: string; label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
      <div className="mt-0.5">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 accent-blue-600"
        />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-900 group-hover:text-blue-700 transition-colors">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
    </label>
  );
}