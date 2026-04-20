// Formatting utilities

export const formatCurrency = (value: number, locale = "es-AR"): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "ARS",
  }).format(value);
};

export const formatDate = (date: Date, locale = "es-AR"): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

export const formatTime = (date: Date, locale = "es-AR"): string => {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
};

export const formatDateTime = (date: Date, locale = "es-AR"): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatPhoneNumber = (phone: string): string => {
  // Format for Argentina: +54 9 XXXX-XXXXXX
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};
