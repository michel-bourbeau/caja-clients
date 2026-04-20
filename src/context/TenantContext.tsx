// src/context/TenantContext.tsx

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { TenantContext as TenantContextType, Tenant } from "@/lib/types/tenant";
import { useTenantId, setTenantId } from "@/lib/utils/tenant";

interface TenantContextState extends TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextState | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const tenantId = useTenantId();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      setError("No tenant ID found");
      return;
    }

    loadTenant(tenantId);
  }, [tenantId]);

  const loadTenant = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Use API route instead of direct service (which requires admin client)
      const response = await fetch(`/api/tenants/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Tenant not found");
          setTenant(null);
          return;
        }
        throw new Error(`Failed to fetch tenant: ${response.statusText}`);
      }

      const tenantData = await response.json();
      setTenant(tenantData);
      setTenantId(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: TenantContextState = {
    tenantId: tenantId || "",
    tenantName: tenant?.name || "",
    tenantSlug: tenant?.slug || "",
    plan: tenant?.plan || "free",
    userRole: "", // TODO: Get from auth
    permissions: [], // TODO: Get from auth
    tenant,
    isLoading,
    error,
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return context;
};
