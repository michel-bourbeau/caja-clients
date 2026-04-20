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

export function useTenantFeatures() {
  const [features, setFeatures] = useState<TenantFeatures>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get tenant ID from localStorage (same way TenantContext does)
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenantId") : null;

      if (!tenantId) {
        console.warn("No tenant ID found");
        setFeatures({});
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/tenants/${tenantId}/features`);
      if (!response.ok) {
        throw new Error("Failed to fetch tenant features");
      }

      const data = await response.json();
      setFeatures(data.features || {});
    } catch (err) {
      console.error("Error fetching features:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      // Default: show all modules
      setFeatures({
        pos: true,
        inventory: true,
        employees: true,
        schedules: true,
        payroll: true,
        reports: true,
        settings: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return { features, loading, error };
}
