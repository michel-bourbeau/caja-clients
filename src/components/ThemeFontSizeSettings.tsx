"use client";

import { useState, useEffect } from "react";
import { useTheme, FONT_SIZE_MAP, type FontSize } from "@/context/ThemeContext";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/StripeUIComponents";
import { useLanguage } from "@/context/LanguageContext";

export const ThemeFontSizeSettings: React.FC = () => {
  const { t } = useLanguage();
  const { settings, updateTheme, setPreviewTheme } = useTheme();
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [saving, setSaving] = useState(false);

  const FONT_SIZE_OPTIONS: { value: FontSize; label: string; description: string }[] = [
    { value: "small", label: t("themeFontSize.smallLabel"), description: t("themeFontSize.smallDesc") },
    { value: "normal", label: t("themeFontSize.normalLabel"), description: t("themeFontSize.normalDesc") },
    { value: "large", label: t("themeFontSize.largeLabel"), description: t("themeFontSize.largeDesc") },
  ];

  useEffect(() => {
    setFontSize(settings.fontSize);
  }, [settings]);

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    setPreviewTheme({ fontSize: size });
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    try {
      await updateTheme({
        themeColor: settings.themeColor,
        fontSize,
        logoUrl: settings.logoUrl,
      });
    } catch (err) {
      console.error("Error saving theme:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Font Size Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("themeFontSize.cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {FONT_SIZE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  fontSize === option.value
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="fontSize"
                  value={option.value}
                  checked={fontSize === option.value}
                  onChange={(e) => handleFontSizeChange(e.target.value as FontSize)}
                  className="w-4 h-4"
                />
                <p className="mt-3 font-medium text-slate-900">{option.label}</p>
                <p className="text-xs text-slate-500 mt-1">{option.description}</p>
              </label>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
            <Button
              onClick={handleSaveTheme}
              disabled={saving}
              variant="primary"
              loading={saving}
            >
              {t("themeFontSize.save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
