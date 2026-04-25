"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button, Input, Card } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const { login, isLoading, user } = useAuth();
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
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email ou mot de passe incorrect");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600">Caja</h1>
          <p className="text-gray-700 text-sm mt-2">Sistema de Gestión Integral</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Contraseña"
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
              Recuérdame por 30 días
            </label>
          </div>

          {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Iniciando..." : "Iniciar Sesión"}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded text-sm text-gray-800">
          <p className="font-medium mb-2">Credenciales de prueba:</p>
          <p>Email:admin@caja.com</p>
          <p>Contraseña: admin123456</p>
        </div>
      </Card>
    </div>
  );
}
