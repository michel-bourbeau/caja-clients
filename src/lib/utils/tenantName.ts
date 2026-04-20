"use client";

import { useState, useEffect } from "react";

export function useTenantName() {
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenantName();
  }, []);

  const fetchTenantName = async () => {
    try {
      setLoading(true);

      // Get tenant ID from sessionStorage
      const tenantId = typeof window !== "undefined" 
        ? sessionStorage.getItem("defaultTenantId") 
        : null;

      if (!tenantId) {
        console.warn("No tenant ID found");
        setLoading(false);
        return;
      }

      // Check localStorage cache first
      const cacheKey = `tenant_name_${tenantId}`;
      const cached = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        setTenantName(cached);
        setLoading(false);
        return;
      }

      // Fetch tenant details from API
      const response = await fetch(`/api/tenants/${tenantId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch tenant");
      }

      const data = await response.json();
      const name = data.name || null;
      setTenantName(name);

      // Cache the result
      if (name && typeof window !== "undefined") {
        localStorage.setItem(cacheKey, name);
      }
    } catch (err) {
      console.error("Error fetching tenant name:", err);
    } finally {
      setLoading(false);
    }
  };

  return { tenantName, loading };
}
