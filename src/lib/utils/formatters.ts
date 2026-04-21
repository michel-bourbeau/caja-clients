// Formatting utilities

export const formatCurrency = (value: number, currency = "NIO"): string => {
  const locale = currency === "USD" ? "en-US" : "es-NI";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/** Symbol shortcut: "C$" for NIO, "$" for USD */
export const currencySymbol = (currency: string): string =>
  currency === "USD" ? "$" : "C$";

const TZ = "America/Managua";
const LOCALE = "es-NI";

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat(LOCALE, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: TZ,
  }).format(date);
};

export const formatTime = (date: Date): string => {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: TZ,
  }).format(date);
};

export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat(LOCALE, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(date);
};

/**
 * Returns "YYYY-MM-DD" for the given date in Nicaragua time.
 * Use this for date-based filtering so sales after 18:00 local
 * are not counted as the next UTC day.
 */
export const toNicaraguaDateString = (date: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  }).format(date);

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};
