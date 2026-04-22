"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme, THEME_SCHEMES } from "@/context/ThemeContext";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";
import { ROUTES } from "@/lib/constants";

export const Sidebar: React.FC = () => {
  const { hasPermission, refreshPermissions } = useAuth();
  const { features } = useTenantFeatures();
  const { settings } = useTheme();
  const pathname = usePathname();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    admin: false,
  });

  const canManageRoles = hasPermission("settings.manage_roles");
  const canManageModules = hasPermission("settings.manage_modules");

  // Refresh permissions on every navigation so role changes take effect without re-login
  useEffect(() => {
    refreshPermissions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const theme = THEME_SCHEMES[settings.themeColor];

  return (
    <aside className={`w-64 ${theme.bg} text-white h-screen overflow-hidden flex flex-col`}>
      {/* Header with Logo */}
      <div className={`flex items-center gap-3 p-4 ${theme.accent} border-b border-opacity-20`}>
        {settings.logoUrl ? (
          <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 rounded object-contain" />
        ) : (
          <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center text-lg">📦</div>
        )}
        <span className="font-bold text-white">Caja</span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Dashboard - Always visible */}
        <NavLink href={ROUTES.DASHBOARD} label="Dashboard" icon="📊" />

        {/* Quick Actions - Always visible */}
        {features.pos && (hasPermission("pos.view") || hasPermission("pos.create")) && (
          <>
            {hasPermission("pos.create") && (
              <NavLink href={ROUTES.POS} label="Caja" icon="🛒" />
            )}
            {hasPermission("pos.view") && (
              <NavLink href={ROUTES.TRANSACTIONS} label="Transacciones" icon="📋" />
            )}
            {(hasPermission("pos.view") || hasPermission("pos.create")) && (
              <NavLink href={ROUTES.CIERRE} label="Cierre de Caja" icon="🔒" />
            )}
          </>
        )}

        {/* Gestión de Productos - Always visible if inventory enabled */}
        {features.inventory && hasPermission("inventory.view") && (
          <NavLink href={ROUTES.PRODUCTS} label="Gestión de Productos" icon="📦" />
        )}

        <div className="my-2 border-t border-slate-600 border-opacity-30"></div>

        {/* Personal - Direct links */}
        {(features.employees || features.schedules) && 
         (hasPermission("employees.view") || hasPermission("schedules.view") || hasPermission("schedules.checkin")) && (
          <>
            {features.employees && hasPermission("employees.view") && (
              <NavLink href={ROUTES.EMPLOYEES} label="Empleados" icon="👥" />
            )}
            {features.schedules && (hasPermission("schedules.view") || hasPermission("schedules.checkin")) && (
              <NavLink href={ROUTES.SCHEDULES} label="Asistencia" icon="🕐" />
            )}
          </>
        )}

        {/* Payroll - Direct links */}
        {features.payroll && (hasPermission("payroll.view") || hasPermission("payroll.create")) && (
          <>
            <NavLink href={ROUTES.PAYROLL} label="Recibos" icon="💰" />
          </>
        )}

        {/* Reports - Direct links */}
        {hasPermission("reports.view") && (
          <NavLink href={ROUTES.REPORTS} label="Reportes de Ventas" icon="📈" />
        )}

        {/* Loyalty - Direct links */}
        {features.loyalty && (
          <NavLink href="/dashboard/loyalty" label="Clientes Fieles" icon="💳" />
        )}

        {/* Admin - Accordion ONLY */}
        {(canManageRoles || canManageModules) && (
          <Accordion
            label="Admin"
            icon="🔑"
            isOpen={expandedSections.admin}
            onToggle={() => toggleSection("admin")}
          >
            {canManageRoles && (
              <NavLink href="/dashboard/admin/roles" label="Gestionar Roles" icon="🔑" isNested />
            )}
            {canManageModules && (
              <>
                <NavLink href="/dashboard/settings/modules" label="Configuración de Módulos" icon="⚙️" isNested />
                {features.payroll && (
                  <NavLink href={ROUTES.PAYROLL_PERIODS} label="Períodos de Pago" icon="📆" isNested />
                )}
                <NavLink href="/dashboard/settings/taxes" label="Impuestos" icon="💳" isNested />
              </>
            )}
            {(canManageRoles || canManageModules) && (
              <NavLink href={ROUTES.SETTINGS} label="Configuración General" icon="📋" isNested />
            )}
          </Accordion>
        )}
      </nav>
    </aside>
  );
};

interface AccordionProps {
  label: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({
  label,
  icon,
  isOpen,
  onToggle,
  children,
}) => (
  <div className="mt-2">
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full px-3 py-2 rounded text-sm hover:bg-slate-800 transition group"
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <span className={`transform transition-transform text-lg group-hover:text-slate-300 ${isOpen ? "rotate-180" : ""}`}>
        ▼
      </span>
    </button>
    {isOpen && <div className="space-y-1 pl-2 mt-1">{children}</div>}
  </div>
);

const NavLink: React.FC<{ href: string; label: string; icon: string; isNested?: boolean }> = ({
  href,
  label,
  icon,
  isNested = false,
}) => (
  <Link
    href={href}
    className={`flex items-center gap-3 px-3 py-2 rounded text-sm hover:bg-slate-800 transition ${
      isNested ? "pl-9 text-slate-300 hover:text-white" : ""
    }`}
  >
    <span className="text-lg">{icon}</span>
    <span>{label}</span>
  </Link>
);
