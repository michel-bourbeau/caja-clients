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
  'es-ni': 'Español (Nicaragua)',
  'en': 'English',
  'fr': 'Français',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  'es-ni': '🇳🇮',
  'en': '🇺🇸',
  'fr': '🇫🇷',
};

/**
 * Storage key for user's language preference
 */
export const LOCALE_STORAGE_KEY = 'caja_locale';
