"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { TenantProvider } from "@/context/TenantContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

        {/* Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar - slide in from left */}
        <div
          className={`fixed left-0 top-0 h-screen z-50 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto flex flex-col w-full">

          {/* Top bar with burger button */}
          <header className="sticky top-0 z-30 flex items-center gap-4 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Abrir/cerrar menú"
              className="relative inline-flex flex-col items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors"
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
            <span className="text-sm font-semibold text-slate-800">Caja</span>
          </header>

          <div className="p-6 flex-1">
            {children}
          </div>
        </main>
      </div>
    </TenantProvider>
  );
}
