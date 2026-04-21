"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, currencySymbol } from "./formatters";

const STORAGE_KEY = "tenantCurrency";

function getStoredCurrency(): string {
  if (typeof window === "undefined") return "NIO";
  return localStorage.getItem(STORAGE_KEY) ?? "NIO";
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState<string>(getStoredCurrency);

  // Listen for changes from the settings page (same tab via storage event won't fire,
  // so we use a custom event instead)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setCurrencyState(detail);
    };
    window.addEventListener("tenantCurrencyChanged", handler);
    return () => window.removeEventListener("tenantCurrencyChanged", handler);
  }, []);

  const fmt = useCallback(
    (value: number) => formatCurrency(value, currency),
    [currency]
  );

  const symbol = currencySymbol(currency);

  return { currency, fmt, symbol };
}

/** Call this after saving currency to DB to update all useCurrency hooks in the same tab */
export function broadcastCurrencyChange(currency: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, currency);
  window.dispatchEvent(new CustomEvent("tenantCurrencyChanged", { detail: currency }));
}
