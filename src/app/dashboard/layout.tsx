"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { TenantProvider } from "@/context/TenantContext";
import { SUPERADMIN_IMPERSONATION_KEY, ImpersonationSession } from "@/context/AuthContext";
import { useTenantName } from "@/lib/utils/tenantName";
import { DEFAULT_ROLES } from "@/lib/types/roles";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const { tenantName } = useTenantName();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [impersonation, setImpersonation] = useState<ImpersonationSession | null>(null);

  const roleName = DEFAULT_ROLES.find((r) => r.id === user?.roleId)?.name ?? user?.roleId ?? "";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Detect impersonation session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(SUPERADMIN_IMPERSONATION_KEY);
    if (raw) {
      try { setImpersonation(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, []);

  // Redirect to login if not authenticated (after render completes)
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const exitImpersonation = () => {
    sessionStorage.removeItem(SUPERADMIN_IMPERSONATION_KEY);
    sessionStorage.removeItem("defaultTenantId");
    // Full reload to reset AuthContext state
    window.location.href = "/superadmin/dashboard";
  };

  // Show loading state initially
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Cargando...</p>
      </div>
    );
  }

  // Show redirect message if user just logged out
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Redirigiendo...</p>
      </div>
    );
  }

  return (
    <TenantProvider>
      <div className="flex h-screen bg-slate-100 overflow-hidden">

        {/* Backdrop - mobile only */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 xl:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar - always visible on xl+, slide-in on smaller screens */}
        <div
          className={`fixed xl:static left-0 top-0 h-screen z-50 xl:z-auto flex-shrink-0 transform transition-transform duration-300 ease-in-out xl:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto flex flex-col w-full min-w-0">

          {/* SuperAdmin impersonation banner */}
          {impersonation && (
            <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-purple-700 text-white text-sm font-medium shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-purple-200">🔐</span>
                <span>Mode SuperAdmin</span>
                <span className="text-purple-300">—</span>
                <span className="font-bold">{impersonation.tenantName}</span>
              </div>
              <button
                onClick={exitImpersonation}
                className="flex items-center gap-1.5 px-3 py-1 bg-purple-900 hover:bg-purple-800 rounded text-xs font-semibold transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Quitter
              </button>
            </div>
          )}

          {/* Top bar with burger button */}
          <header className="sticky top-0 z-30 flex items-center gap-4 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Abrir/cerrar menú"
              className="xl:hidden relative inline-flex flex-col items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              <span
                className={`absolute w-5 h-0.5 bg-slate-700 rounded-full transition-all duration-300 ${
                  isSidebarOpen ? "rotate-45" : "-translate-y-1.5"
                }`}
              />
              <span
                className={`absolute w-5 h-0.5 bg-slate-700 rounded-full transition-all duration-300 ${
                  isSidebarOpen ? "opacity-0 scale-x-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute w-5 h-0.5 bg-slate-700 rounded-full transition-all duration-300 ${
                  isSidebarOpen ? "-rotate-45" : "translate-y-1.5"
                }`}
              />
            </button>
            <span className="text-sm font-semibold text-slate-800">
              {tenantName || "Caja"}
            </span>

            {/* User info - right side */}
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-800 leading-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500 leading-tight">{user?.email}</p>
              </div>
              {roleName && (
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full font-medium border border-slate-200">
                  {roleName}
                </span>
              )}
              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </header>

          <div className="p-6 flex-1">
            {children}
          </div>
        </main>
      </div>
    </TenantProvider>
  );
}
