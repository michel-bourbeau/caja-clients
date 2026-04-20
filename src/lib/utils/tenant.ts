// src/lib/utils/tenant.ts

/**
 * Tenant utility functions
 * Helper methods for multi-tenant operations
 */

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Extract tenant ID from URL or storage
 */
export function useTenantId(): string | null {
  const searchParams = useSearchParams();

  // 1. Try from URL parameters
  const tenantFromUrl = searchParams.get("tenant");
  if (tenantFromUrl) return tenantFromUrl;

  // 2. Try from sessionStorage (set during login)
  if (typeof window !== "undefined") {
    const tenantFromSession = sessionStorage.getItem("defaultTenantId");
    if (tenantFromSession) return tenantFromSession;
  }

  // 3. Try from localStorage
  if (typeof window !== "undefined") {
    const tenantFromStorage = localStorage.getItem("tenantId");
    if (tenantFromStorage) return tenantFromStorage;
  }

  // 4. Try from subdomain (chocorico.caja.com)
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const subdomain = hostname.split(".")[0];
    if (subdomain && subdomain !== "localhost" && subdomain !== "www") {
      return subdomain;
    }
  }

  return null;
}

/**
 * Get tenant slug from URL
 */
export function getTenantSlugFromPath(pathname: string): string | null {
  // Assuming path like /tenant/slug/dashboard or /dashboard?tenant=slug
  const parts = pathname.split("/");
  if (parts[1] === "tenant" && parts[2]) {
    return parts[2];
  }
  return null;
}

/**
 * Store tenant ID in localStorage
 */
export function setTenantId(tenantId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("tenantId", tenantId);
  }
}

/**
 * Clear tenant ID from storage
 */
export function clearTenantId(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("tenantId");
  }
}

/**
 * Add tenant filter to any query
 * Usage: withTenantFilter('products', tenantId)
 */
export function getTenantFilter(tenantId: string) {
  return {
    tenant_id: tenantId,
  };
}

/**
 * Validate tenant ID format (UUID)
 */
export function isValidTenantId(tenantId: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(tenantId);
}

/**
 * Generate URL for tenant
 */
export function getTenantUrl(
  tenantSlug: string,
  path: string = "/dashboard"
): string {
  // Option 1: Subdomain
  if (process.env.NEXT_PUBLIC_TENANT_URL_STYLE === "subdomain") {
    return `https://${tenantSlug}.${process.env.NEXT_PUBLIC_APP_DOMAIN}${path}`;
  }

  // Option 2: Path-based
  return `/tenant/${tenantSlug}${path}`;
}

/**
 * Hook to get current tenant context
 */
export function useTenantContext() {
  const tenantId = useTenantId();

  const getTenantData = useCallback(async () => {
    if (!tenantId) return null;

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/tenants/${tenantId}`);
      if (!response.ok) throw new Error("Failed to fetch tenant");
      return await response.json();
    } catch (error) {
      console.error("Error fetching tenant context:", error);
      return null;
    }
  }, [tenantId]);

  return {
    tenantId,
    getTenantData,
  };
}
