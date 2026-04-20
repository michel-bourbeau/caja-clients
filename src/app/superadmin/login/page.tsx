"use client";

import React, { useState, useEffect } from "react";
import { useSuperAdmin } from "@/context/SuperAdminContext";
import { Button, Input, Card } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function SuperAdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isLoading, isSuperAdmin } = useSuperAdmin();
  const router = useRouter();

  // Redirect if already logged in (using useEffect to avoid render conflicts)
  useEffect(() => {
    if (isSuperAdmin) {
      router.push("/superadmin/dashboard");
    }
  }, [isSuperAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(password);
      // Redirect will happen automatically via useEffect when isSuperAdmin changes
    } catch (err) {
      setError("Mot de passe incorrect");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-600">🔐</h1>
          <h2 className="text-2xl font-bold text-gray-900 mt-2">SuperAdmin</h2>
          <p className="text-gray-700 text-sm mt-2">Console de Gestión</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Mot de passe SuperAdmin"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="p-3 bg-red-100 text-red-700 text-sm rounded">
              ❌ {error}
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full bg-purple-600">
            {isLoading ? "Connexion..." : "Accéder à la Console"}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-purple-50 rounded border border-purple-200">
          <p className="text-xs text-gray-700">
            <strong>ℹ️ Accès superadmin:</strong> Vous pouvez créer des tenants, gérer les modules, et configurer les utilisateurs administrateurs.
          </p>
        </div>
      </Card>
    </div>
  );
}
