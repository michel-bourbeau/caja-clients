"use client";

import { useAuth } from "@/context/AuthContext";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";
import { Card } from "@/components/ui";
import Link from "next/link";

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const { features, loading } = useTenantFeatures();

  const firstName = user?.firstName ?? "Usuario";

  // Stat cards: only shown if user has permission AND module is active
  const statCards = [
    {
      id: "pos",
      title: "Point of Sale",
      icon: "🛒",
      description: "Gestionar ventas y cajas",
      href: "/dashboard/pos",
      color: "bg-blue-50 border-blue-200 text-blue-800",
      iconBg: "bg-blue-100",
      show: features.pos && hasPermission("pos.view"),
    },
    {
      id: "inventory",
      title: "Inventario",
      icon: "📦",
      description: "Productos y categorías",
      href: "/dashboard/inventory",
      color: "bg-green-50 border-green-200 text-green-800",
      iconBg: "bg-green-100",
      show: features.inventory && hasPermission("inventory.view"),
    },
    {
      id: "employees",
      title: "Empleados",
      icon: "👥",
      description: "Gestión de personal",
      href: "/dashboard/employees",
      color: "bg-purple-50 border-purple-200 text-purple-800",
      iconBg: "bg-purple-100",
      show: features.employees && hasPermission("employees.view"),
    },
    {
      id: "schedules",
      title: "Horarios",
      icon: "📅",
      description: "Turnos y disponibilidad",
      href: "/dashboard/schedules",
      color: "bg-amber-50 border-amber-200 text-amber-800",
      iconBg: "bg-amber-100",
      show: features.schedules && hasPermission("schedules.view"),
    },
    {
      id: "payroll",
      title: "Nómina",
      icon: "💰",
      description: "Cálculo de salarios",
      href: "/dashboard/payroll",
      color: "bg-emerald-50 border-emerald-200 text-emerald-800",
      iconBg: "bg-emerald-100",
      show: features.payroll && hasPermission("payroll.view"),
    },
    {
      id: "transactions",
      title: "Transacciones",
      icon: "📊",
      description: "Historial de ventas",
      href: "/dashboard/transactions",
      color: "bg-slate-50 border-slate-200 text-slate-800",
      iconBg: "bg-slate-100",
      show: features.pos && hasPermission("pos.view"),
    },
    {
      id: "settings",
      title: "Configuración",
      icon: "⚙️",
      description: "Ajustes del sistema",
      href: "/dashboard/settings",
      color: "bg-rose-50 border-rose-200 text-rose-800",
      iconBg: "bg-rose-100",
      show: features.settings && hasPermission("settings.view"),
    },
  ];

  const visibleCards = statCards.filter((c) => c.show);

  const roleLabel: Record<string, string> = {
    admin:    "Administrador",
    gerente:  "Gerente",
    cajero:   "Cajero",
    employee: "Empleado",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido, {firstName} 👋
        </h1>
        <p className="text-slate-600 mt-1">
          {roleLabel[user?.roleId ?? ""] ?? user?.roleId ?? "Usuario"} — acceso a {visibleCards.length} módulo{visibleCards.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Module cards */}
      {visibleCards.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-2xl mb-3">🔒</p>
          <p className="text-slate-700 font-medium">Sin acceso a módulos</p>
          <p className="text-sm text-slate-500 mt-1">Contacta con tu administrador para obtener permisos.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleCards.map((card) => (
            <Link key={card.id} href={card.href}>
              <div className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer hover:shadow-md transition-shadow ${card.color}`}>
                <div className={`p-3 rounded-lg text-2xl ${card.iconBg}`}>
                  {card.icon}
                </div>
                <div>
                  <p className="font-semibold text-base">{card.title}</p>
                  <p className="text-sm opacity-75 mt-0.5">{card.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Permissions summary */}
      <PermissionsSummary permissions={user?.permissions ?? []} />
    </div>
  );
}

const PERMISSION_META: Record<string, { label: string; description: string }> = {
  "pos.view":            { label: "Ver Cajas",          description: "Acceder al punto de venta" },
  "pos.create":          { label: "Crear Venta",        description: "Procesar nuevas ventas" },
  "pos.void":            { label: "Anular Venta",       description: "Cancelar ventas realizadas" },
  "pos.configure":       { label: "Configurar POS",     description: "Ajustes de las cajas" },
  "inventory.view":      { label: "Ver Inventario",     description: "Consultar productos y stock" },
  "inventory.create":    { label: "Agregar Producto",   description: "Crear nuevos productos" },
  "inventory.edit":      { label: "Editar Producto",    description: "Modificar productos existentes" },
  "inventory.delete":    { label: "Eliminar Producto",  description: "Borrar productos del sistema" },
  "inventory.adjust":    { label: "Ajustar Stock",      description: "Modificar cantidades en inventario" },
  "employees.view":      { label: "Ver Empleados",      description: "Consultar listado de personal" },
  "employees.create":    { label: "Agregar Empleado",   description: "Registrar nuevos empleados" },
  "employees.edit":      { label: "Editar Empleado",    description: "Modificar datos de personal" },
  "employees.delete":    { label: "Eliminar Empleado",  description: "Dar de baja empleados" },
  "schedules.view":      { label: "Ver Horarios",       description: "Consultar turnos y asistencia" },
  "schedules.edit":      { label: "Editar Horarios",    description: "Modificar turnos y asignaciones" },
  "schedules.checkin":   { label: "Registrar Entrada",  description: "Marcar entrada/salida" },
  "payroll.view":        { label: "Ver Nómina",         description: "Consultar liquidaciones" },
  "payroll.create":      { label: "Crear Nómina",       description: "Generar nuevas liquidaciones" },
  "payroll.approve":     { label: "Aprobar Nómina",     description: "Autorizar pagos de salarios" },
  "payroll.pay":         { label: "Pagar Nómina",       description: "Ejecutar el pago de salarios" },
  "settings.view":       { label: "Ver Configuración",  description: "Acceder a los ajustes del sistema" },
  "settings.edit":       { label: "Editar Ajustes",     description: "Modificar configuración del sistema" },
  "settings.manage_roles": { label: "Gestionar Roles",  description: "Crear y editar roles de usuario" },
  "manage_products":     { label: "Gestionar Productos", description: "Control total sobre productos" },
};

const MODULE_GROUPS: Array<{ id: string; label: string; icon: string; prefix: string }> = [
  { id: "pos",       label: "Point of Sale", icon: "🛒", prefix: "pos." },
  { id: "inventory", label: "Inventario",    icon: "📦", prefix: "inventory." },
  { id: "employees", label: "Empleados",     icon: "👥", prefix: "employees." },
  { id: "schedules", label: "Horarios",      icon: "📅", prefix: "schedules." },
  { id: "payroll",   label: "Nómina",        icon: "💰", prefix: "payroll." },
  { id: "settings",  label: "Configuración", icon: "⚙️", prefix: "settings." },
];

function PermissionsSummary({ permissions }: { permissions: string[] }) {
  const permsSet = new Set(permissions);

  const groups = MODULE_GROUPS.map((group) => ({
    ...group,
    perms: permissions.filter((p) => p.startsWith(group.prefix)),
  })).filter((g) => g.perms.length > 0);

  // Permissions that don't belong to any group
  const ungrouped = permissions.filter(
    (p) => !MODULE_GROUPS.some((g) => p.startsWith(g.prefix))
  );

  if (permissions.length === 0) return null;

  return (
    <div className="mt-8">
      <p className="text-sm font-semibold text-slate-700 mb-3">🔑 Tus accesos en este sistema</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {groups.map((group) => (
          <div key={group.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-sm font-bold text-slate-800 mb-2">
              {group.icon} {group.label}
            </p>
            <ul className="space-y-1">
              {group.perms.map((p) => {
                const meta = PERMISSION_META[p];
                return (
                  <li key={p} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 text-xs">✓</span>
                    <div>
                      <span className="text-xs font-semibold text-slate-700">
                        {meta?.label ?? p}
                      </span>
                      {meta?.description && (
                        <span className="text-xs text-slate-400 ml-1">— {meta.description}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {ungrouped.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-sm font-bold text-slate-800 mb-2">🔧 Otros</p>
            <ul className="space-y-1">
              {ungrouped.map((p) => {
                const meta = PERMISSION_META[p];
                return (
                  <li key={p} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 text-xs">✓</span>
                    <div>
                      <span className="text-xs font-semibold text-slate-700">{meta?.label ?? p}</span>
                      {meta?.description && (
                        <span className="text-xs text-slate-400 ml-1">— {meta.description}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

