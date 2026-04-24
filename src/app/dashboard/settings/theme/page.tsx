"use client";

import { useState, useEffect } from "react";
import { useTheme, THEME_SCHEMES, FONT_SIZE_MAP, type ThemeColor, type FontSize } from "@/context/ThemeContext";
import { useTenantId } from "@/lib/utils/tenant";
import { Button, Card, CardContent, CardHeader, CardTitle, Alert, Section, Container } from "@/components/StripeUIComponents";

const THEME_OPTIONS: { value: ThemeColor; label: string; description: string }[] = [
  { value: "slate", label: "Gris (Por defecto)", description: "Profesional y neutro" },
  { value: "blue", label: "Azul", description: "Confianza y seguridad" },
  { value: "green", label: "Verde", description: "Crecimiento y frescura" },
  { value: "purple", label: "Púrpura", description: "Creatividad y lujo" },
  { value: "orange", label: "Naranja", description: "Energía y dinamismo" },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; description: string }[] = [
  { value: "small", label: "Pequeño", description: "Compacto y denso" },
  { value: "normal", label: "Normal", description: "Tamaño estándar" },
  { value: "large", label: "Grande", description: "Mejor legibilidad" },
];

export default function ThemePage() {
  const tenantId = useTenantId();
  const { settings, updateTheme, setPreviewTheme, loading: themeLoading } = useTheme();
  const [themeColor, setThemeColor] = useState<ThemeColor>("slate");
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setThemeColor(settings.themeColor);
    setFontSize(settings.fontSize);
    setLogoPreview(settings.logoUrl || "");
  }, [settings]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Por favor selecciona una imagen válida" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "La imagen debe ser menor a 5MB" });
      return;
    }

    setLogoFile(file);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
      setPreviewTheme({ logoUrl: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleThemeColorChange = (color: ThemeColor) => {
    setThemeColor(color);
    setPreviewTheme({ themeColor: color });
  };

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    setPreviewTheme({ fontSize: size });
  };

  const handleSaveTheme = async () => {
    if (!tenantId) return;
    setSaving(true);

    try {
      // Upload logo if selected
      let logoUrl = settings.logoUrl;
      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        formData.append("type", "logo");

        const uploadRes = await fetch(`/api/tenants/${tenantId}/uploads`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Error al subir logo");
        const uploaded = await uploadRes.json();
        logoUrl = uploaded.url;
      }

      // Update theme settings
      await updateTheme({
        themeColor,
        fontSize,
        logoUrl,
      });

      setMessage({ type: "success", text: "Tema guardado exitosamente" });
      setLogoFile(null);
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (themeLoading) {
    return (
      <Container>
        <div className="py-10 text-center text-slate-400">Cargando configuración de tema...</div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-8">
        {/* Header */}
        <Section
          title="Personalización de Tema"
          description="Personaliza la apariencia visual de tu aplicación"
        />

        {/* Messages */}
        {message && (
          <Alert
            variant={message.type === "success" ? "success" : "error"}
            title={message.type === "success" ? "Éxito" : "Error"}
          >
            {message.text}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Logo Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle>Logo de Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Preview */}
              {logoPreview && (
                <div className="flex justify-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <img src={logoPreview} alt="Logo preview" className="max-h-24 max-w-xs object-contain" />
                </div>
              )}

              {/* File Upload */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-slate-900 file:text-white
                    hover:file:bg-slate-700
                    cursor-pointer"
                />
              </div>

              <p className="text-xs text-slate-500">
                📷 PNG, JPG o WebP · Máx 5MB · Se recomienda logo cuadrado (200x200px)
              </p>
            </CardContent>
          </Card>

          {/* Color Theme Card */}
          <Card>
            <CardHeader>
              <CardTitle>Paleta de Colores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {THEME_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    themeColor === option.value
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={option.value}
                    checked={themeColor === option.value}
                    onChange={(e) => handleThemeColorChange(e.target.value as ThemeColor)}
                    className="w-4 h-4"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-slate-900">{option.label}</p>
                    <p className="text-xs text-slate-500">{option.description}</p>
                  </div>
                  <div className={`w-6 h-6 rounded ${THEME_SCHEMES[option.value].badge}`}></div>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Font Size Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Tamaño de Letra Global</CardTitle>
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
                    <p className={`mt-3 font-medium ${FONT_SIZE_MAP[option.value]} text-center`}>
                      {option.label}
                    </p>
                    <p className={`text-xs text-slate-500 text-center mt-2 ${FONT_SIZE_MAP[option.value]}`}>
                      {option.description}
                    </p>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Vista Previa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`${THEME_SCHEMES[themeColor].bg} ${FONT_SIZE_MAP[fontSize]} rounded-lg p-6 text-white`}>
                <div className="flex items-center gap-4 mb-4">
                  {logoPreview && <img src={logoPreview} alt="Logo" className="w-10 h-10 rounded" />}
                  <h3 className="font-bold">Mi Empresa</h3>
                </div>
                <p>Este es un ejemplo de cómo se verá tu aplicación con el tema y tamaño de letra seleccionados.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button
            onClick={handleSaveTheme}
            disabled={saving}
            variant="primary"
            loading={saving}
          >
            ✓ Guardar Personalización
          </Button>
        </div>
      </div>
    </Container>
  );
