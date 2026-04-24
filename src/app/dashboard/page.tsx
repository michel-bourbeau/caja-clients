"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Container,
  Section,
  Alert,
  Button,
} from "@/components/StripeUIComponents";
import Link from "next/link";
import { PageIcon } from "@/components";

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
      title: "Caja",
      icon: "🛒",
      description: "Crear nueva transacción de venta",
      href: "/dashboard/pos",
      color: "bg-blue-50 border-blue-200 text-blue-800",
      iconBg: "bg-blue-100",
      show: features.pos && hasPermission("pos.create"),
    },
    {
      id: "transactions",
      title: "Transacciones",
      icon: "📋",
      description: "Historial de ventas y movimientos",
      href: "/dashboard/transactions",
      color: "bg-slate-50 border-slate-200 text-slate-800",
      iconBg: "bg-slate-100",
      show: features.pos && hasPermission("pos.view"),
    },
    {
      id: "cierre",
      title: "Cierre de Caja",
      icon: "🔒",
      description: "Cierre de caja del día",
      href: "/dashboard/cierre",
      color: "bg-orange-50 border-orange-200 text-orange-800",
      iconBg: "bg-orange-100",
      show: features.pos && (hasPermission("pos.cierre") || hasPermission("pos.cierre_review")),
    },
    {
      id: "inventory",
      title: "Inventario",
      icon: "📦",
      description: "Gestión de productos y stock",
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
      title: "Asistencia",
      icon: "🕐",
      description: "Control de horarios y asistencia",
      href: "/dashboard/schedules",
      color: "bg-amber-50 border-amber-200 text-amber-800",
      iconBg: "bg-amber-100",
      show: features.schedules && (hasPermission("schedules.view") || hasPermission("schedules.checkin")),
    },
    {
      id: "payroll-periods",
      title: "Períodos",
      icon: "📅",
      description: "Períodos de pago",
      href: "/dashboard/payroll/periods",
      color: "bg-emerald-50 border-emerald-200 text-emerald-800",
      iconBg: "bg-emerald-100",
      show: features.payroll && (hasPermission("payroll.view") || hasPermission("payroll.create")),
    },
    {
      id: "payroll-receipts",
      title: "Recibos",
      icon: "🧾",
      description: "Recibos de pago",
      href: "/dashboard/payroll/receipts",
      color: "bg-lime-50 border-lime-200 text-lime-800",
      iconBg: "bg-lime-100",
      show: features.payroll && (hasPermission("payroll.view") || hasPermission("payroll.create")),
    },
    {
      id: "reports",
      title: "Reportes",
      icon: "📈",
      description: "Análisis y reportes de ventas",
      href: "/dashboard/reports",
      color: "bg-cyan-50 border-cyan-200 text-cyan-800",
      iconBg: "bg-cyan-100",
      show: features.reports && hasPermission("reports.view"),
    },
    {
      id: "loyalty",
      title: "Clientes Fieles",
      icon: "💳",
      description: "Programa de fidelización",
      href: "/dashboard/loyalty",
      color: "bg-rose-50 border-rose-200 text-rose-800",
      iconBg: "bg-rose-100",
      show: features.loyalty,
    },
    {
      id: "expenses",
      title: "Gastos",
      icon: "💰",
      description: "Registro de gastos y proveedores",
      href: "/dashboard/expenses",
      color: "bg-yellow-50 border-yellow-200 text-yellow-800",
      iconBg: "bg-yellow-100",
      show: hasPermission("expenses.create") || hasPermission("expenses.view_all"),
    },
    {
      id: "roles",
      title: "Gestionar Roles",
      icon: "🔐",
      description: "Permisos y roles de usuario",
      href: "/dashboard/admin/roles",
      color: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800",
      iconBg: "bg-fuchsia-100",
      show: hasPermission("settings.manage_roles"),
    },
    {
      id: "settings",
      title: "Configuración",
      icon: "⚙️",
      description: "Ajustes del sistema",
      href: "/dashboard/settings",
      color: "bg-indigo-50 border-indigo-200 text-indigo-800",
      iconBg: "bg-indigo-100",
      show: (features.settings || hasPermission("settings.manage_modules") || hasPermission("settings.manage_roles")) && hasPermission("settings.view"),
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
      <Container>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">Cargando...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {/* Welcome Section with Icon */}
      <div className="flex items-center gap-3 mb-6">
        <PageIcon type="dashboard" size="lg" displayType="lucide" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">{roleLabel[user?.roleId ?? ""] ?? user?.roleId ?? "Usuario"} — acceso a {visibleCards.length} módulo{visibleCards.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Modules Grid */}
        {/* Module cards grid */}
        {visibleCards.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-4xl mb-4">🔒</p>
              <p className="text-lg font-semibold text-slate-900">Sin acceso a módulos</p>
              <p className="text-slate-600 mt-2">Contacta con tu administrador para obtener permisos.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {visibleCards.map((card) => (
              <Link key={card.id} href={card.href} className="block">
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{card.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 text-base">{card.title}</h3>
                        <p className="text-sm text-slate-600 mt-1">{card.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      {/* Low Stock Alert Section */}
      {features.inventory && hasPermission("inventory.view") && lowStockProducts.length > 0 && (
        <Section title="Productos por Reabastecer" description="Stock bajo detectado">
          <Alert variant="warning" title={`${lowStockProducts.length} producto${lowStockProducts.length !== 1 ? "s" : ""} con stock bajo`}>
            <p className="text-sm mt-2">
              Los siguientes productos han alcanzado su stock mínimo. Considera reabastecer pronto.
            </p>
          </Alert>

          {/* Low stock products grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {lowStockProducts.map((p) => {
              const isEmpty = p.quantity <= 0;
              const pct = p.min_stock > 0 ? Math.min(100, Math.round((p.quantity / p.min_stock) * 100)) : 0;
              return (
                <Card key={p.id} className={isEmpty ? "border-red-200" : "border-amber-200"}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{p.name}</CardTitle>
                        <code className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block mt-1">{p.sku}</code>
                      </div>
                      <Badge variant={isEmpty ? "error" : "warning"}>
                        {isEmpty ? "Agotado" : "Bajo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Progress bar */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs text-slate-600 mb-2">
                          <span>Stock: <strong>{p.quantity}</strong></span>
                          <span>Mínimo: <strong>{p.min_stock}</strong></span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isEmpty ? "bg-red-400" : pct <= 50 ? "bg-amber-400" : "bg-orange-300"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">
                        Pedir <strong className="text-slate-900">{Math.max(0, p.min_stock - p.quantity + p.min_stock)}</strong> unidades para reponer
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Footer info */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
            <p>
              El stock mínimo se configura en cada producto desde{" "}
              <Link href="/dashboard/inventory" className="text-blue-600 hover:underline font-medium">
                Gestión de Inventario
              </Link>.
            </p>
          </div>
        </Section>
      )}
    </Container>
  );
}


