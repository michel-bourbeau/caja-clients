/**
 * API types
 *
 * Request/response types for API routes and external integrations.
 */

/**
 * Payroll configuration settings
 */
export interface PayrollConfig {
  frequency: "weekly" | "biweekly" | "monthly";
  weekStartDay: number;
  monthStartDay: number;
}

/**
 * Pay period information
 */
export interface PeriodInfo {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
  isCurrent: boolean;
}
