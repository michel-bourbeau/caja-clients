"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme, FONT_SIZE_MAP, type FontSize } from "@/context/ThemeContext";
import { useTenantId } from "@/lib/utils/tenant";
import { useAuth } from "@/context/AuthContext";
import { Button, Card, CardContent, CardHeader, CardTitle, Alert, Section, Container } from "@/components/StripeUIComponents";

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; description: string }[] = [
  { value: "small", label: "Pequeño", description: "Compacto y denso" },
  { value: "normal", label: "Normal", description: "Tamaño estándar" },
  { value: "large", label: "Grande", description: "Mejor legibilidad" },
];

export default function ThemePage() {
  const { user } = useAuth();
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

      setMessage({ type: "success", text: "Tema guardado exitosamente" });
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
        <div className="flex items-center justify-between">
          <Section
            title="Personalización de Tema"
            description="Ajusta el tamaño global de la letra en tu aplicación"
          />
          <Link href="/dashboard/settings" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            ← Volver a Configuración General
          </Link>
        </div>

        {/* Messages */}
        {message && (
          <Alert
            variant={message.type === "success" ? "success" : "error"}
            title={message.type === "success" ? "Éxito" : "Error"}
          >
            {message.text}
          </Alert>
        )}

        {/* Font Size Card */}
        <Card>
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
                  <p className="mt-3 font-medium text-slate-900">{option.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{option.description}</p>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 bg-white p-6 rounded-lg border border-slate-200">
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-3">Encabezado Principal (H1)</p>
              <h1 className="text-4xl font-bold text-slate-900">Ejemplo de Título Principal</h1>
            </div>
            
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-3">Encabezado Secundario (H2)</p>
              <h2 className="text-2xl font-bold text-slate-900">Ejemplo de Subtítulo</h2>
            </div>
            
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-3">Texto Normal</p>
              <p className="text-slate-900">
                Este es un ejemplo de texto normal. Puedes ver cómo se ve el tamaño de letra que has seleccionado en toda la aplicación. Este tamaño se aplicará a los párrafos principales del sistema.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-3">Texto Pequeño (Helper)</p>
              <p className="text-xs text-slate-600">Este es un texto pequeño de ayuda o descripción. Se utiliza para notas, etiquetas y texto secundario.</p>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-3">Botón de Ejemplo</p>
              <Button variant="primary" disabled>Ejemplo de Botón</Button>
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
            {saving ? "Guardando..." : "💾 Guardar Cambios"}
          </Button>
        </div>
      </div>
    </Container>
  );
}
