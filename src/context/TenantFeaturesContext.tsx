"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useTenantId } from "@/lib/utils/tenant";
import {
  getLocalStorageWithTTL,
  setLocalStorageWithTTL,
  getFeaturesStorageKey,
} from "@/lib/cache/localStorageCache";
import { TenantFeatures } from "@/lib/types";

interface TenantFeaturesContextValue {
  features: TenantFeatures | null;
  loading: boolean;
  error: string | null;
  refreshFeatures: () => Promise<void>;
}

const TenantFeaturesContext = createContext<TenantFeaturesContextValue | undefined>(
  undefined
);

export function TenantFeaturesProvider({ children }: { children: React.ReactNode }) {
  const tenantId = useTenantId();
  const [features, setFeatures] = useState<TenantFeatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = async (tId: string) => {
    if (!tId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check localStorage cache first
      const storageKey = getFeaturesStorageKey(tId);
      const cachedFeatures = getLocalStorageWithTTL<TenantFeatures>(storageKey);
      if (cachedFeatures) {
        setFeatures(cachedFeatures);
        setLoading(false);
        return;
      }

      // Fetch from API
      const response = await fetch(`/api/tenants/${tId}/features`);
      if (!response.ok) {
        throw new Error(`Failed to fetch features: ${response.status}`);
      }

      const data = await response.json();
      const fetchedFeatures = data.features || {};

      // Cache in localStorage (30 days)
      setLocalStorageWithTTL(storageKey, fetchedFeatures, 30);

      // Update state
      setFeatures(fetchedFeatures);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("Error fetching tenant features:", errorMsg);
      setError(errorMsg);
      setFeatures(null); // Don't show features on error
    } finally {
      setLoading(false);
    }
  };

  const refreshFeatures = async () => {
    if (tenantId) {
      await fetchFeatures(tenantId);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchFeatures(tenantId);
    }
  }, [tenantId]);

  return (
    <TenantFeaturesContext.Provider value={{ features, loading, error, refreshFeatures }}>
      {children}
    </TenantFeaturesContext.Provider>
  );
}

export function useTenantFeatures(): TenantFeaturesContextValue {
  const context = useContext(TenantFeaturesContext);
  if (!context) {
    throw new Error("useTenantFeatures must be used within TenantFeaturesProvider");
  }
  return context;
}

/**
 * Hook to check if a specific feature is enabled
 * Returns null/false if context not ready or feature not found
 */
export function useFeature(featureName: string): boolean {
  const { features, loading } = useTenantFeatures();
  
  if (loading || !features) {
    return false;
  }
  
  return features[featureName] ?? false;
}
