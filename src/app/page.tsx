"use client";

import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useSuperAdmin } from "@/context/SuperAdminContext";

export default function Home() {
  const { user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Caja</h1>
          <p className="text-xl text-gray-700">Sistema de Gestión Integral</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Login */}
          <Card className="p-8 text-center">
            <div className="text-5xl mb-4">👤</div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Acceso de Usuario</h2>
            <p className="text-gray-700 mb-6">
              Accede con tu usuario y contraseña para usar el sistema.
            </p>
            <Link href="/login">
              <Button className="w-full bg-blue-600">Ir a Login</Button>
            </Link>
          </Card>

          {/* SuperAdmin */}
          <Card className="p-8 text-center border-2 border-purple-500">
            <div className="text-5xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">SuperAdmin</h2>
            <p className="text-gray-700 mb-6">
              Crea tenants, configura módulos y gestiona la plataforma.
            </p>
            <Link href="/superadmin/login">
              <Button className="w-full bg-purple-600">Console SuperAdmin</Button>
            </Link>
          </Card>
        </div>

        {/* Current Status */}
        {(user || isSuperAdmin) && (
          <Card className="p-6 mt-8 bg-green-50">
            <p className="text-green-700">
              ✅ {user ? `Conectado como: ${user.email}` : ""}
              {isSuperAdmin && " | SuperAdmin activo"}
            </p>
          </Card>
        )}

        {/* Info */}
        <div className="mt-12 text-center text-gray-600 text-sm">
          <p>© 2026 Caja - Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
}
