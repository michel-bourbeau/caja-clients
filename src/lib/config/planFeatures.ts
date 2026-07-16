/**
 * Plan-based feature defaults.
 * These are the modules enabled/disabled for each subscription plan.
 * Used as a base layer — individual tenant DB overrides are merged on top.
 */
export type PlanFeatures = {
  pos: boolean;
  inventory: boolean;
  employees: boolean;
  schedules: boolean;
  payroll: boolean;
  reports: boolean;
  loyalty: boolean;
  expenses: boolean;
  taxes: boolean;
  contacts: boolean;
  customRoles: boolean;
  api: boolean;
};

export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  free: {
    pos: true,
    inventory: true,
    employees: false,
    schedules: false,
    payroll: false,
    reports: false,
    loyalty: false,
    expenses: false,
    taxes: false,
    contacts: false,
    customRoles: false,
    api: false,
  },
  basic: {
    pos: true,
    inventory: true,
    employees: false,
    schedules: false,
    payroll: false,
    reports: false,
    loyalty: false,
    expenses: false,
    taxes: false,
    contacts: false,
    customRoles: false,
    api: false,
  },
  professional: {
    pos: true,
    inventory: true,
    employees: true,
    schedules: true,
    payroll: true,
    reports: true,
    loyalty: false,
    expenses: false,
    taxes: true,
    contacts: true,
    customRoles: false,
    api: false,
  },
  enterprise: {
    pos: true,
    inventory: true,
    employees: true,
    schedules: true,
    payroll: true,
    reports: true,
    loyalty: true,
    expenses: true,
    taxes: true,
    contacts: true,
    customRoles: true,
    api: true,
  },
  custom: {
    pos: false,
    inventory: false,
    employees: false,
    schedules: false,
    payroll: false,
    reports: false,
    loyalty: false,
    expenses: false,
    taxes: false,
    contacts: false,
    customRoles: false,
    api: false,
  },
};

/** Returns the plan features for a given plan name, falling back to "basic". */
export function getFeaturesForPlan(plan: string): PlanFeatures {
  return PLAN_FEATURES[plan] ?? PLAN_FEATURES.basic;
}
