/**
 * Component types
 *
 * UI-specific types used in components, including flash messages and receipts.
 */

/**
 * Variant for flash/toast messages
 */
export type FlashVariant = "success" | "error" | "warning" | "info";

/**
 * State of a flash/toast message
 */
export interface FlashState {
  variant: FlashVariant;
  message: string;
}

/**
 * Settings for receipt printing/display
 */
export interface ReceiptSettings {
  companyName?: string;
  companyPhone?: string;
  companyRuc?: string;
  logoUrl?: string;
}
