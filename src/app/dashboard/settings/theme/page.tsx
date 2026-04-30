"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme, FONT_SIZE_MAP, type FontSize } from "@/context/ThemeContext";
import { useTenantId } from "@/lib/utils/tenant";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Button, Card, CardContent, CardHeader, CardTitle, Alert, Section, Container } from "@/components/StripeUIComponents";

// font size values only — labels come from i18n
const FONT_SIZE_VALUES: FontSize[] = ["small", "normal", "large"];

export default function ThemePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const tenantId = useTenantId();
  const { settings, updateTheme, setPreviewTheme, loading: themeLoading } = useTheme();
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (!user.permissions?.includes("settings.view")) { router.push("/dashboard"); return; }
  }, [user, router]);

  useEffect(() => {
    setFontSize(settings.fontSize);
  }, [settings]);

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    setPreviewTheme({ fontSize: size });
  };

  const handleSaveTheme = async () => {
    if (!tenantId) return;
    setSaving(true);

    try {
      await updateTheme({
        themeColor: settings.themeColor,
        fontSize,
        logoUrl: settings.logoUrl,
      });

      setMessage({ type: "success", text: t("settings.theme.msgSaved") });
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (themeLoading) {
    return (
      <Container>
        <div className="py-10 text-center text-slate-400">{t("settings.theme.loading")}</div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Section
            title={t("settings.theme.pageTitle")}
            description={t("settings.theme.pageDesc")}
          />
          <Link href="/dashboard/settings" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            {t("settings.theme.backLink")}
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

        {/* Font Size Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.theme.fontSizeCardTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {FONT_SIZE_VALUES.map((size) => {
                const labelKey = `settings.theme.font${size.charAt(0).toUpperCase()}${size.slice(1)}` as "settings.theme.fontSmall";
                const descKey = `settings.theme.font${size.charAt(0).toUpperCase()}${size.slice(1)}Desc` as "settings.theme.fontSmallDesc";
                return (
                <label
                  key={size}
                  className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    fontSize === size
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="fontSize"
                    value={size}
                    checked={fontSize === size}
                    onChange={(e) => handleFontSizeChange(e.target.value as FontSize)}
                    className="w-4 h-4"
                  />
                  <p className="mt-3 font-medium text-slate-900">{t(labelKey)}</p>
                  <p className="text-xs text-slate-500 mt-1">{t(descKey)}</p>
                </label>
              );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.theme.previewCardTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 bg-white p-6 rounded-lg border border-slate-200">
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-3">{t("settings.theme.previewH1Label")}</p>
              <h1 className="text-4xl font-bold text-slate-900">{t("settings.theme.previewH1Text")}</h1>
            </div>
            
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-3">{t("settings.theme.previewH2Label")}</p>
              <h2 className="text-2xl font-bold text-slate-900">{t("settings.theme.previewH2Text")}</h2>
            </div>
            
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-3">{t("settings.theme.previewBodyLabel")}</p>
              <p className="text-slate-900">
                {t("settings.theme.previewBodyText")}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-3">{t("settings.theme.previewSmallLabel")}</p>
              <p className="text-xs text-slate-600">{t("settings.theme.previewSmallText")}</p>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-3">Botón de Ejemplo</p>
              <Button variant="primary" disabled>{t("settings.theme.previewBtnText")}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveTheme}
            disabled={saving}
            variant="primary"
          >
            {saving ? t("settings.theme.saving") : t("settings.theme.saveBtn")}
          </Button>
        </div>
      </div>
    </Container>
  );
}
