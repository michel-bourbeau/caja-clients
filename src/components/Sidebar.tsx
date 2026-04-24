"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme, THEME_SCHEMES } from "@/context/ThemeContext";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";
import { ROUTES } from "@/lib/constants";
import { SidebarIcon } from "./SidebarIcon";

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

  return (
    <aside className="sidebar">
      {/* Header with Logo */}
      <div className="sidebar-header">
        {settings.logoUrl ? (
          <div className="sidebar-logo-container">
            <img src={settings.logoUrl} alt="Logo" className="sidebar-logo-img" />
          </div>
        ) : (
          <div className="sidebar-logo-container">
            <img src="/images/logo-chocorico-white.png" alt="Caja Logo" className="sidebar-logo-img" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Dashboard - Always visible */}
        <NavLink href={ROUTES.DASHBOARD} label="Dashboard" iconType="dashboard" />

        {/* Quick Actions - Always visible */}
        {features.pos && (hasPermission("pos.view") || hasPermission("pos.create")) && (
          <>
            {hasPermission("pos.create") && (
              <NavLink href={ROUTES.POS} label="Caja" iconType="pos" />
            )}
            {hasPermission("pos.view") && (
              <NavLink href={ROUTES.TRANSACTIONS} label="Transacciones" iconType="transactions" />
            )}
            {(hasPermission("pos.view") || hasPermission("pos.create")) && (
              <NavLink href={ROUTES.CIERRE} label="Cierre de Caja" iconType="cierre" />
            )}
          </>
        )}

        {/* Gestión de Productos - Always visible if inventory enabled */}
        {features.inventory && hasPermission("inventory.view") && (
          <NavLink href={ROUTES.PRODUCTS} label="Gestión de Productos" iconType="inventory" />
        )}

        {/* Divider */}
        {((features.employees || features.schedules) || (features.payroll) || hasPermission("reports.view") || features.loyalty) && (
          <div className="sidebar-divider"></div>
        )}

        {/* Personal - Direct links */}
        {(features.employees || features.schedules) && 
         (hasPermission("employees.view") || hasPermission("schedules.view") || hasPermission("schedules.checkin")) && (
          <>
            {features.employees && hasPermission("employees.view") && (
              <NavLink href={ROUTES.EMPLOYEES} label="Empleados" iconType="employees" />
            )}
            {features.schedules && (hasPermission("schedules.view") || hasPermission("schedules.checkin")) && (
              <NavLink href={ROUTES.SCHEDULES} label="Asistencia" iconType="schedules" />
            )}
          </>
        )}

        {/* Payroll - Direct links */}
        {features.payroll && (hasPermission("payroll.view") || hasPermission("payroll.create")) && (
          <NavLink href={ROUTES.PAYROLL} label="Recibos" iconType="payroll" />
        )}

        {/* Reports - Direct links */}
        {hasPermission("reports.view") && (
          <NavLink href={ROUTES.REPORTS} label="Reportes de Ventas" iconType="reports" />
        )}

        {/* Loyalty - Direct links */}
        {features.loyalty && (
          <NavLink href="/dashboard/loyalty" label="Clientes Fieles" iconType="loyalty" />
        )}

        {/* Divider before Admin */}
        {(canManageRoles || canManageModules) && (
          <div className="sidebar-divider"></div>
        )}

        {/* Admin - Accordion ONLY */}
        {(canManageRoles || canManageModules) && (
          <Accordion
            label="Admin"
            iconType="admin"
            isOpen={expandedSections.admin}
            onToggle={() => toggleSection("admin")}
          >
            {canManageRoles && (
              <NavLink href="/dashboard/admin/roles" label="Gestionar Roles" iconType="roles" isNested />
            )}
            {canManageModules && (
              <>
                <NavLink href="/dashboard/settings/modules" label="Módulos" iconType="modules" isNested />
                {features.payroll && (
                  <NavLink href={ROUTES.PAYROLL_PERIODS} label="Períodos de Pago" iconType="periods" isNested />
                )}
                <NavLink href="/dashboard/settings/taxes" label="Impuestos" iconType="taxes" isNested />
              </>
            )}
            {(canManageRoles || canManageModules) && (
              <NavLink href={ROUTES.SETTINGS} label="Configuración General" iconType="settings" isNested />
            )}
          </Accordion>
        )}
      </nav>
    </aside>
  );
};

interface AccordionProps {
  label: string;
  iconType: "dashboard" | "pos" | "transactions" | "cierre" | "inventory" | "employees" | "schedules" | "payroll" | "reports" | "loyalty" | "admin" | "modules" | "periods" | "taxes" | "roles" | "settings";
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({
  label,
  iconType,
  isOpen,
  onToggle,
  children,
}) => (
  <div>
    <button
      onClick={onToggle}
      className="accordion-btn"
    >
      <div className="flex items-center gap-3">
        <span className="nav-link-icon flex items-center justify-center">
          <SidebarIcon type={iconType} size="md" className="text-white" />
        </span>
        <span>{label}</span>
      </div>
      <span className={`accordion-icon ${isOpen ? "open" : ""}`}>
        ▼
      </span>
    </button>
    {isOpen && <div className="accordion-content">{children}</div>}
  </div>
);

const NavLink: React.FC<{ href: string; label: string; iconType: "dashboard" | "pos" | "transactions" | "cierre" | "inventory" | "employees" | "schedules" | "payroll" | "reports" | "loyalty" | "admin" | "modules" | "periods" | "taxes" | "roles" | "settings"; isNested?: boolean }> = ({
  href,
  label,
  iconType,
  isNested = false,
}) => (
  <Link
    href={href}
    className={`nav-link ${isNested ? "nav-link-nested" : ""}`}
  >
    <span className="nav-link-icon flex items-center justify-center">
      <SidebarIcon type={iconType} size={isNested ? "md" : "lg"} className="text-white" />
    </span>
    <span className="nav-link-label">{label}</span>
  </Link>
);
