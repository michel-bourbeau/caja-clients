'use client';

/**
 * useTranslation Hook
 * 
 * Custom hook for accessing i18n functionality in components
 */

import { useContext } from 'react';
import { I18nContext } from '@/context/I18nContext';

export function useTranslation() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error(
      'useTranslation must be used within an I18nProvider. ' +
      'Make sure your component is wrapped with I18nProvider.'
    );
  }

  return context;
}
