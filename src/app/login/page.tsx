"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button, Input, Card } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const { login, logout, isLoading, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password, rememberMe);
      
      // CHECK PAYMENT STATUS - Block if suspended
      const tenantId = typeof window !== "undefined" ? sessionStorage.getItem("defaultTenantId") : null;
      
      if (tenantId) {
        try {
          const paymentRes = await fetch(`/api/tenants/${tenantId}/payment`);
          if (paymentRes.ok) {
            const paymentData = await paymentRes.json();
            
            let isSuspended = false;
            if (!paymentData.paid_until) {
              isSuspended = true;
            } else {
              const paidUntil = new Date(paymentData.paid_until);
              const now = new Date();
              const diffTime = paidUntil.getTime() - now.getTime();
              const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              isSuspended = daysUntilExpiration < -3;
            }
            
            if (isSuspended) {
              setError(t("auth.suspended"));
              await logout();
              return;
            }
          }
        } catch (paymentCheckError) {
          console.error("Error checking payment status:", paymentCheckError);
        }
      }
      
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.errors.invalidCredentials"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-slate-900 p-4">
      {/* Language switcher — top right */}
      <div className="fixed top-4 right-4 z-10">
        <div className="bg-white/90 backdrop-blur rounded-xl shadow-md px-1 py-0.5">
          <LanguageSwitcher />
        </div>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600">Caja</h1>
          <p className="text-gray-700 text-sm mt-2">{t("auth.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("auth.email")}
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label={t("auth.password")}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded cursor-pointer"
            />
            <label htmlFor="remember-me" className="ml-2 text-sm text-gray-800 cursor-pointer">
              {t("auth.rememberMe30")}
            </label>
          </div>

          {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("auth.signingIn") : t("auth.login")}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded text-sm text-gray-800">
          <p className="font-medium mb-2">{t("auth.testCredentials")}</p>
          <p>{t("auth.email")}: admin@caja.com</p>
          <p>{t("auth.password")}: admin123456</p>
        </div>
      </Card>
    </div>
  );
}
