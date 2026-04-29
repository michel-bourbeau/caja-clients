"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User, AuthContextType, ImpersonationSession, EmployeeImpersonationSession } from "@/lib/types";
import { saveSession, getStoredSession, clearSession, isSessionValid } from "@/lib/utils/session";
import { supabase } from "@/lib/supabase";
import { DEFAULT_ROLES } from "@/lib/types/roles";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_PERMISSIONS = [
  "pos.create", "pos.view", "pos.void", "pos.configure",
  "inventory.view", "inventory.create", "inventory.edit", "inventory.delete", "inventory.adjust",
  "manage_products",
  "employees.view", "employees.create", "employees.edit", "employees.delete",
  "schedules.view", "schedules.edit", "schedules.checkin",
  "payroll.view", "payroll.create", "payroll.approve", "payroll.pay",
  "settings.view", "settings.edit", "settings.manage_roles",
  "pos.cierre", "pos.cierre_review",
  "contacts.view", "contacts.create", "contacts.edit", "contacts.delete",
];

/** Resolve permissions from a role_id — falls back to empty (least privilege) for unknown roles */
function permissionsForRole(roleId: string): string[] {
  const role = DEFAULT_ROLES.find((r) => r.id === roleId);
  // SECURITY: never fall back to ADMIN_PERMISSIONS for unknown role IDs.
  // An unrecognised role gets zero permissions until the DB lookup succeeds.
  return role ? role.permissions : [];
}

/** Build a User from Supabase Auth session data + optional employee record */
function buildUser(
  authUser: { id: string; email?: string; user_metadata?: Record<string, string> },
  employeeRow?: Record<string, string> | null,
  customPermissions?: string[] | null
): User {
  const meta = authUser.user_metadata ?? {};
  const firstName = employeeRow?.first_name ?? meta.first_name ?? authUser.email?.split("@")[0] ?? "Utilisateur";
  const lastName  = employeeRow?.last_name  ?? meta.last_name  ?? "";
  const roleId    = employeeRow?.role_id    ?? meta.role_id    ?? "cashier";
  const tenantId  = employeeRow?.tenant_id  ?? meta.tenant_id  ?? null;
  const permissions = customPermissions ?? permissionsForRole(roleId);

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    firstName,
    lastName,
    roleId,
    permissions,
    ...(tenantId ? { tenantId } : {}),
    hasPermission: (permission: string) => permissions.includes(permission),
  } as User;
}

/**
 * Look up a user profile via the server-side API (uses admin client, bypasses RLS).
 * Returns a normalized object with first_name, last_name, role_id, tenant_id
 * and optionally direct_permissions.
 */
async function resolveProfile(email: string): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`/api/auth/profile?email=${encodeURIComponent(email)}`);
    if (!res.ok) {

      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("[Auth] resolveProfile erreur:", err);
    return null;
  }
}

/** Fetch permissions for a role from the tenant_roles table */
async function fetchTenantRolePermissions(tenantId: string, roleId: string): Promise<string[] | null> {
  try {
    const res = await fetch(`/api/tenants/${tenantId}/roles`);
    if (!res.ok) {
      return null;
    }
    const roles: Array<{ id: string; slug: string; name: string; permissions: string[] }> = await res.json();

    // Search by id (UUID) first, then fall back to slug (e.g. "admin" literal)
    const match = roles.find((r) => r.id === roleId) ?? roles.find((r) => r.slug === roleId);
    if (!match) {
      console.warn("[Auth] Role not found:", roleId);
      return null;
    }
    return match.permissions ?? null;
  } catch (err) {
    console.error("[Auth] fetchTenantRolePermissions erreur:", err);
    return null;
  }
}

export const SUPERADMIN_IMPERSONATION_KEY = "superadmin_impersonation";
export const EMPLOYEE_IMPERSONATION_KEY = "employee_impersonation";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Extract restore logic into a reusable function
  const checkAndRestoreImpersonation = useCallback(async () => {
    if (typeof window === "undefined") return false;

    // ── Check superadmin impersonation first ──────────────────────────────
    const raw = sessionStorage.getItem(SUPERADMIN_IMPERSONATION_KEY);
    if (raw) {
      try {
        const imp: ImpersonationSession = JSON.parse(raw);
        sessionStorage.setItem("defaultTenantId", imp.tenantId);
        setUser({
          id: "superadmin",
          email: "superadmin@caja.app",
          firstName: "Super",
          lastName: "Admin",
          roleId: "admin",
          permissions: ADMIN_PERMISSIONS,
          tenantId: imp.tenantId,
          hasPermission: (permission: string) => ADMIN_PERMISSIONS.includes(permission),
        } as User);
        setIsLoading(false);
        return true;
      } catch {
        return false;
      }
    }

    // ── Check employee impersonation second ──────────────────────────────
    const empRaw = sessionStorage.getItem(EMPLOYEE_IMPERSONATION_KEY);
    if (empRaw) {
      try {
        console.log("[Auth] Employee impersonation detected:", empRaw);
        const empImp: EmployeeImpersonationSession = JSON.parse(empRaw);
        sessionStorage.setItem("defaultTenantId", empImp.tenantId);

        // Fetch full employee profile to get role_id and permissions
        try {
          console.log("[Auth] Fetching employees from /api/tenants/" + empImp.tenantId + "/employees");
          const empRes = await fetch(`/api/tenants/${empImp.tenantId}/employees`);
          const employees: any[] = await empRes.json();
          console.log("[Auth] Fetched employees count:", employees.length);
          console.log("[Auth] Looking for employee ID:", empImp.employeeId);
          console.log("[Auth] All employee IDs:", employees.map(e => ({ id: e.id, name: e.first_name, is_system_user: e.is_system_user })));
          
          const employee = employees.find((e) => e.id === empImp.employeeId);
          console.log("[Auth] Found employee:", employee);

          if (employee) {
            // Always use system role permissions if it's a system role (admin, manager, cashier)
            // Don't look for tenant-specific overrides for system roles
            const systemPerms = permissionsForRole(employee.role_id || "cashier");
            let perms = systemPerms.length > 0 ? systemPerms : null;
            
            // Only look for tenant-specific role permissions if it's NOT a system role
            if (!perms && employee.tenant_id && employee.role_id) {
              perms = await fetchTenantRolePermissions(employee.tenant_id, employee.role_id);
            }
            
            console.log("[Auth] Employee roleId:", employee.role_id, "system perms count:", systemPerms.length);
            console.log("[Auth] Using perms:", perms?.length || 0);

            setUser({
              id: employee.id,
              email: employee.email || `emp-${employee.id}@caja.app`,
              firstName: employee.first_name || "Employee",
              lastName: employee.last_name || "",
              roleId: employee.role_id || "cashier",
              permissions: perms || permissionsForRole(employee.role_id || "cashier"),
              tenantId: empImp.tenantId,
              hasPermission: (permission: string) => (perms || permissionsForRole(employee.role_id || "cashier")).includes(permission),
            } as User);
            console.log("[Auth] User set to impersonated employee");
          } else {
            console.warn("[Auth] Employee not found with ID:", empImp.employeeId);
            console.warn("[Auth] Impersonation failed - falling back to normal auth");
          }
        } catch (err) {
          console.error("[Auth] Error loading impersonated employee:", err);
        }

        setIsLoading(false);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }, []);

  // Restore session from Supabase Auth on mount and listen for storage changes
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // First try to restore impersonation
        const hasImpersonation = await checkAndRestoreImpersonation();
        if (hasImpersonation) return;

        // If no impersonation, restore normal session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await resolveProfile(session.user.email ?? "");

          // Fetch tenant-specific permissions if we have tenantId + roleId
          let customPerms: string[] | null = profile?.direct_permissions?.length
            ? profile.direct_permissions
            : null;
          if (!customPerms && profile?.tenant_id && profile?.role_id) {
            customPerms = await fetchTenantRolePermissions(profile.tenant_id, profile.role_id);
          }

          const u = buildUser(session.user as any, profile, customPerms);
          setUser(u);

          const tenantId = (u as any).tenantId;
          if (tenantId && typeof window !== "undefined") {
            sessionStorage.setItem("defaultTenantId", tenantId);
          }
        } else {
          // Fall back to stored session for backward compatibility
          const storedSession = getStoredSession();
          if (storedSession && isSessionValid(storedSession)) {
            setUser({
              id: "legacy",
              email: storedSession.email,
              firstName: storedSession.email.split("@")[0],
              lastName: "",
              roleId: "admin",
              permissions: ADMIN_PERMISSIONS,
              hasPermission: (permission: string) => ADMIN_PERMISSIONS.includes(permission),
            });
            if (storedSession.tenantId && typeof window !== "undefined") {
              sessionStorage.setItem("defaultTenantId", storedSession.tenantId);
            }
          }
        }
      } catch {
        // Ignore — user stays null
      }
      setIsLoading(false);
    };

    restoreSession();

    // Listen for storage changes (when impersonation keys are set/removed from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SUPERADMIN_IMPERSONATION_KEY || e.key === EMPLOYEE_IMPERSONATION_KEY) {
        console.log("[Auth] Storage change detected, restoring impersonation...");
        restoreSession();
      }
    };

    // Listen for custom impersonation change event (same tab)
    const handleImpersonationChange = (e: Event) => {
      console.log("[Auth] Impersonation change event detected");
      restoreSession();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("impersonationChanged", handleImpersonationChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("impersonationChanged", handleImpersonationChange);
    };
  }, [checkAndRestoreImpersonation]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        // Map Supabase error codes to readable messages
        const msg =
          authError.message?.toLowerCase().includes("invalid") || authError.message?.toLowerCase().includes("credentials")
            ? "Email ou mot de passe incorrect"
            : authError.message?.toLowerCase().includes("email not confirmed")
            ? "Email non confirmé — vérifiez votre boîte mail"
            : authError.message?.toLowerCase().includes("too many")
            ? "Trop de tentatives — réessayez dans quelques minutes"
            : authError.message ?? "Erreur d'authentification";
        throw new Error(msg);
      }

      const authUser = authData.user;

      // Enrich with profile (employees table first, then users table as fallback)
      const profile = await resolveProfile(email.toLowerCase());

      // Use direct permissions from users table, or fetch from tenant_roles
      let customPerms: string[] | null = profile?.direct_permissions?.length
        ? profile.direct_permissions
        : null;
      if (!customPerms && profile?.tenant_id && profile?.role_id) {
        customPerms = await fetchTenantRolePermissions(profile.tenant_id, profile.role_id);
      }

      const u = buildUser(authUser as any, profile, customPerms);
      setUser(u);

      const tenantId = (u as any).tenantId ?? "c1d44fe1-a862-4b6b-afbd-8566f61099a2";
      if (typeof window !== "undefined") {
        sessionStorage.setItem("defaultTenantId", tenantId);
      }

      if (rememberMe) {
        saveSession(email, true, tenantId);
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    clearSession();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("defaultTenantId");
    }
  }, []);

  /** Re-fetch permissions from tenant_roles for the current user. Call after role changes. */
  const refreshPermissions = useCallback(async () => {
    if (!user?.email) return Promise.resolve();
    
    // Skip profile resolution for superadmin impersonation
    if (user.id === "superadmin" && user.email === "superadmin@caja.app") {
      // Superadmin already has ADMIN_PERMISSIONS set during impersonation
      return Promise.resolve();
    }
    
    try {
      const profile = await resolveProfile(user.email);
      console.log("[Auth] Refreshing permissions for", user.email, "profile:", profile);
      
      let customPerms: string[] | null = profile?.direct_permissions?.length
        ? profile.direct_permissions
        : null;
      if (!customPerms && profile?.tenant_id && profile?.role_id) {
        customPerms = await fetchTenantRolePermissions(profile.tenant_id, profile.role_id);
        console.log("[Auth] Fetched tenant role permissions:", customPerms?.length ?? 0);
      }
      // Always apply resolved permissions — fall back to DEFAULT_ROLES if DB lookup fails.
      // SECURITY: never keep potentially stale/elevated permissions when the lookup returns null.
      const resolvedPerms = customPerms ?? permissionsForRole(profile?.role_id ?? "");
      console.log("[Auth] Setting user permissions to:", resolvedPerms.length, "permissions");
      setUser((prev) => prev ? { ...prev, permissions: resolvedPerms } : prev);
    } catch (err) {
      console.error("[Auth] refreshPermissions error:", err);
    }
  }, [user?.email, user?.id]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      // Admins always get all DEFAULT_PERMISSIONS regardless of what's in DB
      // This ensures new permissions are immediately available to admins
      if (user.roleId === "admin") {
        const adminRole = DEFAULT_ROLES.find((r) => r.id === "admin");
        if (adminRole) {
          return adminRole.permissions.includes(permission);
        }
      }
      return user.permissions.includes(permission);
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
      // Admins always get all DEFAULT_PERMISSIONS regardless of what's in DB
      if (user.roleId === "admin") {
        const adminRole = DEFAULT_ROLES.find((r) => r.id === "admin");
        if (adminRole) {
          return permissions.some((perm) => adminRole.permissions.includes(perm));
        }
      }
      return permissions.some((perm) => user.permissions.includes(perm));
    },
    [user]
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
      // Admins always get all DEFAULT_PERMISSIONS regardless of what's in DB
      if (user.roleId === "admin") {
        const adminRole = DEFAULT_ROLES.find((r) => r.id === "admin");
        if (adminRole) {
          return permissions.every((perm) => adminRole.permissions.includes(perm));
        }
      }
      return permissions.every((perm) => user.permissions.includes(perm));
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshPermissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
