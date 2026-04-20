"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { SuperAdminProvider } from "@/context/SuperAdminContext";
import { restoreTenantIdFromStorage } from "@/lib/utils/session";

export function RootProviders({ children }: { children: React.ReactNode }) {
  // Restore tenant ID on app start (before any hooks that need it)
  useEffect(() => {
    restoreTenantIdFromStorage();
  }, []);

  return (
    <AuthProvider>
      <SuperAdminProvider>
        {children}
      </SuperAdminProvider>
    </AuthProvider>
  );
}
