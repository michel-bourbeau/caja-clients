"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";
import { ROUTES } from "@/lib/constants";

export const Sidebar: React.FC = () => {
  const { hasPermission, refreshPermissions } = useAuth();
  const { features } = useTenantFeatures();
  const pathname = usePathname();

  const canManageRoles = hasPermission("settings.manage_roles");
  const canManageSettings = hasPermission("manage_settings");

  // Refresh permissions on every navigation so role changes take effect without re-login
  useEffect(() => {
    refreshPermissions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <nav className="flex-1 p-4 pt-6 space-y-2">
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
            {(hasPermission("pos.view") || hasPermission("pos.create")) && (
              <NavLink href={ROUTES.CIERRE} label="Cierre de Caja" icon="🔒" />
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
         (hasPermission("employees.view") || hasPermission("schedules.view") || hasPermission("schedules.checkin")) && (
          <NavSection label="Personal">
            {features.employees && hasPermission("employees.view") && (
              <NavLink href={ROUTES.EMPLOYEES} label="Empleados" icon="👥" />
            )}
            {features.schedules && (hasPermission("schedules.view") || hasPermission("schedules.checkin")) && (
              <NavLink href={ROUTES.SCHEDULES} label="Asistencia" icon="🕐" />
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

        {/* Admin Section - Vérifie si l'utilisateur est admin */}
        {(canManageRoles || canManageSettings) && (
          <NavSection label="Admin">
            {canManageRoles && (
              <>
                <NavLink href="/dashboard/admin/roles" label="Gestionar Roles" icon="🔑" />
              </>
            )}
            {features.settings && <NavLink href={ROUTES.SETTINGS} label="Configuración" icon="⚙️" />}
            <NavLink href="/dashboard/settings/taxes" label="Impuestos" icon="💳" />
          </NavSection>
        )}
      </nav>
    </aside>
  );
};

const NavSection: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="mt-4">
    <h3 className="text-xs font-semibold uppercase text-gray-300 px-3 mb-2">{label}</h3>
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
