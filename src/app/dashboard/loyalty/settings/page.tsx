"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { LoyaltyService } from "@/features/loyalty/services";
import { useTenantId } from "@/lib/utils/tenant";
import { FeatureGuard } from "@/components/FeatureGuard";
import { EmptyState, LoadingSpinner } from "@/components";
import { useLanguage } from "@/context/LanguageContext";

export default function LoyaltySettingsPage() {
  const tenantId = useTenantId();
  const { t } = useLanguage();
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
      await LoyaltyService.updateLoyaltySettings(tenantId, settings);
      setMessage(t("loyaltySettings.savedOk"));
      setMessageType("success");

      setTimeout(() => {
        setMessage(null);
        setMessageType(null);
      }, 3000);
    } catch (error: any) {
      setMessage(error.message || t("loyaltySettings.saveError"));
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <EmptyState state="loading" />;
  }

  return (
    <FeatureGuard feature="loyalty">
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("loyaltySettings.title")}</h1>
          <p className="text-gray-600">{t("loyaltySettings.subtitle")}</p>
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
              <label className="text-sm font-semibold text-gray-900">{t("loyaltySettings.moduleLabel")}</label>
              <p className="text-sm text-gray-600 mt-1">{t("loyaltySettings.moduleDesc")}</p>
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
                {t("loyaltySettings.thresholdLabel")}
              </label>
              <p className="text-sm text-gray-600 mb-3">
                {t("loyaltySettings.thresholdDesc")}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-900"
              />
            </div>

            {/* Reward Type */}
            <div>
              <label htmlFor="rewardType" className="block text-sm font-semibold text-gray-900 mb-2">
                {t("loyaltySettings.rewardTypeLabel")}
              </label>
              <select
                id="rewardType"
                value={settings.loyalty_reward_type}
                onChange={(e) =>
                  setSettings({ ...settings, loyalty_reward_type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              >
                <option value="DISCOUNT_PERCENT">{t("loyaltySettings.typeDiscountPct")}</option>
                <option value="DISCOUNT_FIXED">{t("loyaltySettings.typeDiscountFixed")}</option>
                <option value="POINTS">{t("loyaltySettings.typePoints")}</option>
                <option value="GIFT">{t("loyaltySettings.typeGift")}</option>
              </select>
            </div>

            {/* Reward Value */}
            <div>
              <label htmlFor="rewardValue" className="block text-sm font-semibold text-gray-900 mb-2">
                {t("loyaltySettings.rewardValueLabel")}
              </label>
              <p className="text-sm text-gray-600 mb-3">
                {settings.loyalty_reward_type === "DISCOUNT_PERCENT"
                  ? t("loyaltySettings.rewardValueDescPct")
                  : settings.loyalty_reward_type === "DISCOUNT_FIXED"
                  ? t("loyaltySettings.rewardValueDescFixed")
                  : t("loyaltySettings.rewardValueDescOther")}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-900"
              />
            </div>

            {/* Preview */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900">{t("loyaltySettings.exampleTitle")}</p>
              <p className="text-sm text-blue-700 mt-1">
                {t("loyaltySettings.exampleSpends")}{" "}
                <span className="font-semibold">{settings.loyalty_reward_threshold.toLocaleString()} C$</span>
                {t("loyaltySettings.exampleReceives")}{" "}
                <span className="font-semibold">
                  {settings.loyalty_reward_value}
                  {settings.loyalty_reward_type === "DISCOUNT_PERCENT" ? "%" : " C$"}
                </span>{" "}
                {t("loyaltySettings.exampleOf")}{" "}
                {settings.loyalty_reward_type === "DISCOUNT_PERCENT"
                  ? t("loyaltySettings.exampleDiscount")
                  : t("loyaltySettings.exampleReward")}
              </p>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-6 border-t">
          <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? t("loyaltySettings.saving") : t("loyaltySettings.save")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => loadSettings()}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>

      {/* Info Box */}
      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-sm font-semibold text-amber-900">{t("loyaltySettings.tipTitle")}</p>
        <ul className="text-sm text-amber-800 mt-2 space-y-1 list-disc pl-5">
          <li>{t("loyaltySettings.tip1")}</li>
          <li>{t("loyaltySettings.tip2")}</li>
          <li>{t("loyaltySettings.tip3")}</li>
          <li>{t("loyaltySettings.tip4")}</li>
        </ul>
      </div>
      </div>
    </FeatureGuard>
  );
}
