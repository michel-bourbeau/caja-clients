"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, Button, Alert, Section, Container } from "@/components/StripeUIComponents";
import { PageIcon, LoadingSpinner } from "@/components";
import { DollarSign } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

interface ExchangeSettings {
  usdExchangeRate: number;
}

export default function ExchangeRatePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
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
      showMessage("error", t("settings.exchangeRate.msgLoadError"));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (!user.permissions?.includes("settings.view")) { router.push("/dashboard"); return; }
  }, [user, router]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!tenantId) return;

    const rate = parseFloat(tempRate);
    if (isNaN(rate) || rate <= 0) {
      showMessage("error", t("settings.exchangeRate.msgInvalidRate"));
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
        showMessage("success", t("settings.exchangeRate.msgSaved"));
      } else {
        showMessage("error", t("settings.exchangeRate.msgSaveError"));
      }
    } catch (e) {
      console.error("Error:", e);
      showMessage("error", t("settings.exchangeRate.msgConnError"));
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
            <h1 className="text-3xl font-bold text-slate-900">{t("settings.exchangeRate.pageTitle")}</h1>
            <p className="text-slate-600 mt-1">{t("settings.exchangeRate.pageDesc")}</p>
          </div>
          <Link href="/dashboard/settings" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            {t("settings.exchangeRate.backLink")}
          </Link>
        </div>

        {/* Messages */}
        {message && (
          <Alert
            variant={message.type === "success" ? "success" : "error"}
            title={message.type === "success" ? t("common.success") : t("common.error")}
          >
            {message.text}
          </Alert>
        )}

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="text-blue-600" size={24} />
              {t("settings.exchangeRate.cardTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-slate-600 text-sm">
              {t("settings.exchangeRate.cardDesc")}
            </p>

            {/* Exchange Rate Input */}
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-6 rounded-lg border border-blue-200">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("settings.exchangeRate.rateLabel")}
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
                    <span className="text-slate-500 text-sm whitespace-nowrap">{t("settings.exchangeRate.rateUnit")}</span>
                  </div>
                </div>

                {/* Conversion Preview */}
                <div className="bg-white p-4 rounded border border-blue-200">
                  <p className="text-sm text-slate-600 mb-2">{t("settings.exchangeRate.previewTitle")}</p>
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
                    {t("settings.exchangeRate.note")}
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
                {t("settings.exchangeRate.cancelBtn")}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? t("settings.exchangeRate.saving") : t("settings.exchangeRate.saveBtn")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.exchangeRate.infoTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">{t("settings.exchangeRate.infoPOSTitle")}</h4>
                <p>{t("settings.exchangeRate.infoPOSDesc")}</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">{t("settings.exchangeRate.infoCalcTitle")}</h4>
                <p>{t("settings.exchangeRate.infoCalcDesc")}</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">{t("settings.exchangeRate.infoHistoryTitle")}</h4>
                <p>{t("settings.exchangeRate.infoHistoryDesc")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
