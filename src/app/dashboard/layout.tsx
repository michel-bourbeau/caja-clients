"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingCart, AlertCircle } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { TenantProvider } from "@/context/TenantContext";
import { SUPERADMIN_IMPERSONATION_KEY, EMPLOYEE_IMPERSONATION_KEY, ImpersonationSession, EmployeeImpersonationSession } from "@/context/AuthContext";
import { useTenantName } from "@/lib/utils/tenantName";
import { useRoleName } from "@/lib/hooks/useRoleName";
import { DEFAULT_ROLES } from "@/lib/types/roles";
import { Card } from "@/components/StripeUIComponents";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const { tenantName } = useTenantName();
  const { roleName } = useRoleName(user?.roleId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [impersonation, setImpersonation] = useState<ImpersonationSession | EmployeeImpersonationSession | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Detect impersonation session (tenant or employee)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check employee impersonation first
    const empRaw = sessionStorage.getItem(EMPLOYEE_IMPERSONATION_KEY);
    if (empRaw) {
      try { 
        setImpersonation(JSON.parse(empRaw)); 
        return;
      } catch { /* ignore */ }
    }

    // Then check tenant impersonation
    const raw = sessionStorage.getItem(SUPERADMIN_IMPERSONATION_KEY);
    if (raw) {
      try { setImpersonation(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Redirect to login if not authenticated (after render completes)
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // CHECK PAYMENT STATUS - Block if suspended
  useEffect(() => {
    if (!user || isLoading) return;

    const checkPaymentStatus = async () => {
      try {
        setCheckingPayment(true);
        const tenantId = typeof window !== "undefined" ? sessionStorage.getItem("defaultTenantId") : null;
        
        if (!tenantId) {
          setPaymentError("Tenant ID not found");
          return;
        }

        const res = await fetch(`/api/tenants/${tenantId}/payment`);
        if (!res.ok) {
          setPaymentError("Could not verify payment status");
          return;
        }

        const paymentData = await res.json();
        
        // Check if suspended
        let isSuspended = false;
        if (!paymentData.paid_until) {
          isSuspended = true; // Explicitly cancelled
        } else {
          const paidUntil = new Date(paymentData.paid_until);
          const now = new Date();
          const diffTime = paidUntil.getTime() - now.getTime();
          const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          isSuspended = daysUntilExpiration < -3; // Expired > 3 days
        }

        if (isSuspended) {
          setPaymentError("🚨 Cuenta suspendida - Su suscripción ha expirado. Contacte al administrador del sistema.");
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        // Don't block if check fails
      } finally {
        setCheckingPayment(false);
      }
    };

    checkPaymentStatus();
  }, [user, isLoading]);

  const exitImpersonation = () => {
    // Remove impersonation keys but DON'T logout the Superadmin session
    sessionStorage.removeItem(SUPERADMIN_IMPERSONATION_KEY);
    sessionStorage.removeItem(EMPLOYEE_IMPERSONATION_KEY);
    sessionStorage.removeItem("defaultTenantId");
    
    // Dispatch custom event to notify AuthContext
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("impersonationChanged", { detail: { key: "cleared" } }));
    }
    
    // Navigate without full reload - AuthContext will detect impersonation keys are gone
    router.push("/superadmin");
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

  // Show payment error if account is suspended
  if (paymentError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-red-100">
        <Card className="w-full max-w-md shadow-lg">
          <div className="p-8 text-center space-y-6">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto" />
            <div>
              <h1 className="text-2xl font-bold text-red-900 mb-2">Cuenta Suspendida</h1>
              <p className="text-red-800">{paymentError}</p>
            </div>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <TenantProvider>
      <div className="flex h-screen bg-slate-50 overflow-hidden">

        {/* Backdrop - mobile only */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 xl:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed xl:static left-0 top-0 h-screen z-50 xl:z-auto flex-shrink-0 transform transition-transform duration-300 ease-in-out xl:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col w-full min-w-0">

          {/* SuperAdmin impersonation banner */}
          {impersonation && (
            <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-purple-700 text-white text-sm font-medium shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-purple-200">🔐</span>
                <span>Mode SuperAdmin</span>
                <span className="text-purple-300">—</span>
                {impersonation.superadmin ? (
                  // Tenant impersonation
                  <>
                    <span>Tenant:</span>
                    <span className="font-bold">{impersonation.tenantName}</span>
                  </>
                ) : (
                  // Employee impersonation
                  <>
                    <span>Employé:</span>
                    <span className="font-bold">{impersonation.employeeName}</span>
                  </>
                )}
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
            <div className="ml-auto flex items-center gap-4">
              {/* Bouton Caja global */}
              <button
                onClick={() => router.push('/dashboard/pos')}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors flex items-center justify-center"
                title="Ir a Caja"
                aria-label="Ir a Caja"
              >
                <ShoppingCart className="w-5 h-5" />
              </button>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-800 leading-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500 leading-tight">{roleName}</p>
              </div>
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

          <div className="p-6 flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </TenantProvider>
  );
}
