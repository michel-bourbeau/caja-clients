import { Card, Button } from "@/components/ui";
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Panel de Administración</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Users & Roles */}
        <Card className="border-2 border-blue-200 hover:shadow-lg transition">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">👥 Gestión de Roles</h2>
              <p className="text-slate-600 text-sm mb-4">
                Crea y personaliza roles según las necesidades de tu empresa. Define permisos
                específicos para cada función.
              </p>
            </div>
          </div>
          <Link href="/dashboard/admin/roles">
            <Button variant="primary" className="w-full">
              Ir a Gestión de Roles
            </Button>
          </Link>
        </Card>

        {/* System Settings */}
        <Card className="border-2 border-purple-200 hover:shadow-lg transition">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">⚙️ Configuración del Sistema</h2>
              <p className="text-slate-600 text-sm mb-4">
                Ajusta la configuración general de tu sistema como IVA, información de empresa e
                integraciones.
              </p>
            </div>
          </div>
          <Link href="/dashboard/settings">
            <Button variant="primary" className="w-full">
              Ir a Configuración
            </Button>
          </Link>
        </Card>

        {/* Audit Logs */}
        <Card className="border-2 border-amber-200 hover:shadow-lg transition">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">📜 Auditoría</h2>
              <p className="text-slate-600 text-sm mb-4">
                Revisa el historial de cambios y actividades en el sistema para garantizar la
                seguridad.
              </p>
            </div>
          </div>
          <Button variant="secondary" className="w-full" disabled>
            (Próximamente)
          </Button>
        </Card>

        {/* User Management */}
        <Card className="border-2 border-green-200 hover:shadow-lg transition">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">📊 Estadísticas</h2>
              <p className="text-slate-600 text-sm mb-4">
                Visualiza estadísticas del sistema como usuarios activos, transacciones y más.
              </p>
            </div>
          </div>
          <Button variant="secondary" className="w-full" disabled>
            (Próximamente)
          </Button>
        </Card>
      </div>

      {/* System Info */}
      <Card title="Información del Sistema">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm text-slate-600">Versión</p>
            <p className="text-2xl font-bold text-gray-900">1.0.0</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <p className="text-sm text-slate-600">Estado</p>
            <p className="text-2xl font-bold text-green-600">✓ Activo</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <p className="text-sm text-slate-600">Base de Datos</p>
            <p className="text-2xl font-bold text-gray-900">Mock</p>
          </div>
          <div className="border-l-4 border-amber-500 pl-4">
            <p className="text-sm text-slate-600">Última Sincronización</p>
            <p className="text-sm font-bold text-slate-900">Hace 5 min</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
