"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

interface LoyaltyConfig {
  enabled: boolean;
  rewardThreshold: number;
  rewardType: string;
  rewardValue: number;
  rewardProductId: string | null;
}

export default function LoyaltySettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const { features, loading: featuresLoading } = useTenantFeatures();
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>({
    enabled: true,
    rewardThreshold: 2000,
    rewardType: "DISCOUNT_PERCENT",
    rewardValue: 10,
    rewardProductId: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenantId") : null;

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const loadLoyaltyConfig = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [loyalRes, productsRes] = await Promise.all([
        fetch(`/api/tenants/${tenantId}/loyalty/settings`),
        fetch(`/api/tenants/${tenantId}/products?limit=200`),
      ]);
      if (loyalRes.ok) {
        const l = await loyalRes.json();
        setLoyaltyConfig({
          enabled: l.enabled ?? true,
          rewardThreshold: l.loyalty_reward_threshold ?? 2000,
          rewardType: l.loyalty_reward_type ?? "DISCOUNT_PERCENT",
          rewardValue: l.loyalty_reward_value ?? 10,
          rewardProductId: l.loyalty_reward_product_id ?? null,
        });
      }
      if (productsRes.ok) {
        const prods = await productsRes.json();
        setProducts((prods || []).map((p: any) => ({ id: p.id, name: p.name })));
      }
    } catch (e) {
      console.error("Error loading loyalty config:", e);
      showMessage("error", t("settings.loyalty.msgLoadError"));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (!user.permissions?.includes("settings.view")) { router.push("/dashboard"); return; }
  }, [user, router]);

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
          loyalty_module_enabled: loyaltyConfig.enabled,
          loyalty_reward_threshold: loyaltyConfig.rewardThreshold,
          loyalty_reward_type: loyaltyConfig.rewardType,
          loyalty_reward_value: loyaltyConfig.rewardValue,
          loyalty_reward_product_id: loyaltyConfig.rewardProductId,
        }),
      });
      if (res.ok) showMessage("success", t("settings.loyalty.msgSaved"));
      else showMessage("error", t("settings.loyalty.msgSaveError"));
    } catch {
      showMessage("error", t("settings.loyalty.msgConnError"));
    } finally {
      setSaving(false);
    }
  };

  if (featuresLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!features.loyalty) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("settings.loyalty.pageTitle")}</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            {t("settings.loyalty.notAvailable")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("settings.loyalty.pageTitle")}</h1>
        <Link href="/dashboard/settings" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
          {t("settings.loyalty.backLink")}
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
        <Card title={t("settings.loyalty.cardTitle")}>
          {loading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900">
                      {t("settings.loyalty.enableLabel")}
                    </label>
                    <p className="text-xs text-slate-500 mt-1">{t("settings.loyalty.enableDesc")}</p>
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
                      {t("settings.loyalty.thresholdLabel")}
                    </label>
                    <p className="text-xs text-slate-500 mb-2">{t("settings.loyalty.thresholdDesc")}</p>
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
                      {t("settings.loyalty.typeLabel")}
                    </label>
                    <select
                      value={loyaltyConfig.rewardType}
                      onChange={(e) =>
                        setLoyaltyConfig((prev) => ({ ...prev, rewardType: e.target.value, rewardProductId: null }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DISCOUNT_PERCENT">{t("settings.loyalty.typePercent")}</option>
                      <option value="DISCOUNT_FIXED">{t("settings.loyalty.typeFixed")}</option>
                      <option value="FREE_ITEM">{t("settings.loyalty.typeFree")}</option>
                    </select>
                  </div>

                  {loyaltyConfig.rewardType === "FREE_ITEM" ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-1">
                        {t("settings.loyalty.rewardProductLabel")}
                      </label>
                      <p className="text-xs text-slate-500 mb-2">{t("settings.loyalty.rewardProductHint")}</p>
                      <select
                        value={loyaltyConfig.rewardProductId || ""}
                        onChange={(e) =>
                          setLoyaltyConfig((prev) => ({ ...prev, rewardProductId: e.target.value || null }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t("settings.loyalty.rewardProductPlaceholder")}</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-1">
                        {t("settings.loyalty.valueLabel")}
                      </label>
                      <p className="text-xs text-slate-500 mb-2">
                        {loyaltyConfig.rewardType === "DISCOUNT_PERCENT"
                          ? t("settings.loyalty.valueHintPercent")
                          : t("settings.loyalty.valueHintFixed")}
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
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                    <span className="font-semibold">{t("settings.loyalty.exampleLabel")}</span>{" "}
                    {(loyaltyConfig.rewardType === "DISCOUNT_PERCENT"
                      ? t("settings.loyalty.exampleTextPercent")
                      : t("settings.loyalty.exampleTextFixed")
                    )
                      .replace("{{threshold}}", loyaltyConfig.rewardThreshold.toString())
                      .replace("{{value}}", loyaltyConfig.rewardValue.toString())}
                    </p>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <Button onClick={saveLoyaltyConfig} disabled={saving}>
                  {saving ? t("settings.loyalty.saving") : t("settings.loyalty.saveBtn")}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
