"use client";

import { AuthProvider } from "@/context/AuthContext";
import { SuperAdminProvider } from "@/context/SuperAdminContext";

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SuperAdminProvider>
        {children}
      </SuperAdminProvider>
    </AuthProvider>
  );
}
