"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeColor = "slate" | "blue" | "green" | "purple" | "orange";
export type FontSize = "small" | "normal" | "large";

interface ThemeSettings {
  themeColor: ThemeColor;
  fontSize: FontSize;
  logoUrl?: string;
}

interface ThemeContextType {
  settings: ThemeSettings;
  updateTheme: (settings: Partial<ThemeSettings>) => Promise<void>;
  setPreviewTheme: (settings: Partial<ThemeSettings>) => void;
  loading: boolean;
  error: string | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Define color schemes for each theme
export const THEME_SCHEMES: Record<ThemeColor, { bg: string; text: string; accent: string; border: string; badge: string }> = {
  slate: {
    bg: "bg-slate-900",
    text: "text-slate-900",
    accent: "bg-slate-800",
    border: "border-slate-300",
    badge: "bg-slate-100 text-slate-700",
  },
  blue: {
    bg: "bg-blue-900",
    text: "text-blue-900",
    accent: "bg-blue-800",
    border: "border-blue-300",
    badge: "bg-blue-100 text-blue-700",
  },
  green: {
    bg: "bg-green-900",
    text: "text-green-900",
    accent: "bg-green-800",
    border: "border-green-300",
    badge: "bg-green-100 text-green-700",
  },
  purple: {
    bg: "bg-purple-900",
    text: "text-purple-900",
    accent: "bg-purple-800",
    border: "border-purple-300",
    badge: "bg-purple-100 text-purple-700",
  },
  orange: {
    bg: "bg-orange-900",
    text: "text-orange-900",
    accent: "bg-orange-800",
    border: "border-orange-300",
    badge: "bg-orange-100 text-orange-700",
  },
};

// Font size presets
export const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: "text-xs",
  normal: "text-sm",
  large: "text-base",
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ThemeSettings>({
    themeColor: "slate",
    fontSize: "normal",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load theme settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const tenantId = localStorage.getItem("tenantId");
        if (!tenantId) {
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/tenants/${tenantId}/settings`);
        if (!res.ok) throw new Error("Failed to load settings");

        const data = await res.json();
        setSettings({
          themeColor: (data.theme_color || "slate") as ThemeColor,
          fontSize: (data.font_size || "normal") as FontSize,
          logoUrl: data.logo_url,
        });
      } catch (err) {
        console.error("Failed to load theme settings:", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Apply font size globally to <html> element
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const htmlElement = document.documentElement;
    const fontSizeClass = FONT_SIZE_MAP[settings.fontSize];
    
    // Remove all font size classes
    htmlElement.classList.remove("text-xs", "text-sm", "text-base");
    
    // Add the new font size class
    htmlElement.classList.add(fontSizeClass);
    

  }, [settings.fontSize]);

  const updateTheme = async (newSettings: Partial<ThemeSettings>) => {
    try {
      const tenantId = localStorage.getItem("tenantId");
      if (!tenantId) throw new Error("No tenant ID");

      const payload = {
        theme_color: newSettings.themeColor || settings.themeColor,
        font_size: newSettings.fontSize || settings.fontSize,
        logo_url: newSettings.logoUrl !== undefined ? newSettings.logoUrl : settings.logoUrl,
      };



      const res = await fetch(`/api/tenants/${tenantId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();


      if (!res.ok) {
        throw new Error(responseData.error || `Error ${res.status}`);
      }

      setSettings({
        themeColor: responseData.themeColor || "slate",
        fontSize: responseData.fontSize || "normal",
        logoUrl: responseData.logoUrl,
      });


      // Trigger browser to reload styles
      window.dispatchEvent(new Event("themechange"));
    } catch (err) {
      const message = (err as Error).message;
      console.error("❌ Error al actualizar tema:", message);
      setError(message);
      throw err;
    }
  };

  const setPreviewTheme = (newSettings: Partial<ThemeSettings>) => {

    setSettings(prev => ({
      ...prev,
      themeColor: newSettings.themeColor ?? prev.themeColor,
      fontSize: newSettings.fontSize ?? prev.fontSize,
      logoUrl: newSettings.logoUrl !== undefined ? newSettings.logoUrl : prev.logoUrl,
    }));
  };

  return (
    <ThemeContext.Provider value={{ settings, updateTheme, setPreviewTheme, loading, error }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
