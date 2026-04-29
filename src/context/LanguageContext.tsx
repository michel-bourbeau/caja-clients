"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Locale, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, LOCALE_LABELS, LOCALE_FLAGS } from "@/i18n/config";

import esNi from "@/i18n/locales/es-ni.json";
import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";

const translations: Record<Locale, Record<string, unknown>> = {
  "es-ni": esNi as Record<string, unknown>,
  en: en as Record<string, unknown>,
  fr: fr as Record<string, unknown>,
};

function resolve(obj: unknown, key: string, vars?: Record<string, string | number>): string {
  const parts = key.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    cur = (cur as Record<string, unknown>)?.[p];
    if (cur === undefined) return key;
  }
  if (typeof cur !== "string") return key;
  if (!vars) return cur;
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{{${k}}}`, String(v)), cur);
}

interface LanguageContextType {
  locale: Locale;
  /** User explicitly chooses a language — saved to localStorage, overrides tenant default */
  setLocale: (locale: Locale) => void;
  /** Tenant admin sets default — applies only when user has no personal preference */
  setTenantDefault: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  localeLabel: string;
  localeFlag: string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  setTenantDefault: () => {},
  t: (key) => key,
  localeLabel: LOCALE_LABELS[DEFAULT_LOCALE],
  localeFlag: LOCALE_FLAGS[DEFAULT_LOCALE],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  // Track whether the user has a personal preference (from localStorage)
  const hasPersonalPref = useRef(false);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
      if (saved && saved in translations) {
        setLocaleState(saved);
        hasPersonalPref.current = true;
      }
    } catch {
      // localStorage not available (SSR or private browsing)
    }
  }, []);

  /** User-initiated change: save to localStorage */
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    hasPersonalPref.current = true;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, l);
    } catch { /* ignore */ }
  }, []);

  /** Tenant default: only applies if user has no personal preference */
  const setTenantDefault = useCallback((l: Locale) => {
    if (!hasPersonalPref.current && l in translations) {
      setLocaleState(l);
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => resolve(translations[locale], key, vars),
    [locale]
  );

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        setTenantDefault,
        t,
        localeLabel: LOCALE_LABELS[locale],
        localeFlag: LOCALE_FLAGS[locale],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

