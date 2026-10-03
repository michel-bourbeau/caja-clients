"use client";

import { useState, useEffect } from "react";
import { useTenantId } from "./tenant";
import { 
  getCachedData, 
  setCachedData, 
  createCacheKey,
  getInFlightRequest,
  setInFlightRequest 
} from "../cache/apiCache";
import { TenantFeatures } from "@/lib/types";

const ALL_FEATURES_ON: TenantFeatures = {
  pos: true, inventory: true, employees: true,
  schedules: true, payroll: true, reports: true, loyalty: true, expenses: true, taxes: true, settings: true,
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

      const cacheKey = createCacheKey("features", tenantId);
      
      // Check cache first
      const cachedData = getCachedData<any>(cacheKey);
      if (cachedData) {
        setFeatures({ ...ALL_FEATURES_ON, ...cachedData.features });
        setLoading(false);
        return;
      }

      // Check if request is already in flight
      const inFlightPromise = getInFlightRequest<any>(cacheKey);
      if (inFlightPromise) {
        try {
          const data = await inFlightPromise;
          setFeatures({ ...ALL_FEATURES_ON, ...(data.features || {}) });
        } catch (err) {
          throw err;
        } finally {
          setLoading(false);
        }
        return;
      }

      // Create new request
      const fetchPromise = fetch(`/api/tenants/${tenantId}/features`).then(res => {
        if (!res.ok) throw new Error("Failed to fetch tenant features");
        return res.json();
      });

      setInFlightRequest(cacheKey, fetchPromise);

      const data = await fetchPromise;
      // Cache the response
      setCachedData(cacheKey, data);
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
