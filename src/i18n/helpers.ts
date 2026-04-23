/**
 * i18n Helper Functions
 * 
 * Utilities for loading and managing translations
 */

import { Locale, LOCALES } from './config';

type TranslationData = Record<string, any>;

// Cache for loaded translations
const translationCache: Record<Locale, TranslationData | null> = {
  'es-ni': null,
  'en': null,
  'fr': null,
};

/**
 * Load translations for a specific locale
 */
export async function loadTranslations(locale: Locale): Promise<TranslationData> {
  // Return from cache if already loaded
  if (translationCache[locale]) {
    return translationCache[locale];
  }

  try {
    // Dynamically import the translation file
    const translations = await import(`./locales/${locale}.json`);
    translationCache[locale] = translations.default;
    return translations.default;
  } catch (error) {
    console.error(`Failed to load translations for locale: ${locale}`, error);
    // Fallback to Spanish Nicaragua if loading fails
    if (locale !== LOCALES.ES_NI) {
      return loadTranslations(LOCALES.ES_NI);
    }
    return {};
  }
}

/**
 * Get nested translation value using dot notation
 * Example: t('auth.errors.invalidCredentials')
 */
export function getTranslation(
  translations: TranslationData,
  key: string,
  variables?: Record<string, string | number>
): string {
  const keys = key.split('.');
  let value: any = translations;

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {

      return key; // Return the key itself as fallback
    }
  }

  if (typeof value !== 'string') {

    return key;
  }

  // Replace variables in template strings
  if (variables) {
    let result = value;
    for (const [varName, varValue] of Object.entries(variables)) {
      result = result.replace(`{{${varName}}}`, String(varValue));
    }
    return result;
  }

  return value;
}

/**
 * Validate that all required translation keys exist in all locales
 * Useful for development to catch missing translations
 */
export async function validateTranslations(): Promise<void> {
  const locales = Object.values(LOCALES);
  const translations: Record<Locale, TranslationData> = {} as any;

  // Load all translations
  for (const locale of locales) {
    translations[locale as Locale] = await loadTranslations(locale as Locale);
  }

  // Get all keys from default locale
  const defaultLocale = LOCALES.ES_NI;
  const getAllKeys = (obj: any, prefix = ''): string[] => {
    const keys: string[] = [];
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys.push(...getAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  };

  const defaultKeys = getAllKeys(translations[defaultLocale]);

  // Check that all keys exist in other locales
  for (const locale of locales) {
    if (locale === defaultLocale) continue;

    const otherKeys = getAllKeys(translations[locale]);
    const missingKeys = defaultKeys.filter((key) => !otherKeys.includes(key));

    if (missingKeys.length > 0) {
      console.warn(
        `Missing translations in ${locale}: ${missingKeys.join(', ')}`
      );
    }
  }
}
