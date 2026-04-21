"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User, AuthContextType } from "@/lib/types";
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
];

/** Resolve permissions from a role_id — falls back to admin all-access */
function permissionsForRole(roleId: string): string[] {
  const role = DEFAULT_ROLES.find((r) => r.id === roleId);
  return role ? role.permissions : ADMIN_PERMISSIONS;
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
  const roleId    = employeeRow?.role_id    ?? meta.role_id    ?? "admin";
  const tenantId  = employeeRow?.tenant_id  ?? meta.tenant_id  ?? null;

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    firstName,
    lastName,
    roleId,
    permissions: customPermissions ?? permissionsForRole(roleId),
    ...(tenantId ? { tenantId } : {}),
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
      console.warn("[Auth] resolveProfile: profil introuvable pour", email);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("[Auth] resolveProfile erreur:", err);
    return null;
  }
}

/** Fetch permissions for a role from the tenant_roles table */
async function fetchTenantRolePermissions(tenantId: string, slug: string): Promise<string[] | null> {
  try {
    const res = await fetch(`/api/tenants/${tenantId}/roles`);
    if (!res.ok) {
      console.warn("[Auth] fetchTenantRolePermissions: API error", res.status);
      return null;
    }
    const roles: Array<{ slug: string; name: string; permissions: string[] }> = await res.json();
    console.log("[Auth] roles disponibles:", roles.map((r) => `${r.name} (slug="${r.slug}")`));
    console.log("[Auth] recherche slug:", slug);
    const match = roles.find((r) => r.slug === slug);
    if (!match) {
      console.warn(`[Auth] Aucun rôle trouvé avec slug="${slug}". Slugs disponibles: ${roles.map((r) => r.slug).join(", ")}`);
    } else {
      console.log("[Auth] Permissions chargées depuis DB:", match.permissions);
    }
    return match?.permissions ?? null;
  } catch (err) {
    console.error("[Auth] fetchTenantRolePermissions erreur:", err);
    return null;
  }
}

export const SUPERADMIN_IMPERSONATION_KEY = "superadmin_impersonation";

export interface ImpersonationSession {
  tenantId: string;
  tenantName: string;
  superadmin: true;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from Supabase Auth on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // ── Check superadmin impersonation first ──────────────────────────────
        if (typeof window !== "undefined") {
          const raw = sessionStorage.getItem(SUPERADMIN_IMPERSONATION_KEY);
          if (raw) {
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
            } as User);
            setIsLoading(false);
            return;
          }
        }

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
  }, []);

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
    if (!user?.email) return;
    try {
      const profile = await resolveProfile(user.email);
      let customPerms: string[] | null = profile?.direct_permissions?.length
        ? profile.direct_permissions
        : null;
      if (!customPerms && profile?.tenant_id && profile?.role_id) {
        customPerms = await fetchTenantRolePermissions(profile.tenant_id, profile.role_id);
      }
      if (customPerms) {
        setUser((prev) => prev ? { ...prev, permissions: customPerms! } : prev);
      }
    } catch (err) {
      console.warn("[Auth] refreshPermissions failed:", err);
    }
  }, [user?.email]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      return user.permissions.includes(permission);
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
      return permissions.some((perm) => user.permissions.includes(perm));
    },
    [user]
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
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
