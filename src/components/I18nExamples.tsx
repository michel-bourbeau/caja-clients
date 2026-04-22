/**
 * Example: Using i18n in a Component
 * 
 * This file demonstrates how to integrate i18n into an existing component
 * Feel free to copy this pattern to other components
 */

'use client';

import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { LOCALES, LOCALE_LABELS, LOCALE_FLAGS } from '@/i18n/config';
import type { Locale } from '@/i18n/config';

/**
 * Example: Language Switcher Component
 * 
 * This component allows users to switch between available languages
 * and see translations update in real-time
 */
export function LanguageSwitcherExample() {
  const { locale, setLocale, isLoading } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLocaleChange = async (newLocale: Locale) => {
    await setLocale(newLocale);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded border border-slate-300 hover:bg-slate-100"
        disabled={isLoading}
      >
        <span className="text-lg">
          {LOCALE_FLAGS[locale as Locale]}
        </span>
        <span className="hidden sm:inline">
          {LOCALE_LABELS[locale as Locale]}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-slate-300 rounded shadow-lg z-50">
          {Object.entries(LOCALES).map(([_, localeValue]) => (
            <button
              key={localeValue}
              onClick={() => handleLocaleChange(localeValue as Locale)}
              className={`w-full text-left px-4 py-3 hover:bg-slate-100 flex items-center gap-2 ${
                locale === localeValue ? 'bg-blue-50 font-semibold' : ''
              }`}
              disabled={isLoading}
            >
              <span className="text-lg">
                {LOCALE_FLAGS[localeValue as Locale]}
              </span>
              {LOCALE_LABELS[localeValue as Locale]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Example: Login Component with i18n
 * 
 * Shows how to use translations in form labels, placeholders, buttons,
 * and error messages
 */
export function LoginFormExample() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Your login logic here
      // Example error handling:
      if (!email) {
        setError(t('validation.required'));
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError(t('validation.email'));
        return;
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch {
      setError(t('errors.unknownError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
      <div>
        <h1 className="text-2xl font-bold mb-4">
          {t('auth.login')}
        </h1>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          {t('auth.email')}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.email')}
          className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {t('auth.password')}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.minPassword')}
          className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="remember"
          className="rounded"
        />
        <label htmlFor="remember" className="text-sm">
          {t('auth.rememberMe')}
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? t('common.loading') : t('auth.login')}
      </button>

      <p className="text-sm text-slate-600 text-center">
        {t('auth.noAccount')}{' '}
        <a href="#" className="text-blue-500 hover:underline">
          {t('auth.createAccount')}
        </a>
      </p>
    </form>
  );
}

/**
 * Example: Payroll Component with Variables
 * 
 * Shows how to use translations with variables (e.g., employee name, amount)
 */
export function PayrollPaymentExample() {
  const { t } = useTranslation();

  const employee = {
    id: '1',
    name: 'Juan García',
    unpaidHours: 8,
    hourlyRate: 10,
  };

  const amountToPay = employee.unpaidHours * employee.hourlyRate;

  const handlePayment = async () => {
    // Simulate payment
    console.log(
      t('payroll.additionalPayment', { hours: employee.unpaidHours })
    );
  };

  return (
    <div className="p-4 border border-slate-300 rounded">
      <h2 className="text-xl font-bold mb-4">
        {t('payroll.title')}
      </h2>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span>{t('payroll.employees')}:</span>
          <strong>{employee.name}</strong>
        </div>

        <div className="flex justify-between">
          <span>{t('payroll.hoursWorked')}:</span>
          <strong>{employee.unpaidHours}h</strong>
        </div>

        <div className="flex justify-between">
          <span>{t('payroll.hourlyRate')}:</span>
          <strong>${employee.hourlyRate}</strong>
        </div>

        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>{t('payroll.amountToPay')}:</span>
          <span className="text-green-600">${amountToPay}</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded text-sm">
        <strong>{t('payroll.partialPayment')}</strong>
        <p className="text-amber-900 mt-1">
          {t('payroll.additionalPayment', {
            hours: employee.unpaidHours,
          })}
        </p>
      </div>

      <button
        onClick={handlePayment}
        className="mt-4 w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        {t('payroll.payEmployee')}
      </button>
    </div>
  );
}

/**
 * Example: Form with Validation Messages
 * 
 * Shows how to display localized validation messages
 */
export function FormWithValidationExample() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('validation.required');
    } else if (formData.name.length < 3) {
      newErrors.name = t('validation.minLength', { length: 3 });
    }

    if (!formData.email.trim()) {
      newErrors.email = t('validation.required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.email');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('validation.required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      console.log(t('common.success'), formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
      <h2 className="text-xl font-bold">
        {t('superadmin.newUser')}
      </h2>

      {/* Name Field */}
      <div>
        <label className="block text-sm font-medium mb-1">
          {t('common.name')}
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-slate-300'
          }`}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      {/* Email Field */}
      <div>
        <label className="block text-sm font-medium mb-1">
          {t('auth.email')}
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.email ? 'border-red-500' : 'border-slate-300'
          }`}
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email}</p>
        )}
      </div>

      {/* Phone Field */}
      <div>
        <label className="block text-sm font-medium mb-1">
          {t('common.phone')}
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.phone ? 'border-red-500' : 'border-slate-300'
          }`}
        />
        {errors.phone && (
          <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
        )}
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {t('common.save')}
      </button>

      <button
        type="button"
        onClick={() => setErrors({})}
        className="w-full px-4 py-2 bg-slate-300 text-slate-900 rounded hover:bg-slate-400"
      >
        {t('common.cancel')}
      </button>
    </form>
  );
}
