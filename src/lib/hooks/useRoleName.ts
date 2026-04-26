"use client";

import { useEffect, useState } from "react";

const ROLE_LABELS: Record<string, string> = {
  admin:    "Administrador",
  gerente:  "Gerente",
  cashier:  "Cajero",
  employee: "Empleado",
};

/**
 * Hook to resolve role name — defaults from system roles, or fetches from tenant_roles for custom roles
 */
export function useRoleName(roleId: string | undefined, tenantId?: string | null | undefined) {
  const [roleName, setRoleName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!roleId) {
      setRoleName(null);
      return;
    }

    // Check if it's a system role
    if (ROLE_LABELS[roleId]) {
      setRoleName(ROLE_LABELS[roleId]);
      return;
    }

    // For custom roles (UUID format), fetch from tenant_roles
    // Try to get tenantId from prop or sessionStorage
    let tid = tenantId;
    if (!tid && typeof window !== "undefined") {
      tid = sessionStorage.getItem("defaultTenantId") ?? undefined;
    }
    
    if (!tid) return;

    const fetchRoleName = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/tenants/${tid}/roles`);
        if (!res.ok) return;

        const roles: Array<{ id: string; name: string }> = await res.json();
        const match = roles.find((r) => r.id === roleId);

        if (match) {
          setRoleName(match.name);
        } else {
          // Fallback to roleId if not found
          setRoleName(roleId);
        }
      } catch (err) {
        console.error("Error fetching role name:", err);
        setRoleName(roleId);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoleName();
  }, [roleId, tenantId]);

  return { roleName: roleName ?? ROLE_LABELS[roleId ?? ""] ?? roleId ?? "Usuario", isLoading };
}
