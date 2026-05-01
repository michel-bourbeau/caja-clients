/**
 * Context types
 *
 * Types for React contexts: authentication, impersonation, etc.
 */

import { User } from "./domain";

/**
 * Authentication context type
 */
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginAsDemo: () => void;
  logout: () => void;
  refreshPermissions: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

/**
 * Superadmin impersonation session
 *
 * Used when a superadmin impersonates a tenant
 */
export interface ImpersonationSession {
  tenantId: string;
  tenantName: string;
  superadmin: true;
}

/**
 * Tenant impersonation session
 *
 * Used when a tenant admin impersonates an employee
 */
export interface EmployeeImpersonationSession {
  tenantId: string;
  employeeId: string;
  employeeName: string;
  superadmin: false;
}
