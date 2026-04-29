"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, Button, Alert, Section, Container } from "@/components/StripeUIComponents";
import { useTenantFeatures } from "@/context/TenantFeaturesContext";
import { usePaymentStatus } from "@/lib/hooks/usePaymentStatus";
import { broadcastCurrencyChange } from "@/lib/utils/useCurrency";
import { ThemeFontSizeSettings } from "@/components/ThemeFontSizeSettings";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface PlanDetails {
  label: string;
  color: string;
  description: string;
}

const PLAN_LABELS: Record<string, PlanDetails> = {
  basic: {
    label: "Basico",
    color: "bg-slate-100 text-slate-700 border-slate-300",
    description: "POS + Inventario",
  },
  professional: {
    label: "Profesional",
    color: "bg-blue-100 text-blue-700 border-blue-300",
    description: "POS + Inventario + Empleados, Horarios, Reportes",
  },
  enterprise: {
    label: "Empresarial",
    color: "bg-purple-100 text-purple-700 border-purple-300",
    description: "Todos los modulos incluidos",
  },
  custom: {
    label: "Personalizado",
    color: "bg-orange-100 text-orange-700 border-orange-300",
    description: "Configuracion personalizada",
  },
};

type ModuleKey = "pos" | "inventory" | "employees" | "schedules" | "payroll" | "reports" | "loyalty" | "expenses" | "taxes" | "contacts" | "settings";

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

interface PaymentRecord {
  id: string;
  plan: string;
  amount: number;
  paid_until: string;
  payment_date: string;
  payment_method: string;
  notes?: string;
}

interface PaymentInfo {
  plan: string;
  paid_until: string | null;
  history: PaymentRecord[];
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
  const { features, loading: featuresLoading, error: featuresError } = useTenantFeatures();
  const [tenantPlan, setTenantPlan] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingPOS, setSavingPOS] = useState(false);
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenantId") : null;
  const { paymentStatus, loading: paymentLoading } = usePaymentStatus(tenantId);
  const isSuspended = paymentStatus?.isSuspended ?? false;

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const loadSettings = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [tenantRes, settingsRes, paymentRes] = await Promise.all([
        fetch(`/api/tenants/${tenantId}`),
        fetch(`/api/tenants/${tenantId}/settings`),
        fetch(`/api/tenants/${tenantId}/payment`),
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
      if (paymentRes.ok) {
        const p = await paymentRes.json();
        setPaymentInfo(p);
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    } finally {
      setLoadingSettings(false);
      setLoadingPayment(false);
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
    <Container>
      <div className="space-y-8">
        {/* Header */}
        <Section
          title="Configuración General"
          description="Gestiona tu información de empresa, plan y módulos activos"
        />

        {/* Acceso rápido a módulos */}
        <Card>
          <CardHeader>
            <CardTitle>⚙️ Gestión de Módulos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">Activa o desactiva los módulos disponibles según tu plan</p>
            <Link href="/dashboard/settings/modules">
              <Button variant="primary">Ir a Módulos →</Button>
            </Link>
          </CardContent>
        </Card>

        {/* LOADING SCREEN - Show while payment status is loading */}
        {paymentLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </CardContent>
          </Card>
        ) : (
          <>
        {/* SUSPENSION ALERT - PROMINENT */}
        {isSuspended && (
          <Alert
            variant="error"
            title="🔴 CUENTA SUSPENDIDA"
          >
            <div className="space-y-3 mt-2">
              <p className="font-semibold">Tu suscripción ha expirado hace más de 3 días.</p>
              <p className="text-sm">Todos los módulos, usuarios y empleados han sido desactivados temporalmente.</p>
              <p className="text-sm font-semibold">✅ Se reactivarán automáticamente cuando registres un pago.</p>
              <div className="mt-4 pt-4 border-t border-red-200">
                <p className="text-sm mb-3">Para reactivar tu cuenta inmediatamente, contacta con el administrador del sistema:</p>
                <Button 
                  variant="secondary"
                  onClick={() => {
                    const email = "michelbourbeau@gmail.com";
                    const subject = encodeURIComponent("Reactivar Suscripción - Cuenta Suspendida");
                    const body = encodeURIComponent("Necesito reactivar mi suscripción y acceso a la plataforma.");
                    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
                  }}
                >
                  📧 Enviar Email al Soporte
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {/* Messages */}
        {message && (
          <Alert
            variant={message.type === "success" ? "success" : "error"}
            title={message.type === "success" ? "Éxito" : "Error"}
          >
            {message.text}
          </Alert>
        )}

        {/* ONLY SHOW PAYMENT INFO IF SUSPENDED */}
        {isSuspended ? (
          // When suspended: show ONLY payment information
          <Card>
            <CardHeader>
              <CardTitle>Información de Pago y Reactivación</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPayment ? (
                <LoadingSpinner size="sm" />
              ) : paymentInfo ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-slate-700 mb-2 font-semibold">Estado Actual:</p>
                    <p className="text-lg text-red-700 font-bold">❌ SUSPENDIDO</p>
                    {paymentInfo.paid_until && (
                      <p className="text-sm text-slate-600 mt-2">
                        Expirado desde: {new Date(paymentInfo.paid_until).toLocaleDateString('es-NI', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>

                  {/* Payment History */}
                  {paymentInfo.history && paymentInfo.history.length > 0 && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Historial de Pagos</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">Fecha de Pago</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">Plan</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">Monto</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">Válido Hasta</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">Método</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentInfo.history.map((payment) => (
                              <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-3 px-2">
                                  {new Date(payment.payment_date).toLocaleDateString('es-NI')}
                                </td>
                                <td className="py-3 px-2 font-medium capitalize text-slate-900">{payment.plan}</td>
                                <td className="py-3 px-2 text-slate-900">C$ {payment.amount.toFixed(2)}</td>
                                <td className="py-3 px-2 text-slate-600">
                                  {new Date(payment.paid_until).toLocaleDateString('es-NI')}
                                </td>
                                <td className="py-3 px-2 text-slate-600">{payment.payment_method || 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200">
                    <Alert variant="info" title="ℹ️ Nota">
                      Para registrar un pago y reactivar tu cuenta, contacta con el administrador o usa la opción de email arriba.
                    </Alert>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No hay información de pago disponible</p>
              )}
            </CardContent>
          </Card>
        ) : (
          // When NOT suspended: show all settings sections
          <>
        {/* Company Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSettings ? (
              <LoadingSpinner size="sm" />
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
                  <p className="text-xs text-slate-500 mb-3">Moneda usada en precios, recibos y reportes</p>
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
                <div className="flex justify-end pt-4 border-t border-slate-200">
                  <Button 
                    onClick={saveCompanyInfo} 
                    disabled={savingCompany}
                    variant="primary"
                    loading={savingCompany}
                  >
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Theme Font Size Settings */}
        <ThemeFontSizeSettings />

        <div className="space-y-6">
          {/* Payment Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Información de Pago y Suscripción</CardTitle>
            </CardHeader>
            <CardContent>
              {featuresLoading || loadingSettings || loadingPayment ? (
                <LoadingSpinner size="sm" />
              ) : (
                <div className="space-y-6">
                  {/* Plan Badge */}
                  {planInfo && (
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-2">Plan Actual:</p>
                      <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg border ${planInfo.color}`}>
                        <span className="text-base font-bold">{planInfo.label}</span>
                        <span className="text-sm opacity-75">— {planInfo.description}</span>
                      </div>
                    </div>
                  )}

                  {/* Payment Status */}
                  {paymentInfo && (
                    <div className="border-t border-slate-200 pt-6">
                      <h3 className="font-semibold text-slate-900 mb-4">Estado de la Suscripción</h3>
                      
                      {paymentInfo.paid_until ? (
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                          <p className="text-sm text-slate-600 mb-1">Válida hasta:</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {new Date(paymentInfo.paid_until).toLocaleDateString('es-NI', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-slate-600 mt-2">
                            {new Date(paymentInfo.paid_until) > new Date() 
                              ? `✅ Activa (${Math.ceil((new Date(paymentInfo.paid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} días restantes)`
                              : `❌ Expirada`}
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                          <p className="text-sm text-slate-600">No hay pago registrado actualmente</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* How to Pay Info */}
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="font-semibold text-slate-900 mb-4">💳 Métodos de Pago</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="font-medium text-slate-900 mb-2">Los pagos se realizan mediante:</p>
                        <ul className="space-y-2 text-sm text-slate-700">
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">✓</span>
                            <div>
                              <p className="font-medium">Transferencia Bancaria</p>
                              <p className="text-xs text-slate-600">Contacta con el administrador para los datos bancarios</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">✓</span>
                            <div>
                              <p className="font-medium">Efectivo</p>
                              <p className="text-xs text-slate-600">Entrega directa en persona</p>
                            </div>
                          </li>
                        </ul>
                      </div>

                      <Alert variant="info" title="📞 Contacta con el Administrador">
                        Para procesar tu pago y renovar tu suscripción, por favor contacta directamente con el administrador del sistema:
                        <div className="mt-3 space-y-1 text-sm">
                          <p>📧 Email: <span className="font-mono">michelbourbeau@gmail.com</span></p>
                          <p>📱 WhatsApp: (505) 5889 1314</p>
                        </div>
                      </Alert>
                    </div>
                  </div>

                  {/* Payment History */}
                  {paymentInfo?.history && paymentInfo.history.length > 0 && (
                    <div className="border-t border-slate-200 pt-6">
                      <h3 className="font-semibold text-slate-900 mb-3">📋 Historial de Pagos</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">Fecha de Pago</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">Plan</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">Monto</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">Válido Hasta</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">Método</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentInfo.history.map((payment) => (
                              <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-3 px-2 text-slate-900">
                                  {new Date(payment.payment_date).toLocaleDateString('es-NI')}
                                </td>
                                <td className="py-3 px-2 font-medium capitalize text-slate-900">{payment.plan}</td>
                                <td className="py-3 px-2 text-slate-900 font-semibold">C$ {payment.amount.toFixed(2)}</td>
                                <td className="py-3 px-2 text-slate-600">
                                  {new Date(payment.paid_until).toLocaleDateString('es-NI')}
                                </td>
                                <td className="py-3 px-2 text-slate-600">{payment.payment_method || 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

          </>
        )}
          </>
        )}
      </div>
    </Container>
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