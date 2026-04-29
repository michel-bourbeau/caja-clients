/**
 * Service and utility types
 *
 * Types used by business logic services, validators, hooks, and utilities.
 */

/**
 * Validation error with field and message
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Tax configuration
 */
export interface Tax {
  id: string;
  name: string;
  rate: number;
  is_active: boolean;
}

/**
 * Payment status information for tenant subscription
 */
export interface PaymentStatus {
  paid_until: string | null;
  daysUntilExpiration: number;
  isExpired: boolean;
  isExpiredMoreThan3Days: boolean;
  isExpiringWithin7Days: boolean;
  isSuspended: boolean;
  status: "active" | "expiring-soon" | "expired" | "suspended";
}
