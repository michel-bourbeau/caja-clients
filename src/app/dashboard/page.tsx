"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { Card } from "@/components/ui";
import Link from "next/link";

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const { features, loading } = useTenantFeatures();
  const tenantId = useTenantId();
  const { fmt } = useCurrency();

  const firstName = user?.firstName ?? "Usuario";

  // Low-stock products
  const [lowStockProducts, setLowStockProducts] = useState<
    { id: string; name: string; quantity: number; min_stock: number; sku: string }[]
  >([]);

  useEffect(() => {
    if (!tenantId || !features.inventory) return;
    fetch(`/api/tenants/${tenantId}/products`)
      .then((r) => r.json())
      .then((products: any[]) => {
        const low = products.filter(
          (p) => (p.min_stock ?? 0) > 0 && p.stock_quantity <= p.min_stock
        );
        setLowStockProducts(
          low.map((p) => ({
            id: p.id,
            name: p.name,
            quantity: p.stock_quantity,
            min_stock: p.min_stock,
            sku: p.sku,
          }))
        );
      })
      .catch(() => {});
  }, [tenantId, features.inventory]);

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

      {/* Low stock alert card */}
      {features.inventory && hasPermission("inventory.view") && lowStockProducts.length > 0 && (
        <div className="mt-10">
          {/* Card */}
          <div className="rounded-2xl border border-amber-200 bg-white shadow-md overflow-hidden">

            {/* Card header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 shadow-sm">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-amber-900">Productos por Reabastecer</h2>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {lowStockProducts.length} producto{lowStockProducts.length !== 1 ? "s" : ""} han alcanzado su stock mínimo
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/inventory"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
              >
                Ver inventario
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Product grid */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockProducts.map((p) => {
                const isEmpty = p.quantity <= 0;
                const pct = p.min_stock > 0 ? Math.min(100, Math.round((p.quantity / p.min_stock) * 100)) : 0;
                return (
                  <div
                    key={p.id}
                    className={`flex flex-col gap-2 p-4 rounded-xl border ${
                      isEmpty
                        ? "border-red-200 bg-red-50"
                        : "border-amber-100 bg-amber-50/60"
                    }`}
                  >
                    {/* Top row: name + badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate text-sm">{p.name}</p>
                        <span className="font-mono text-xs text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {p.sku}
                        </span>
                      </div>
                      <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                        isEmpty
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-amber-100 text-amber-700 border border-amber-200"
                      }`}>
                        {isEmpty ? (
                          <>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Agotado
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Stock bajo
                          </>
                        )}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Stock actual: <strong className={isEmpty ? "text-red-600" : "text-amber-700"}>{p.quantity}</strong></span>
                        <span>Mínimo: <strong className="text-slate-600">{p.min_stock}</strong></span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isEmpty ? "bg-red-400" : pct <= 50 ? "bg-amber-400" : "bg-orange-300"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* To order */}
                    <p className="text-xs text-slate-500">
                      Pedir al menos{" "}
                      <strong className="text-slate-700">{Math.max(0, p.min_stock - p.quantity + p.min_stock)}</strong>{" "}
                      unidades para reponer
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Card footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-slate-400">
                El stock mínimo se configura en cada producto desde{" "}
                <Link href="/dashboard/inventory" className="text-blue-500 hover:underline">
                  Gestión de Inventario
                </Link>.
              </p>
            </div>
          </div>
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

