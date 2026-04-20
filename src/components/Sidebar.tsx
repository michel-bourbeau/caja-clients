"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/lib/constants";

export const Sidebar: React.FC = () => {
  const { user, hasPermission } = useAuth();

  const canManageRoles = hasPermission("settings.manage_roles");

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold">Caja</h1>
        <p className="text-sm text-slate-400">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-slate-500 mt-1">{user?.roleId}</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <NavLink href={ROUTES.DASHBOARD} label="Dashboard" icon="📊" />

        {/* POS Module */}
        {(hasPermission("pos.view") || hasPermission("pos.create")) && (
          <NavSection label="Cajas">
            {hasPermission("pos.create") && (
              <NavLink href={ROUTES.POS} label="Nueva Venta" icon="🛒" />
            )}
            {hasPermission("pos.view") && (
              <NavLink href={ROUTES.TRANSACTIONS} label="Transacciones" icon="📋" />
            )}
          </NavSection>
        )}

        {/* Inventory Module */}
        {hasPermission("inventory.view") && (
          <NavSection label="Inventario">
            <NavLink href={ROUTES.PRODUCTS} label="Productos" icon="📦" />
            <NavLink href={ROUTES.CATEGORIES} label="Categorías" icon="🏷️" />
            <NavLink href={ROUTES.MOVEMENTS} label="Movimientos" icon="↔️" />
          </NavSection>
        )}

        {/* Employee Management */}
        {(hasPermission("employees.view") || hasPermission("schedules.view")) && (
          <NavSection label="Personal">
            {hasPermission("employees.view") && (
              <NavLink href={ROUTES.EMPLOYEES} label="Empleados" icon="👥" />
            )}
            {hasPermission("schedules.view") && (
              <NavLink href={ROUTES.SCHEDULES} label="Horarios" icon="📅" />
            )}
          </NavSection>
        )}

        {/* Payroll Module */}
        {(hasPermission("payroll.view") || hasPermission("payroll.create")) && (
          <NavSection label="Nómina">
            <NavLink href={ROUTES.PAYROLL_PERIODS} label="Períodos" icon="📆" />
            <NavLink href={ROUTES.PAYROLL} label="Recibos" icon="💰" />
          </NavSection>
        )}

        {/* Admin Section */}
        {canManageRoles && (
          <NavSection label="Admin">
            <NavLink href="/dashboard/admin/roles" label="Gestionar Roles" icon="🔑" />
            <NavLink href={ROUTES.SETTINGS} label="Configuración" icon="⚙️" />
          </NavSection>
        )}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium">
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
