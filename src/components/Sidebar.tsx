"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme, THEME_SCHEMES } from "@/context/ThemeContext";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";
import { ROUTES } from "@/lib/constants";
import { SidebarIcon } from "./SidebarIcon";

export const Sidebar: React.FC = () => {
  const { hasPermission, refreshPermissions, user } = useAuth();
  const { features } = useTenantFeatures();
  const { settings } = useTheme();
  const { t } = useLanguage();
  const pathname = usePathname();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pos: true,
    inventario: false,
    personal: false,
    finanzas: false,
    clientes: false,
    admin: false,
  });

  const canManageRoles = hasPermission("settings.manage_roles");
  const canManageModules = hasPermission("settings.manage_modules");

  // Refresh permissions on every navigation + auto-open the relevant accordion
  useEffect(() => {
    refreshPermissions();
    console.log("[Sidebar] Navigation to", pathname, "- user permissions:", user?.permissions?.length ?? 0);

    if (pathname.startsWith("/dashboard/pos") || pathname.startsWith("/dashboard/transactions") || pathname.startsWith("/dashboard/cash-sessions")) {
      setExpandedSections((prev) => ({ ...prev, pos: true }));
    } else if (pathname.startsWith("/dashboard/inventory")) {
      setExpandedSections((prev) => ({ ...prev, inventario: true }));
    } else if (
      pathname.startsWith("/dashboard/employees") ||
      pathname.startsWith("/dashboard/schedules") ||
      pathname.startsWith("/dashboard/payroll")
    ) {
      setExpandedSections((prev) => ({ ...prev, personal: true }));
    } else if (
      pathname.startsWith("/dashboard/reports") ||
      pathname.startsWith("/dashboard/profits") ||
      pathname.startsWith("/dashboard/bilan") ||
      pathname.startsWith("/dashboard/expenses")
    ) {
      setExpandedSections((prev) => ({ ...prev, finanzas: true }));
    } else if (pathname.startsWith("/dashboard/loyalty") || pathname.startsWith("/dashboard/contacts")) {
      setExpandedSections((prev) => ({ ...prev, clientes: true }));
    } else if (pathname.startsWith("/dashboard/admin") || pathname.startsWith("/dashboard/settings")) {
      setExpandedSections((prev) => ({ ...prev, admin: true }));
    }
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
        <NavLink href={ROUTES.DASHBOARD} label={t("nav.dashboard")} iconType="dashboard" />

        <div className="sidebar-divider"></div>

        {/* POS — Accordion, open by default */}
        {(hasPermission("pos.view") || hasPermission("pos.create")) && (
          <Accordion
            label={t("nav.pos")}
            iconType="pos"
            isOpen={expandedSections.pos}
            onToggle={() => toggleSection("pos")}
          >
            {hasPermission("pos.create") && (
              <NavLink href={ROUTES.POS} label={t("nav.caja")} iconType="pos" isNested />
            )}
            {hasPermission("pos.view") && (
              <NavLink href={ROUTES.TRANSACTIONS} label={t("nav.transactions")} iconType="transactions" isNested />
            )}
            {(hasPermission("pos.cierre") || hasPermission("pos.cierre_review")) && (
              <NavLink href={ROUTES.CIERRE} label={t("nav.cierreCaja")} iconType="cierre" isNested />
            )}
            {(hasPermission("pos.cierre") || hasPermission("pos.cierre_review")) && (
              <NavLink href={ROUTES.CASH_SESSIONS} label="Sessions de caisse" iconType="cierre" isNested />
            )}
          </Accordion>
        )}

        {/* Inventario — Accordion */}
        {hasPermission("inventory.view") && (
          <Accordion
            label={t("nav.inventario")}
            iconType="inventory"
            isOpen={expandedSections.inventario}
            onToggle={() => toggleSection("inventario")}
          >
            <NavLink href={ROUTES.PRODUCTS} label={t("nav.gestionProductos")} iconType="inventory" isNested />
          </Accordion>
        )}

        {/* Personal — Accordion */}
        {(hasPermission("employees.view") ||
          hasPermission("schedules.view") ||
          hasPermission("schedules.checkin") ||
          hasPermission("payroll.view") ||
          hasPermission("payroll.create")) && (
          <Accordion
            label={t("nav.personal")}
            iconType="employees"
            isOpen={expandedSections.personal}
            onToggle={() => toggleSection("personal")}
          >
            {hasPermission("employees.view") && (
              <NavLink href={ROUTES.EMPLOYEES} label={t("nav.empleados")} iconType="employees" isNested />
            )}
            {(hasPermission("schedules.view") || hasPermission("schedules.checkin")) && (
              <NavLink href={ROUTES.SCHEDULES} label={t("nav.asistencia")} iconType="schedules" isNested />
            )}
            {(hasPermission("payroll.view") || hasPermission("payroll.create")) && (
              <>
                <NavLink href={ROUTES.PAYROLL_PERIODS} label={t("nav.periodosPago")} iconType="periods" isNested />
                <NavLink href={ROUTES.PAYROLL} label={t("nav.reciboNomina")} iconType="payroll" isNested />
              </>
            )}
          </Accordion>
        )}

        {/* Finanzas — Accordion */}
        {(hasPermission("reports.view") ||
          hasPermission("expenses.create") ||
          hasPermission("expenses.view_all") ||
          hasPermission("expenses.view_own")) && (
          <Accordion
            label={t("nav.finanzas")}
            iconType="reports"
            isOpen={expandedSections.finanzas}
            onToggle={() => toggleSection("finanzas")}
          >
            {hasPermission("reports.view") && (
              <>
                <NavLink href={ROUTES.REPORTS} label={t("nav.reportesVentas")} iconType="reports" isNested />
                <NavLink href="/dashboard/profits" label={t("nav.analisisGanancias")} iconType="reports" isNested />
                {features?.reports && (
                  <NavLink href="/dashboard/bilan" label={t("nav.bilanFinanciero")} iconType="bilan" isNested />
                )}
              </>
            )}
            {(hasPermission("expenses.create") ||
              hasPermission("expenses.view_all") ||
              hasPermission("expenses.view_own")) && (
              <NavLink href="/dashboard/expenses" label={t("nav.gastos")} iconType="expenses" isNested />
            )}
          </Accordion>
        )}

        {/* Clientes — Accordion */}
        {(hasPermission("loyalty.view") || hasPermission("contacts.view")) && (
          <Accordion
            label={t("nav.clientes")}
            iconType="loyalty"
            isOpen={expandedSections.clientes}
            onToggle={() => toggleSection("clientes")}
          >
            {hasPermission("loyalty.view") && (
              <NavLink href="/dashboard/loyalty" label={t("nav.clientesFieles")} iconType="loyalty" isNested />
            )}
            {hasPermission("contacts.view") && (
              <NavLink href="/dashboard/contacts" label={t("nav.contactos")} iconType="contacts" isNested />
            )}
          </Accordion>
        )}

        {/* Admin — Accordion */}
        {(canManageRoles || canManageModules) && (
          <>
            <div className="sidebar-divider"></div>
            <Accordion
              label={t("nav.admin")}
              iconType="admin"
              isOpen={expandedSections.admin}
              onToggle={() => toggleSection("admin")}
            >
              {canManageRoles && (
                <NavLink href="/dashboard/admin/roles" label={t("nav.gestionarRoles")} iconType="roles" isNested />
              )}
              {(canManageRoles || canManageModules) && (
                <NavLink href={ROUTES.SETTINGS} label={t("nav.configuracionGeneral")} iconType="settings" isNested />
              )}
            </Accordion>
          </>
        )}
      </nav>
    </aside>
  );
};

interface AccordionProps {
  label: string;
  iconType: "dashboard" | "pos" | "transactions" | "cierre" | "inventory" | "employees" | "schedules" | "payroll" | "reports" | "loyalty" | "expenses" | "bilan" | "contacts" | "admin" | "modules" | "periods" | "taxes" | "roles" | "settings";
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

const NavLink: React.FC<{ href: string; label: string; iconType: "dashboard" | "pos" | "transactions" | "cierre" | "inventory" | "employees" | "schedules" | "payroll" | "reports" | "loyalty" | "expenses" | "bilan" | "contacts" | "admin" | "modules" | "periods" | "taxes" | "roles" | "settings"; isNested?: boolean }> = ({
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
