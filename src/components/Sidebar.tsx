"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";
import { useTenantName } from "@/lib/utils/tenantName";
import { ROUTES } from "@/lib/constants";

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const { user, hasPermission, logout } = useAuth();
  const { features } = useTenantFeatures();
  const { tenantName } = useTenantName();

  const canManageRoles = hasPermission("settings.manage_roles");

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold">Caja</h1>
        {tenantName && (
          <p className="text-sm font-semibold text-amber-400 mt-2">
            🏢 {tenantName}
          </p>
        )}
        <p className="text-sm text-slate-400 mt-2">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-slate-500 mt-1">{user?.roleId}</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <NavLink href={ROUTES.DASHBOARD} label="Dashboard" icon="📊" />

        {/* POS Module - Vérifie si activé */}
        {features.pos && (hasPermission("pos.view") || hasPermission("pos.create")) && (
          <NavSection label="Cajas">
            {hasPermission("pos.create") && (
              <NavLink href={ROUTES.POS} label="Nueva Venta" icon="🛒" />
            )}
            {hasPermission("pos.view") && (
              <NavLink href={ROUTES.TRANSACTIONS} label="Transacciones" icon="📋" />
            )}
          </NavSection>
        )}

        {/* Inventory Module - Vérifie si activé */}
        {features.inventory && hasPermission("inventory.view") && (
          <NavSection label="Inventario">
            <NavLink href={ROUTES.PRODUCTS} label="Gestión de Productos" icon="📦" />
          </NavSection>
        )}

        {/* Employee Management - Vérifie si activé */}
        {(features.employees || features.schedules) && 
         (hasPermission("employees.view") || hasPermission("schedules.view")) && (
          <NavSection label="Personal">
            {features.employees && hasPermission("employees.view") && (
              <NavLink href={ROUTES.EMPLOYEES} label="Empleados" icon="👥" />
            )}
            {features.schedules && hasPermission("schedules.view") && (
              <NavLink href={ROUTES.SCHEDULES} label="Horarios" icon="📅" />
            )}
          </NavSection>
        )}

        {/* Payroll Module - Vérifie si activé */}
        {features.payroll && (hasPermission("payroll.view") || hasPermission("payroll.create")) && (
          <NavSection label="Nómina">
            <NavLink href={ROUTES.PAYROLL_PERIODS} label="Períodos" icon="📆" />
            <NavLink href={ROUTES.PAYROLL} label="Recibos" icon="💰" />
          </NavSection>
        )}

        {/* Admin Section - Vérifie si activé */}
        {features.settings && canManageRoles && (
          <NavSection label="Admin">
            <NavLink href="/admin/users" label="Gestionar Usuarios" icon="👤" />
            <NavLink href="/dashboard/admin/roles" label="Gestionar Roles" icon="🔑" />
            <NavLink href={ROUTES.SETTINGS} label="Configuración" icon="⚙️" />
          </NavSection>
        )}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};

const NavSection: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="mt-4">
    <h3 className="text-xs font-semibold uppercase text-slate-400 px-3 mb-2">{label}</h3>
    <div className="space-y-1">{children}</div>
  </div>
);

const NavLink: React.FC<{ href: string; label: string; icon: string }> = ({
  href,
  label,
  icon,
}) => (
  <Link
    href={href}
    className="flex items-center gap-3 px-3 py-2 rounded text-sm hover:bg-slate-800 transition"
  >
    <span className="text-lg">{icon}</span>
    <span>{label}</span>
  </Link>
);
