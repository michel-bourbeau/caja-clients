"use client";

import { useState, useEffect } from "react";

interface TenantFeatures {
  pos?: boolean;
  inventory?: boolean;
  employees?: boolean;
  schedules?: boolean;
  payroll?: boolean;
  reports?: boolean;
  settings?: boolean;
  [key: string]: boolean | undefined;
}

const ALL_FEATURES_ON: TenantFeatures = {
  pos: true, inventory: true, employees: true,
  schedules: true, payroll: true, reports: true, settings: true,
};

export function useTenantFeatures() {
  const [features, setFeatures] = useState<TenantFeatures>(ALL_FEATURES_ON);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try multiple ways to get tenant ID
      let tenantId: string | null = null;

      // 1. Try from localStorage
      if (typeof window !== "undefined") {
        tenantId = localStorage.getItem("tenantId");
      }

      // 2. If not in localStorage, try to get from user's tenant
      // (This would be set after proper authentication)
      if (!tenantId && typeof window !== "undefined") {
        // Try to get from sessionStorage as backup
        tenantId = sessionStorage.getItem("defaultTenantId");
      }

      if (!tenantId) {
        // If still no tenant, use a default or show all features
        console.warn("No tenant ID found, showing all features by default");
        setFeatures({
          pos: true,
          inventory: true,
          employees: true,
          schedules: true,
          payroll: true,
          reports: true,
          settings: true,
        });
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/tenants/${tenantId}/features`);
      if (!response.ok) {
        throw new Error("Failed to fetch tenant features");
      }

      const data = await response.json();
      // Merge with defaults so missing keys default to true (only explicitly false disables a feature)
      setFeatures({ ...ALL_FEATURES_ON, ...(data.features || {}) });
    } catch (err) {
      console.error("Error fetching features:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      // Default: show all modules on error
      setFeatures(ALL_FEATURES_ON);
    } finally {
      setLoading(false);
    }
  };

  return { features, loading, error };
}
