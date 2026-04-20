"use client";

import { Card } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_PERMISSIONS, DEFAULT_ROLES } from "@/lib/types/roles";

/**
 * Component to display current user's role and permissions
 */
export const UserPermissionsCard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const userRole = DEFAULT_ROLES.find((r) => r.id === user.roleId);

  // Group user permissions by category
  const categories = ["POS", "INVENTORY", "EMPLOYEES", "PAYROLL", "SCHEDULES", "SETTINGS"] as const;
  const permissionsByCategory = categories.map((cat) => ({
    category: cat,
    permissions: DEFAULT_PERMISSIONS.filter(
      (p) => p.category === cat && user.permissions.includes(p.id)
    ),
  }));

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-2">👤 Información de Acceso</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-600 uppercase">Usuario</p>
            <p className="text-lg font-semibold text-slate-900">
              {user.firstName} {user.lastName}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase">Rol</p>
            <p className="text-lg font-semibold text-slate-900">{userRole?.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase">Permisos</p>
            <p className="text-lg font-semibold text-slate-900">{user.permissions.length}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-4">📋 Permisos por Módulo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {permissionsByCategory.map(({ category, permissions }) => (
            permissions.length > 0 && (
              <div key={category} className="p-3 bg-white rounded border border-slate-200">
                <p className="text-sm font-semibold text-slate-900 mb-2">📂 {category}</p>
                <ul className="space-y-1">
                  {permissions.map((perm) => (
                    <li key={perm.id} className="text-xs text-slate-700 flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>{perm.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ))}
        </div>
      </div>
    </Card>
  );
};
