'use client';

/**
 * I18n Context
 * 
 * Provides language switching and translation access throughout the app
 */

import React, { createContext, useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  Locale,
  LOCALES,
} from '@/i18n/config';
import { getTranslation, loadTranslations } from '@/i18n/helpers';

type TranslationData = Record<string, any>;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: string, variables?: Record<string, string | number>) => string;
  translations: TranslationData | null;
  isLoading: boolean;
}

export const I18nContext = createContext<I18nContextType | undefined>(
  undefined
);

interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({
  children,
  initialLocale,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || DEFAULT_LOCALE);
  const [translations, setTranslations] = useState<TranslationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize translations on mount
  useEffect(() => {
    const initTranslations = async () => {
      try {
        // Try to get saved locale from localStorage
        const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
        const localeToLoad = savedLocale || initialLocale || DEFAULT_LOCALE;
        
        const loadedTranslations = await loadTranslations(localeToLoad);
        setLocaleState(localeToLoad);
        setTranslations(loadedTranslations);
      } catch (error) {
        console.error('Failed to initialize translations:', error);
        // Fallback to Spanish Nicaragua
        const loadedTranslations = await loadTranslations(DEFAULT_LOCALE);
        setLocaleState(DEFAULT_LOCALE);
        setTranslations(loadedTranslations);
      } finally {
        setIsLoading(false);
      }
    };

    initTranslations();
  }, []);

  const setLocale = useCallback(async (newLocale: Locale) => {
    setIsLoading(true);
    try {
      const loadedTranslations = await loadTranslations(newLocale);
      setLocaleState(newLocale);
      setTranslations(loadedTranslations);
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch (error) {
      console.error(`Failed to set locale to ${newLocale}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const t = useCallback(
    (key: string, variables?: Record<string, string | number>): string => {
      if (!translations) {
        return key; // Fallback while loading
      }
      return getTranslation(translations, key, variables);
    },
    [translations]
  );

  const value: I18nContextType = {
    locale,
    setLocale,
    t,
    translations,
    isLoading,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
