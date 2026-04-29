"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { LOCALES, LOCALE_LABELS, LOCALE_FLAGS, Locale } from "@/i18n/config";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  /** compact: show only flag + arrow (for tight spaces like sidebar) */
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, localeFlag, localeLabel } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const options: { locale: Locale; flag: string; label: string }[] = [
    { locale: LOCALES.ES_NI, flag: LOCALE_FLAGS["es-ni"], label: LOCALE_LABELS["es-ni"] },
    { locale: LOCALES.EN,    flag: LOCALE_FLAGS["en"],    label: LOCALE_LABELS["en"]    },
    { locale: LOCALES.FR,    flag: LOCALE_FLAGS["fr"],    label: LOCALE_LABELS["fr"]    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
        title="Change language"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <span className="text-base leading-none">{localeFlag}</span>
        {!compact && (
          <span className="hidden sm:inline font-medium">{localeLabel}</span>
        )}
        <svg className={`w-3 h-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1" role="listbox">
          {options.map((opt) => (
            <button
              key={opt.locale}
              role="option"
              aria-selected={locale === opt.locale}
              onClick={() => { setLocale(opt.locale); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                locale === opt.locale
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-700"
              }`}
            >
              <span className="text-lg leading-none">{opt.flag}</span>
              <span>{opt.label}</span>
              {locale === opt.locale && (
                <svg className="w-4 h-4 ml-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
