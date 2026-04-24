"use client";

import React from "react";
import { useEffect, useState, useCallback } from "react";
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
import {
  ShoppingCart,
  ReceiptText,
  Lock,
  Package,
  Users,
  Clock,
  Calendar,
  FileText,
  TrendingUp,
  CreditCard,
  DollarSign,
  Shield,
  Settings,
  Edit2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const { features, loading } = useTenantFeatures();
  const tenantId = useTenantId();
  const { fmt } = useCurrency();

  const firstName = user?.firstName ?? "Usuario";

  // Low-stock products
  const [lowStockProducts, setLowStockProducts] = useState<
    { id: string; name: string; quantity: number; min_stock: number; sku: string; isVariant?: boolean; parentName?: string; parentId?: string }[]
  >([]);
  
  // Edit mode for low-stock products
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  
  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch low-stock products (including variants)
  const fetchLowStockProducts = useCallback(async () => {
    if (!tenantId || !features.inventory) return;
    
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/tenants/${tenantId}/products`);
      const products = await res.json();
      
      const low: any[] = [];
      
      products.forEach((p: any) => {
        // Check main product
        if ((p.min_stock ?? 0) > 0 && p.stock_quantity <= p.min_stock) {
          low.push({
            id: p.id,
            name: p.name,
            quantity: p.stock_quantity,
            min_stock: p.min_stock,
            sku: p.sku,
            isVariant: false,
          });
        }
        
        // Check variants (multi-formato)
        if (p.variants && Array.isArray(p.variants)) {
          p.variants.forEach((v: any) => {
            if ((v.min_stock ?? 0) > 0 && v.stock_quantity <= v.min_stock) {
              low.push({
                id: v.id,
                name: v.name || v.format_name,
                quantity: v.stock_quantity,
                min_stock: v.min_stock,
                sku: v.sku,
                isVariant: true,
                parentName: p.name,
                parentId: p.id,
              });
            }
          });
        }
      });
      
      setLowStockProducts(low);
    } catch (err) {
      console.error("Error fetching low stock products:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [tenantId, features.inventory]);

  // Load on mount
  useEffect(() => {
    fetchLowStockProducts();
  }, [fetchLowStockProducts]);

  // Auto-refresh when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchLowStockProducts();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchLowStockProducts]);

  const handleEditStart = (productId: string, quantity: number) => {
    setEditingId(productId);
    setEditValues({ [productId]: quantity });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleEditSave = async (productId: string) => {
    const newQuantity = editValues[productId];
    const product = lowStockProducts.find((p) => p.id === productId);
    
    if (!product || newQuantity === undefined) return;

    try {
      let url: string;
      
      // Determiner le bon endpoint selon que c'est une variante ou un produit
      if (product.isVariant && product.parentId) {
        // Pour les variantes: /api/tenants/{tenantId}/products/{parentId}/variants/{variantId}
        url = `/api/tenants/${tenantId}/products/${product.parentId}/variants/${productId}`;
      } else {
        // Pour les produits: /api/tenants/{tenantId}/products/{productId}
        url = `/api/tenants/${tenantId}/products/${productId}`;
      }
      
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_quantity: newQuantity }),
      });

      if (!res.ok) throw new Error("Failed to update product");

      // Si le stock est maintenant >= min_stock, retirer le produit de la liste
      if (newQuantity >= product.min_stock) {
        setLowStockProducts((prev) => prev.filter((p) => p.id !== productId));
      } else {
        // Sinon, mettre à jour la quantité
        setLowStockProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, quantity: newQuantity } : p))
        );
      }

      setEditingId(null);
      setEditValues({});
    } catch (err) {
      console.error("Error updating product:", err);
    }
  };

  // Stat cards: only shown if user has permission AND module is active
  const statCards = [
    {
      id: "pos",
      title: "Caja",
      icon: ShoppingCart,
      description: "Crear nueva transacción de venta",
      href: "/dashboard/pos",
      color: "bg-blue-50 border-blue-200 text-blue-800",
      iconBg: "bg-blue-100",
      show: features.pos && hasPermission("pos.create"),
    },
    {
      id: "transactions",
      title: "Transacciones",
      icon: ReceiptText,
      description: "Historial de ventas y movimientos",
      href: "/dashboard/transactions",
      color: "bg-slate-50 border-slate-200 text-slate-800",
      iconBg: "bg-slate-100",
      show: features.pos && hasPermission("pos.view"),
    },
    {
      id: "cierre",
      title: "Cierre de Caja",
      icon: Lock,
      description: "Cierre de caja del día",
      href: "/dashboard/cierre",
      color: "bg-orange-50 border-orange-200 text-orange-800",
      iconBg: "bg-orange-100",
      show: features.pos && (hasPermission("pos.cierre") || hasPermission("pos.cierre_review")),
    },
    {
      id: "inventory",
      title: "Inventario",
      icon: Package,
      description: "Gestión de productos y stock",
      href: "/dashboard/inventory",
      color: "bg-green-50 border-green-200 text-green-800",
      iconBg: "bg-green-100",
      show: features.inventory && hasPermission("inventory.view"),
    },
    {
      id: "employees",
      title: "Empleados",
      icon: Users,
      description: "Gestión de personal",
      href: "/dashboard/employees",
      color: "bg-purple-50 border-purple-200 text-purple-800",
      iconBg: "bg-purple-100",
      show: features.employees && hasPermission("employees.view"),
    },
    {
      id: "schedules",
      title: "Asistencia",
      icon: Clock,
      description: "Control de horarios y asistencia",
      href: "/dashboard/schedules",
      color: "bg-amber-50 border-amber-200 text-amber-800",
      iconBg: "bg-amber-100",
      show: features.schedules && (hasPermission("schedules.view") || hasPermission("schedules.checkin")),
    },
    {
      id: "payroll-periods",
      title: "Períodos",
      icon: Calendar,
      description: "Períodos de pago",
      href: "/dashboard/payroll/periods",
      color: "bg-emerald-50 border-emerald-200 text-emerald-800",
      iconBg: "bg-emerald-100",
      show: features.payroll && (hasPermission("payroll.view") || hasPermission("payroll.create")),
    },
    {
      id: "payroll-receipts",
      title: "Recibos",
      icon: FileText,
      description: "Recibos de pago",
      href: "/dashboard/payroll/receipts",
      color: "bg-lime-50 border-lime-200 text-lime-800",
      iconBg: "bg-lime-100",
      show: features.payroll && (hasPermission("payroll.view") || hasPermission("payroll.create")),
    },
    {
      id: "reports",
      title: "Reportes",
      icon: TrendingUp,
      description: "Análisis y reportes de ventas",
      href: "/dashboard/reports",
      color: "bg-cyan-50 border-cyan-200 text-cyan-800",
      iconBg: "bg-cyan-100",
      show: features.reports && hasPermission("reports.view"),
    },
    {
      id: "loyalty",
      title: "Clientes Fieles",
      icon: CreditCard,
      description: "Programa de fidelización",
      href: "/dashboard/loyalty",
      color: "bg-rose-50 border-rose-200 text-rose-800",
      iconBg: "bg-rose-100",
      show: features.loyalty,
    },
    {
      id: "expenses",
      title: "Gastos",
      icon: DollarSign,
      description: "Registro de gastos y proveedores",
      href: "/dashboard/expenses",
      color: "bg-yellow-50 border-yellow-200 text-yellow-800",
      iconBg: "bg-yellow-100",
      show: hasPermission("expenses.create") || hasPermission("expenses.view_all"),
    },
    {
      id: "roles",
      title: "Gestionar Roles",
      icon: Shield,
      description: "Permisos y roles de usuario",
      href: "/dashboard/admin/roles",
      color: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800",
      iconBg: "bg-fuchsia-100",
      show: hasPermission("settings.manage_roles"),
    },
    {
      id: "settings",
      title: "Configuración",
      icon: Settings,
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
              <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-900">Sin acceso a módulos</p>
              <p className="text-slate-600 mt-2">Contacta con tu administrador para obtener permisos.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {visibleCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <Link key={card.id} href={card.href} className="block">
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${card.iconBg}`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 text-base">{card.title}</h3>
                          <p className="text-sm text-slate-600 mt-1">{card.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      
      {/* Debug: Show why Low Stock section is not displayed */}
      {(features.inventory && hasPermission("inventory.view")) && lowStockProducts.length === 0 && (
        <Card className="mt-12 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900">Sin productos con stock bajo</h3>
                <p className="text-sm text-blue-800 mt-1">
                  Todos los productos están con stock por encima del mínimo requerido o no tienen mínimo configurado.
                </p>
                <button
                  onClick={() => fetchLowStockProducts()}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  Actualizar
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug: Show permission issues */}
      {!(features.inventory && hasPermission("inventory.view")) && (
        <Card className="mt-12 bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-900">Acceso limitado</h3>
                <p className="text-sm text-amber-800 mt-1">
                  {!features.inventory ? "El módulo de Inventario no está habilitado. " : ""}
                  {!hasPermission("inventory.view") ? "No tienes permiso para ver el inventario." : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Low Stock Alert Section */}
      {features.inventory && hasPermission("inventory.view") && lowStockProducts.length > 0 && (
        <Section title="Productos por Reabastecer" description="Stock bajo detectado" className="mt-12">
          <Alert variant="warning" title={`${lowStockProducts.length} producto${lowStockProducts.length !== 1 ? "s" : ""} con stock bajo`}>
            <p className="text-sm mt-2">
              Los siguientes productos han alcanzado su stock mínimo. Considera reabastecer pronto.
            </p>
          </Alert>

          {/* Refresh button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => fetchLowStockProducts()}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          {/* Low stock products grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {lowStockProducts.map((p) => {
              const isEmpty = p.quantity <= 0;
              const pct = p.min_stock > 0 ? Math.min(100, Math.round((p.quantity / p.min_stock) * 100)) : 0;
              const isEditing = editingId === p.id;
              const currentQuantity = isEditing ? editValues[p.id] : p.quantity;

              return (
                <Card key={p.id} className={isEmpty ? "border-red-200" : "border-amber-200"}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {p.isVariant && (
                          <p className="text-xs text-slate-500 mb-1">
                            <span className="font-medium">{p.parentName}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base truncate">{p.name}</CardTitle>
                          {p.isVariant && (
                            <Badge variant="default" className="flex-shrink-0 text-xs">
                              Variante
                            </Badge>
                          )}
                        </div>
                        <code className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block mt-1">{p.sku}</code>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!isEditing && (
                          <button
                            onClick={() => handleEditStart(p.id, p.quantity)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                            title="Editar stock"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <Badge variant={isEmpty ? "error" : "warning"}>
                          {isEmpty ? "Agotado" : "Bajo"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Stock input or display */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-2">Stock Actual</label>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              value={currentQuantity}
                              onChange={(e) =>
                                setEditValues({ ...editValues, [p.id]: parseInt(e.target.value) || 0 })
                              }
                              className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditSave(p.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Guardar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-lg font-semibold text-slate-900">{p.quantity}</p>
                        )}
                      </div>

                      {/* Min stock display */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Mínimo Requerido</label>
                        <p className="text-sm text-slate-700">{p.min_stock} unidades</p>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-600 mb-2">
                          <span>Stock: <strong>{currentQuantity}</strong> / {p.min_stock}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isEmpty ? "bg-red-400" : pct <= 50 ? "bg-amber-400" : "bg-orange-300"
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Suggestion to order */}
                      {!isEditing && (
                        <p className="text-xs text-slate-600 pt-2">
                          Pedir <strong className="text-slate-900">{Math.max(0, p.min_stock - p.quantity + Math.floor(p.min_stock * 0.5))}</strong> unidades para reponer
                        </p>
                      )}
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


