"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenantId } from "@/lib/utils/tenant";
import { useTenantFeatures } from "@/context/TenantFeaturesContext";
import { LoyaltyService } from "@/features/loyalty/services";
import { Container, Section, Card, CardHeader, CardTitle, CardContent, Button, Alert } from "@/components/StripeUIComponents";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

type ModuleKey = "pos" | "inventory" | "employees" | "schedules" | "payroll" | "reports" | "loyalty" | "expenses" | "taxes" | "contacts" | "settings";

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
  taxes: {
    enabled: true,
    name: "Impuestos",
    icon: "📋",
    description: "Gestión de impuestos",
  },
  contacts: {
    enabled: true,
    name: "Contactos",
    icon: "📋",
    description: "Gestión de contactos importantes",
  },
  settings: {
    enabled: true,
    name: "Configuración",
    icon: "⚙️",
    description: "Configuración avanzada",
  },
};

export default function ModulesPage() {
  const { user, isDemoMode } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const tenantId = useTenantId();
  const { features, error: featuresError } = useTenantFeatures();
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>(
    Object.fromEntries(Object.keys(MODULES).map((k) => [k, true])) as Record<ModuleKey, boolean>
  );
  const [authorizedModules, setAuthorizedModules] = useState<Set<ModuleKey>>(new Set());
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>({
    enabled: true,
    rewardThreshold: 2000,
    rewardType: "DISCOUNT_PERCENT",
    rewardValue: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (!user.permissions?.includes("settings.view")) { router.push("/dashboard"); return; }
  }, [user, router]);

  // Update modules when features load
  useEffect(() => {
    if (features) {
      // Ensure settings is always enabled and convert undefined to false
      const normalized: Record<ModuleKey, boolean> = {
        pos: features.pos ?? false,
        inventory: features.inventory ?? false,
        employees: features.employees ?? false,
        schedules: features.schedules ?? false,
        payroll: features.payroll ?? false,
        reports: features.reports ?? false,
        loyalty: features.loyalty ?? false,
        expenses: features.expenses ?? false,
        taxes: features.taxes ?? false,
        contacts: features.contacts ?? false,
        settings: true,
      };
      setModules(normalized);
    }
  }, [features]);

  // Load modules and loyalty settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!tenantId) return;
      try {
        if (isDemoMode) {
          // Demo mode is self-contained (enterprise plan, no real DB calls) — every module is authorized.
          setAuthorizedModules(new Set(Object.keys(MODULES) as ModuleKey[]));
        } else {
          // Load tenant plan and authorized modules
          const tenantRes = await fetch(`/api/tenants/${tenantId}`);
          if (tenantRes.ok) {
            const tenantData = await tenantRes.json();
            const tenantPlan = tenantData.plan || "basic";

            // Load plan configs to get authorized modules
            const planRes = await fetch("/api/superadmin/plan-configs");
            if (planRes.ok) {
              const planData = await planRes.json();
              const planConfig = planData.configs?.[tenantPlan] || {};

              // Get authorized modules for this plan (always include settings)
              const authorized = new Set<ModuleKey>(
                Object.entries(planConfig)
                  .filter(([_, enabled]) => enabled)
                  .map(([key]) => key as ModuleKey)
              );

              // Settings & Contacts are ALWAYS authorized for all users
              authorized.add("settings");
              authorized.add("contacts");

              setAuthorizedModules(authorized);
            }
          }
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
        setMessage({ type: "error", text: t("settings.modules.loadError") });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [tenantId, isDemoMode]);

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

      if (!res.ok) throw new Error(t("settings.modules.saveError"));

      setMessage({ type: "success", text: t("settings.modules.saveSuccess") });
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

      if (!res.ok) throw new Error(t("settings.modules.loyaltySaveError"));

      setMessage({ type: "success", text: t("settings.modules.loyaltySaveSuccess") });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="py-10 text-center text-slate-400">{t("settings.modules.loading")}</div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-8">
        {/* Header */}
        <Section
          title={t("settings.modules.pageTitle")}
          description={t("settings.modules.pageDesc")}
        />

        {/* Messages */}
        {message && (
          <Alert
            variant={message.type === "success" ? "success" : "error"}
            title={message.type === "success" ? t("common.success") : t("common.error")}
          >
            {message.text}
          </Alert>
        )}

        {/* Modules Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.modules.cardTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(MODULES) as ModuleKey[])
                .filter((key) => authorizedModules.has(key) && key !== "settings")
                .map((key) => (
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
                      {MODULES[key].icon} {t(`settings.modules.${key}Name` as "settings.modules.posName")}
                    </p>
                    <p className="text-xs text-slate-500">{t(`settings.modules.${key}Desc` as "settings.modules.posDesc")}</p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      modules[key] ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {modules[key] ? t("settings.modules.active") : t("settings.modules.inactive")}
                  </div>
                </label>
              ))}
            </div>

            {/* Settings - Always active, non-modifiable */}
            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {MODULES.settings.icon} {t("settings.modules.settingsName")}
                  </p>
                  <p className="text-xs text-slate-500">{t("settings.modules.settingsDesc")}</p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  {t("settings.modules.alwaysActive")}
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveModules}
              disabled={saving}
              variant="primary"
              loading={saving}
            >
              {t("settings.modules.saveBtn")}
            </Button>
          </CardContent>
        </Card>

        {/* Loyalty Configuration Section */}
        {modules.loyalty && (
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.modules.loyaltyTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                    {t("settings.modules.loyaltyEnable")}
                  </span>
                </label>
              </div>

              {loyaltySettings.enabled && (
                <>
                  {/* Reward Threshold */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      {t("settings.modules.loyaltyThresholdLabel")}
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
                      {t("settings.modules.loyaltyThresholdHint")}
                    </p>
                  </div>

                  {/* Reward Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      {t("settings.modules.loyaltyTypeLabel")}
                    </label>
                    <select
                      value={loyaltySettings.rewardType}
                      onChange={(e) =>
                        setLoyaltySettings((prev) => ({ ...prev, rewardType: e.target.value }))
                      }
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900 focus:ring-opacity-10"
                    >
                      <option value="DISCOUNT_PERCENT">{t("settings.modules.loyaltyTypePercent")}</option>
                      <option value="DISCOUNT_FIXED">{t("settings.modules.loyaltyTypeFixed")}</option>
                      <option value="FREE_ITEM">{t("settings.modules.loyaltyTypeFree")}</option>
                    </select>
                  </div>

                  {/* Reward Value */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      {t("settings.modules.loyaltyValueLabel")}
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
                        ? t("settings.modules.loyaltyValueHintPercent")
                        : t("settings.modules.loyaltyValueHintFixed")}
                    </p>
                  </div>
                </>
              )}

              <Button
                onClick={handleSaveLoyalty}
                disabled={saving}
                variant="primary"
                loading={saving}
              >
                {t("settings.modules.loyaltySaveBtn")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Container>
  );
}
