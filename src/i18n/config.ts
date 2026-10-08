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

/** Maps the app's active locale to an `Intl`/`toLocaleDateString` locale code. */
export const INTL_LOCALES: Record<Locale, string> = {
  'es-ni': 'es-NI',
  'en': 'en-US',
  'fr': 'fr-FR',
};

/** Returns the `Intl` locale code (e.g. "es-NI", "en-US", "fr-FR") for the active app locale — use with `toLocaleDateString`/`Intl.DateTimeFormat` so dates follow the active language. */
export function getIntlLocale(locale: Locale): string {
  return INTL_LOCALES[locale] ?? INTL_LOCALES[DEFAULT_LOCALE];
}

/** Returns the FlagCDN URL for a given country code */
export function getFlagUrl(code: string, width: 20 | 40 | 80 = 20): string {
  return `https://flagcdn.com/w${width}/${code}.png`;
}

/**
 * Storage key for user's language preference
 */
export const LOCALE_STORAGE_KEY = 'caja_locale';
