"use client";

import { useState, useEffect } from "react";
import { useTenantId } from "./tenant";

interface TenantFeatures {
  pos?: boolean;
  inventory?: boolean;
  employees?: boolean;
  schedules?: boolean;
  payroll?: boolean;
  reports?: boolean;
  loyalty?: boolean;
  expenses?: boolean;
  settings?: boolean;
  [key: string]: boolean | undefined;
}

const ALL_FEATURES_ON: TenantFeatures = {
  pos: true, inventory: true, employees: true,
  schedules: true, payroll: true, reports: true, loyalty: true, expenses: true, settings: true,
};

export function useTenantFeatures() {
  const tenantId = useTenantId();
  const [features, setFeatures] = useState<TenantFeatures>(ALL_FEATURES_ON);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchFeatures();
    } else {
      // No tenant ID: show all features (for public pages, etc)
      setFeatures(ALL_FEATURES_ON);
      setLoading(false);
    }
  }, [tenantId]);

  const fetchFeatures = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);

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
