# 📚 I18n Implementation Guide

## Overview

This document provides a complete guide for implementing internationalization (i18n) throughout the Caja POS application. The system supports three locales:

- **es-ni** - Español de Nicaragua (Default)
- **en** - English
- **fr** - Français

## Structure

```
src/
├── i18n/
│   ├── config.ts           # Locale configuration and constants
│   ├── helpers.ts          # Translation loading and utility functions
│   └── locales/
│       ├── es-ni.json      # Spanish translations (default)
│       ├── en.json         # English translations
│       └── fr.json         # French translations
├── context/
│   └── I18nContext.tsx     # I18n provider and context
└── hooks/
    └── useTranslation.ts   # Custom hook for accessing i18n
```

## Getting Started

### Step 1: Wrap Your App with I18nProvider

In your root layout file (`src/app/layout.tsx`):

```tsx
import { I18nProvider } from '@/context/I18nContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <I18nProvider>
          {/* Your other providers and components */}
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
```

### Step 2: Use the useTranslation Hook in Components

```tsx
'use client';

import { useTranslation } from '@/hooks/useTranslation';

export default function LoginPage() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <div>
      <h1>{t('auth.login')}</h1>
      <label>{t('auth.email')}</label>
      <input placeholder={t('auth.email')} />
      
      <button onClick={() => setLocale('es-ni')}>
        Español
      </button>
      <button onClick={() => setLocale('en')}>
        English
      </button>
      <button onClick={() => setLocale('fr')}>
        Français
      </button>
    </div>
  );
}
```

## Usage Patterns

### Simple Translation

```tsx
const { t } = useTranslation();
return <button>{t('common.save')}</button>;
```

### Translation with Variables

```tsx
const { t } = useTranslation();
return (
  <p>
    {t('payroll.additionalPayment', { hours: 8 })}
  </p>
);
```

### Accessing Current Locale

```tsx
const { locale } = useTranslation();
console.log(`Current locale: ${locale}`); // 'es-ni', 'en', or 'fr'
```

### Switching Locale

```tsx
const { setLocale } = useTranslation();

async function handleChangeLanguage(newLocale: Locale) {
  await setLocale(newLocale);
  // Translations will automatically update throughout the app
}
```

### Conditional Rendering Based on Locale

```tsx
const { locale } = useTranslation();

return (
  <div>
    {locale === 'es-ni' && <p>Contenido específico de Nicaragua</p>}
    {locale === 'en' && <p>English-specific content</p>}
  </div>
);
```

## Adding Translations

### Adding a New Key

1. **Add to all locale files** - Update `es-ni.json`, `en.json`, and `fr.json`:

```json
{
  "myFeature": {
    "myKey": "My translation"
  }
}
```

2. **Use in your component**:

```tsx
const { t } = useTranslation();
return <div>{t('myFeature.myKey')}</div>;
```

### Adding Keys with Variables

1. **Define in translation files** with template syntax:

```json
{
  "payroll": {
    "paymentNotice": "Payment of {{amount}}$ for {{employee}} recorded"
  }
}
```

2. **Use in component with variables**:

```tsx
const { t } = useTranslation();
return (
  <p>
    {t('payroll.paymentNotice', {
      amount: 1500,
      employee: 'John Doe'
    })}
  </p>
);
```

## Migration from Hardcoded Text

### Before (Current State)

```tsx
export default function PayrollPage() {
  return (
    <div>
      <h1>Nómina</h1>
      <button>Pagar empleado</button>
      <p>Correo electrónico</p>
    </div>
  );
}
```

### After (With i18n)

```tsx
'use client';

import { useTranslation } from '@/hooks/useTranslation';

export default function PayrollPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('payroll.title')}</h1>
      <button>{t('payroll.payEmployee')}</button>
      <p>{t('auth.email')}</p>
    </div>
  );
}
```

## Translation Key Organization

Keys are organized by feature/section to maintain clarity:

```
common.*           # Shared UI elements (Yes, No, Save, Cancel, etc.)
auth.*             # Authentication (Login, Password, Errors, etc.)
superadmin.*       # SuperAdmin console
dashboard.*        # Main dashboard areas
payroll.*          # Payroll/Nomina
inventory.*        # Inventory management
transactions.*     # Transaction tracking
loyalty.*          # Loyalty program
settings.*         # Settings pages
errors.*           # Error messages
validation.*       # Form validation messages
```

## Configuration

### Default Locale

Set in `src/i18n/config.ts`:

```typescript
export const DEFAULT_LOCALE: Locale = LOCALES.ES_NI;
```

### Storage Key

User's locale preference is saved in localStorage at:

```typescript
export const LOCALE_STORAGE_KEY = 'caja_locale';
```

## Advanced Features

### Client-Side Locale Switching Component

```tsx
'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { LOCALES, LOCALE_LABELS, LOCALE_FLAGS } from '@/i18n/config';
import type { Locale } from '@/i18n/config';

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="flex gap-2">
      {Object.entries(LOCALES).map(([_, localeValue]) => (
        <button
          key={localeValue}
          onClick={() => setLocale(localeValue as Locale)}
          className={`px-4 py-2 rounded ${
            locale === localeValue
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200'
          }`}
        >
          {LOCALE_FLAGS[localeValue as Locale]}{' '}
          {LOCALE_LABELS[localeValue as Locale]}
        </button>
      ))}
    </div>
  );
}
```

### Validation Messages

```tsx
'use client';

import { useTranslation } from '@/hooks/useTranslation';

export function EmailInput() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  function handleBlur() {
    if (!email) {
      setError(t('validation.required'));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('validation.email'));
    }
  }

  return (
    <div>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={handleBlur}
        placeholder={t('auth.email')}
      />
      {error && <span className="text-red-500">{error}</span>}
    </div>
  );
}
```

## Important Notes

### Error Handling

- If a translation key is not found, the component will log a warning and return the key itself as a fallback
- If loading a locale fails, the system automatically falls back to Spanish Nicaragua (es-ni)

### Performance

- Translations are cached after first load to avoid repeated imports
- The `useTranslation` hook uses memoization to prevent unnecessary re-renders

### Browser LocalStorage

- User's preferred locale is automatically saved and restored
- This persists across sessions without manual implementation

## Testing Translations

To validate that all translation keys exist across all locales:

```typescript
import { validateTranslations } from '@/i18n/helpers';

// Run in development
await validateTranslations();
```

This will log warnings for any missing keys in non-default locales.

## Next Steps

1. ✅ **Structure Created** - i18n system is now ready
2. ⏳ **Component Migration** - Start replacing hardcoded text with `t()` calls
3. ⏳ **Language Switcher UI** - Add language switcher to settings or header
4. ⏳ **RTL Support** (Future) - Can be added for Arabic or Hebrew if needed

## Common Issues

### "useTranslation must be used within an I18nProvider"

Make sure your component tree is wrapped with `I18nProvider` and the component uses the `'use client'` directive.

### Translations not updating after locale change

Ensure the component is using the `useTranslation` hook and the locale is properly set via `setLocale()`.

### Missing translations in production build

Run `validateTranslations()` during development to catch missing keys early.

---

**Ready to start migrating!** Begin with the most frequently used components (Login, Dashboard) and work your way through the rest.
