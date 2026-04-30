"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, Button, Alert, Section, Container } from "@/components/StripeUIComponents";
import { useTenantFeatures } from "@/context/TenantFeaturesContext";
import { usePaymentStatus } from "@/lib/hooks/usePaymentStatus";
import { broadcastCurrencyChange } from "@/lib/utils/useCurrency";
import { ThemeFontSizeSettings } from "@/components/ThemeFontSizeSettings";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useLanguage } from "@/context/LanguageContext";
import { LOCALES, LOCALE_LABELS, LOCALE_FLAGS, Locale } from "@/i18n/config";
import { useAuth } from "@/context/AuthContext";

interface PlanDetails {
  label: string;
  color: string;
  description: string;
}

const PLAN_COLORS: Record<string, string> = {
  basic: "bg-slate-100 text-slate-700 border-slate-300",
  professional: "bg-blue-100 text-blue-700 border-blue-300",
  enterprise: "bg-purple-100 text-purple-700 border-purple-300",
  custom: "bg-orange-100 text-orange-700 border-orange-300",
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
  language: Locale;
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
  language: LOCALES.ES_NI,
  posConfig: { roundTotal: false, printReceipt: true },
  payrollConfig: { frequency: "weekly", weekStartDay: 1, monthStartDay: 1 },
};

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { features, loading: featuresLoading, error: featuresError } = useTenantFeatures();
  const { setTenantDefault, t } = useLanguage();
  const [tenantPlan, setTenantPlan] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingPOS, setSavingPOS] = useState(false);
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenantId") : null;
  const { paymentStatus, loading: paymentLoading } = usePaymentStatus(tenantId);
  const isSuspended = paymentStatus?.isSuspended ?? false;

  const getPlanInfo = useCallback((): PlanDetails | null => {
    if (!tenantPlan) return null;
    const keys: Record<string, [string, string]> = {
      basic: [t("settings.planBasic"), t("settings.planBasicDesc")],
      professional: [t("settings.planPro"), t("settings.planProDesc")],
      enterprise: [t("settings.planBusiness"), t("settings.planBusinessDesc")],
      custom: [t("settings.planCustom"), t("settings.planCustomDesc")],
    };
    const entry = keys[tenantPlan];
    if (!entry) return null;
    return { label: entry[0], color: PLAN_COLORS[tenantPlan] ?? "bg-slate-100 text-slate-700 border-slate-300", description: entry[1] };
  }, [tenantPlan, t]);

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
        const lang = (s.language ?? LOCALES.ES_NI) as Locale;
        setSettings({
          companyName:    s.companyName    ?? "",
          companyPhone:   s.companyPhone   ?? "",
          companyEmail:   s.companyEmail   ?? "",
          companyWebsite: s.companyWebsite ?? "",
          companyRuc:     s.companyRuc     ?? "",
          currency:       cur,
          language:       lang,
          posConfig:      s.posConfig      ?? DEFAULT_SETTINGS.posConfig,
          payrollConfig:  s.payrollConfig  ?? DEFAULT_SETTINGS.payrollConfig,
        });
        broadcastCurrencyChange(cur);
        setTenantDefault(lang);
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

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (!user.permissions?.includes("settings.view")) { router.push("/dashboard"); return; }
  }, [user, router]);

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
        showMessage("success", t("settings.messages.companySaved"));
      } else showMessage("error", t("settings.messages.saveError"));
    } catch {
      showMessage("error", t("settings.messages.connectionError"));
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
      if (res.ok) showMessage("success", t("settings.messages.posSaved"));
      else showMessage("error", t("settings.messages.saveError"));
    } catch {
      showMessage("error", t("settings.messages.connectionError"));
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
      if (res.ok) showMessage("success", t("settings.messages.payrollSaved"));
      else showMessage("error", t("settings.messages.saveError"));
    } catch {
      showMessage("error", t("settings.messages.connectionError"));
    } finally {
      setSavingPayroll(false);
    }
  };

  const saveLanguage = async (lang: Locale) => {
    if (!tenantId) return;
    setSavingLanguage(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
      if (res.ok) {
        setSettings((s) => ({ ...s, language: lang }));
        setTenantDefault(lang);
        showMessage("success", t("settings.messages.langSaved"));
      } else {
        showMessage("error", t("settings.messages.saveError"));
      }
    } catch {
      showMessage("error", t("settings.messages.connectionError"));
    } finally {
      setSavingLanguage(false);
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
      showMessage("success", `${t("settings.messages.backupSuccess")}: ${filename}`);
    } catch {
      showMessage("error", t("settings.messages.backupError"));
    } finally {
      setBackupLoading(false);
    }
  };

  const planInfo = getPlanInfo();

  return (
    <Container>
      <div className="space-y-8">
        {/* Header */}
        <Section
          title={t("settings.pageTitle")}
          description={t("settings.pageSubtitle")}
        />

        {/* Acceso rápido a módulos */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.modulesCardTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">{t("settings.modulesCardDesc")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { href: "/dashboard/settings/modules",       icon: "🧩", label: t("settings.subModules") },
                { href: "/dashboard/settings/taxes",         icon: "📋", label: t("settings.subTaxes") },
                { href: "/dashboard/settings/exchange-rate", icon: "💱", label: t("settings.subExchangeRate") },
                { href: "/dashboard/settings/theme",         icon: "🎨", label: t("settings.subTheme") },
                { href: "/dashboard/settings/loyalty",       icon: "💳", label: t("settings.subLoyalty") },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
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
            title={t("settings.suspendedTitle")}
          >
            <div className="space-y-3 mt-2">
              <p className="font-semibold">{t("settings.suspendedMsg1")}</p>
              <p className="text-sm">{t("settings.suspendedMsg2")}</p>
              <p className="text-sm font-semibold">{t("settings.suspendedMsg3")}</p>
              <div className="mt-4 pt-4 border-t border-red-200">
                <p className="text-sm mb-3">{t("settings.suspendedReactivate")}</p>
                <Button 
                  variant="secondary"
                  onClick={() => {
                    const email = "michelbourbeau@gmail.com";
                    const subject = encodeURIComponent("Reactivar Suscripción - Cuenta Suspendida");
                    const body = encodeURIComponent("Necesito reactivar mi suscripción y acceso a la plataforma.");
                    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
                  }}
                >
                  {t("settings.suspendedEmailBtn")}
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {/* Messages */}
        {message && (
          <Alert
            variant={message.type === "success" ? "success" : "error"}
            title={message.type === "success" ? t("settings.msgSuccess") : t("settings.msgError")}
          >
            {message.text}
          </Alert>
        )}

        {/* ONLY SHOW PAYMENT INFO IF SUSPENDED */}
        {isSuspended ? (
          // When suspended: show ONLY payment information
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.paymentReactivationTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPayment ? (
                <LoadingSpinner size="sm" />
              ) : paymentInfo ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-slate-700 mb-2 font-semibold">{t("settings.currentStatus")}</p>
                    <p className="text-lg text-red-700 font-bold">{t("settings.suspendedStatus")}</p>
                    {paymentInfo.paid_until && (
                      <p className="text-sm text-slate-600 mt-2">
                        {t("settings.expiredSince")} {new Date(paymentInfo.paid_until).toLocaleDateString('es-NI', {
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
                      <h4 className="font-medium text-slate-900 mb-3">{t("settings.paymentHistoryTitle")}</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">{t("settings.colPayDate")}</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">{t("settings.colPlan")}</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">{t("settings.colAmount")}</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">{t("settings.colValidUntil")}</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">{t("settings.colMethod")}</th>
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
                    <Alert variant="info" title={t("settings.noteTitle")}>
                      {t("settings.noteMsg")}
                    </Alert>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">{t("settings.noPaymentInfo")}</p>
              )}
            </CardContent>
          </Card>
        ) : (
          // When NOT suspended: show all settings sections
          <>
        {/* Company Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.companyInfoTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSettings ? (
              <LoadingSpinner size="sm" />
            ) : (
              <div className="space-y-4">
                <Field
                  label={t("settings.companyNameLabel")}
                  value={settings.companyName}
                  onChange={(v) => setSettings((s) => ({ ...s, companyName: v }))}
                  placeholder={t("settings.companyNamePlaceholder")}
                  required
                />
                <Field
                  label={t("settings.companyRucLabel")}
                  value={settings.companyRuc}
                  onChange={(v) => setSettings((s) => ({ ...s, companyRuc: v }))}
                  placeholder={t("settings.companyRucPlaceholder")}
                  hint={t("settings.companyRucHint")}
                />
                <Field
                  label={t("settings.companyEmailLabel")}
                  value={settings.companyEmail}
                  onChange={(v) => setSettings((s) => ({ ...s, companyEmail: v }))}
                  placeholder={t("settings.companyEmailPlaceholder")}
                  type="email"
                />
                <Field
                  label={t("settings.companyPhoneLabel")}
                  value={settings.companyPhone}
                  onChange={(v) => setSettings((s) => ({ ...s, companyPhone: v }))}
                  placeholder={t("settings.companyPhonePlaceholder")}
                  type="tel"
                />
                <Field
                  label={t("settings.companyWebsiteLabel")}
                  value={settings.companyWebsite}
                  onChange={(v) => setSettings((s) => ({ ...s, companyWebsite: v }))}
                  placeholder={t("settings.companyWebsitePlaceholder")}
                  type="url"
                />
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">
                    {t("settings.currencyLabel")}
                  </label>
                  <p className="text-xs text-slate-500 mb-3">{t("settings.currencyDesc")}</p>
                  <div className="flex gap-3">
                    {[
                      { value: "NIO", label: t("settings.currencyNIO"), sublabel: t("settings.currencyNIOSub") },
                      { value: "USD", label: t("settings.currencyUSD"), sublabel: t("settings.currencyUSDSub") },
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
                    {t("settings.saveChanges")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Theme Font Size Settings */}
        <ThemeFontSizeSettings />

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.langCardTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              {t("settings.langCardDesc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {([
                { locale: LOCALES.ES_NI, flag: LOCALE_FLAGS["es-ni"], label: LOCALE_LABELS["es-ni"] },
                { locale: LOCALES.EN,    flag: LOCALE_FLAGS["en"],    label: LOCALE_LABELS["en"]    },
                { locale: LOCALES.FR,    flag: LOCALE_FLAGS["fr"],    label: LOCALE_LABELS["fr"]    },
              ] as { locale: Locale; flag: string; label: string }[]).map((opt) => (
                <label
                  key={opt.locale}
                  className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    settings.language === opt.locale
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="language"
                    value={opt.locale}
                    checked={settings.language === opt.locale}
                    onChange={() => saveLanguage(opt.locale as Locale)}
                    className="accent-blue-600"
                    disabled={savingLanguage}
                  />
                  <span className="text-xl leading-none">{opt.flag}</span>
                  <span className="text-sm font-semibold text-slate-900">{opt.label}</span>
                  {settings.language === opt.locale && (
                    <span className="ml-auto text-xs text-blue-600 font-medium">{t("settings.langActive")}</span>
                  )}
                </label>
              ))}
            </div>
            {savingLanguage && (
              <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                <LoadingSpinner size="sm" /> {t("settings.langSaving")}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Payroll Frequency Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>⚙️ {t("payroll.periods.configTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSettings ? (
                <LoadingSpinner size="sm" />
              ) : (
                <div className="space-y-5">
                  {/* Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">{t("payroll.periods.freqLabel")}</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {(["weekly", "biweekly", "monthly"] as const).map((f) => (
                        <label
                          key={f}
                          className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors ${
                            settings.payrollConfig.frequency === f
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="payrollFrequency"
                            value={f}
                            checked={settings.payrollConfig.frequency === f}
                            onChange={() => setSettings((s) => ({ ...s, payrollConfig: { ...s.payrollConfig, frequency: f } }))}
                            className="accent-blue-600"
                          />
                          <span className="text-sm font-semibold text-slate-900">
                            {t(`payroll.freq${f.charAt(0).toUpperCase()}${f.slice(1)}` as any)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Week start day — shown for weekly/biweekly */}
                  {(settings.payrollConfig.frequency === "weekly" || settings.payrollConfig.frequency === "biweekly") && (
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">{t("payroll.periods.weekStartLabel")}</label>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setSettings((s) => ({ ...s, payrollConfig: { ...s.payrollConfig, weekStartDay: day } }))}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                              settings.payrollConfig.weekStartDay === day
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-slate-700 border-slate-300 hover:border-blue-400"
                            }`}
                          >
                            {t(`payroll.weekDay${day}` as any)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Month start day — shown for monthly */}
                  {settings.payrollConfig.frequency === "monthly" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">{t("payroll.periods.monthStartLabel")}</label>
                      <select
                        value={settings.payrollConfig.monthStartDay}
                        onChange={(e) => setSettings((s) => ({ ...s, payrollConfig: { ...s.payrollConfig, monthStartDay: Number(e.target.value) } }))}
                        className="w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-slate-200">
                    <Button
                      onClick={savePayrollConfig}
                      disabled={savingPayroll}
                      variant="primary"
                      loading={savingPayroll}
                    >
                      {savingPayroll ? t("payroll.periods.saving") : t("payroll.periods.saveBtn")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.subscriptionTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {featuresLoading || loadingSettings || loadingPayment ? (
                <LoadingSpinner size="sm" />
              ) : (
                <div className="space-y-6">
                  {/* Plan Badge */}
                  {planInfo && (
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-2">{t("settings.currentPlan")}</p>
                      <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg border ${planInfo.color}`}>
                        <span className="text-base font-bold">{planInfo.label}</span>
                        <span className="text-sm opacity-75">— {planInfo.description}</span>
                      </div>
                    </div>
                  )}

                  {/* Payment Status */}
                  {paymentInfo && (
                    <div className="border-t border-slate-200 pt-6">
                      <h3 className="font-semibold text-slate-900 mb-4">{t("settings.subscriptionStatus")}</h3>
                      
                      {paymentInfo.paid_until ? (
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                          <p className="text-sm text-slate-600 mb-1">{t("settings.validUntil")}</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {new Date(paymentInfo.paid_until).toLocaleDateString('es-NI', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-slate-600 mt-2">
                            {new Date(paymentInfo.paid_until) > new Date() 
                              ? `${t("settings.subscriptionActive")} (${Math.ceil((new Date(paymentInfo.paid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} ${t("settings.daysRemaining").replace("{{n}} ", "")})`
                              : t("settings.subscriptionExpired")}
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                          <p className="text-sm text-slate-600">{t("settings.noPaymentRegistered")}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* How to Pay Info */}
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="font-semibold text-slate-900 mb-4">{t("settings.paymentMethods")}</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="font-medium text-slate-900 mb-2">{t("settings.paymentVia")}</p>
                        <ul className="space-y-2 text-sm text-slate-700">
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">✓</span>
                            <div>
                              <p className="font-medium">{t("settings.bankTransfer")}</p>
                              <p className="text-xs text-slate-600">{t("settings.bankTransferDesc")}</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">✓</span>
                            <div>
                              <p className="font-medium">{t("settings.cash")}</p>
                              <p className="text-xs text-slate-600">{t("settings.cashDesc")}</p>
                            </div>
                          </li>
                        </ul>
                      </div>

                      <Alert variant="info" title={t("settings.contactAdminTitle")}>
                        {t("settings.contactAdminMsg")}
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
                      <h3 className="font-semibold text-slate-900 mb-3">{t("settings.paymentHistoryTitle")}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">{t("settings.colPayDate")}</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">{t("settings.colPlan")}</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">{t("settings.colAmount")}</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">{t("settings.colValidUntil")}</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">{t("settings.colMethod")}</th>
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