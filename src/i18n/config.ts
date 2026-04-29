/**
 * i18n Configuration
 * 
 * Supports multiple locales for Caja POS System:
 * - es-ni: Español de Nicaragua (Default)
 * - en: English
 * - fr: Français
 */

export const LOCALES = {
  ES_NI: 'es-ni',
  EN: 'en',
  FR: 'fr',
} as const;

export type Locale = (typeof LOCALES)[keyof typeof LOCALES];

export const DEFAULT_LOCALE: Locale = LOCALES.ES_NI;

export const LOCALE_LABELS: Record<Locale, string> = {
  'es-ni': 'Español',
  'en': 'English',
  'fr': 'Français',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  'es-ni': 'ni',
  'en': 'us',
  'fr': 'fr',
};

/** Returns the FlagCDN URL for a given country code */
export function getFlagUrl(code: string, width: 20 | 40 | 80 = 20): string {
  return `https://flagcdn.com/w${width}/${code}.png`;
}

/**
 * Storage key for user's language preference
 */
export const LOCALE_STORAGE_KEY = 'caja_locale';
