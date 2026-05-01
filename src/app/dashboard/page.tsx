"use client";

import React from "react";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useRoleName } from "@/lib/hooks/useRoleName";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Container,
  Section,
} from "@/components/StripeUIComponents";
import Link from "next/link";
import { DashboardHeader, LoadingSpinner } from "@/components";
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
  AlertCircle,
  RefreshCw,
  BookOpen,
  BarChart3,
  ArrowRight,
} from "lucide-react";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { features, loading } = useTenantFeatures();
  const tenantId = useTenantId();
  const { fmt } = useCurrency();
  const { roleName } = useRoleName(user?.roleId, tenantId ?? undefined);

  const canManageRoles = hasPermission("settings.manage_roles");
  const canManageModules = hasPermission("settings.manage_modules");

  const firstName = user?.firstName ?? "Usuario";

  // Low-stock products
  const [lowStockProducts, setLowStockProducts] = useState<
    { id: string; name: string; label?: string; quantity: number; min_stock: number; sku: string; isVariant?: boolean; parentName?: string; parentId?: string }[]
  >([]);
  
  // Edit mode for low-stock products
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  
  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ─── Today's Sales ───
  const [todaySales, setTodaySales] = useState<{
    total: number; count: number; cash: number; card: number; transfer: number; lastUpdated: Date | null;
  }>({ total: 0, count: 0, cash: 0, card: 0, transfer: 0, lastUpdated: null });
  const [todayLoading, setTodayLoading] = useState(false);

  const fetchTodaySales = useCallback(async () => {
    if (!tenantId) return;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    try {
      setTodayLoading(true);
      const res = await fetch(`/api/tenants/${tenantId}/transactions?from=${from}&to=${to}&page=1&limit=500`);
      if (!res.ok) return;
      const result = await res.json();
      const rows: any[] = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
      let total = 0, count = 0, cash = 0, card = 0, transfer = 0;
      rows.forEach((tx: any) => {
        if ((tx.status || "").toUpperCase() === "REFUNDED") return;
        const amount = tx.total ?? 0;
        total += amount;
        count++;
        const method = (tx.payment_method || "CASH").toUpperCase();
        if (method === "CARD") card += amount;
        else if (method === "TRANSFER") transfer += amount;
        else cash += amount;
      });
      setTodaySales({ total, count, cash, card, transfer, lastUpdated: new Date() });
    } catch (err) {
      console.error("[Dashboard] Error fetching today sales:", err);
    } finally {
      setTodayLoading(false);
    }
  }, [tenantId]);

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
                name: v.name || v.label,
                label: v.label,
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

  // Today's sales: load on mount + auto-refresh every 60s
  useEffect(() => {
    fetchTodaySales();
    const interval = setInterval(fetchTodaySales, 60_000);
    return () => clearInterval(interval);
  }, [fetchTodaySales]);

  // Auto-refresh when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchLowStockProducts();
      fetchTodaySales();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchLowStockProducts, fetchTodaySales]);

  const handleEditStart = (productId: string, quantity: number) => {
    setEditingId(productId);
    setEditValues({ [productId]: String(quantity) });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleEditSave = async (productId: string) => {
    const newQuantityStr = editValues[productId];
    const newQuantity = parseInt(newQuantityStr) || 0;
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
  // Today's payment breakdown percentages
  const todayCashPct = todaySales.total > 0 ? Math.round((todaySales.cash / todaySales.total) * 100) : 0;
  const todayCardPct = todaySales.total > 0 ? Math.round((todaySales.card / todaySales.total) * 100) : 0;
  const todayTransPct = Math.max(0, 100 - todayCashPct - todayCardPct);

  const statCards = [
    {
      id: "pos",
      title: t("dashboard.modules.pos.title"),
      icon: ShoppingCart,
      description: t("dashboard.modules.pos.description"),
      href: "/dashboard/pos",
      color: "bg-blue-50 border-blue-200 text-blue-800",
      iconBg: "bg-blue-100",
      group: "ventas",
      show: features.pos && hasPermission("pos.create"),
    },
    {
      id: "transactions",
      title: t("dashboard.modules.transactions.title"),
      icon: ReceiptText,
      description: t("dashboard.modules.transactions.description"),
      href: "/dashboard/transactions",
      color: "bg-slate-50 border-slate-200 text-slate-800",
      iconBg: "bg-slate-100",
      group: "ventas",
      show: features.pos && hasPermission("pos.view"),
    },
    {
      id: "cierre",
      title: t("dashboard.modules.cierre.title"),
      icon: Lock,
      description: t("dashboard.modules.cierre.description"),
      href: "/dashboard/pos/cierre",
      color: "bg-orange-50 border-orange-200 text-orange-800",
      iconBg: "bg-orange-100",
      group: "ventas",
      show: features.pos && (hasPermission("pos.cierre") || hasPermission("pos.cierre_review")),
    },
    {
      id: "inventory",
      title: t("dashboard.modules.inventory.title"),
      icon: Package,
      description: t("dashboard.modules.inventory.description"),
      href: "/dashboard/inventory",
      color: "bg-green-50 border-green-200 text-green-800",
      iconBg: "bg-green-100",
      group: "ventas",
      show: features.inventory && hasPermission("inventory.view"),
    },
    {
      id: "loyalty",
      title: t("dashboard.modules.loyalty.title"),
      icon: CreditCard,
      description: t("dashboard.modules.loyalty.description"),
      href: "/dashboard/loyalty",
      color: "bg-rose-50 border-rose-200 text-rose-800",
      iconBg: "bg-rose-100",
      group: "ventas",
      show: hasPermission("loyalty.view"),
    },
    {
      id: "profits",
      title: t("dashboard.modules.profits.title"),
      icon: TrendingUp,
      description: t("dashboard.modules.profits.description"),
      href: "/dashboard/profits",
      color: "bg-emerald-50 border-emerald-200 text-emerald-800",
      iconBg: "bg-emerald-100",
      group: "finanzas",
      show: features.reports && hasPermission("settings.manage_roles"),
    },
    {
      id: "bilan",
      title: t("dashboard.modules.bilan.title"),
      icon: BarChart3,
      description: t("dashboard.modules.bilan.description"),
      href: "/dashboard/bilan",
      color: "bg-blue-50 border-blue-200 text-blue-800",
      iconBg: "bg-blue-100",
      group: "finanzas",
      show: features.reports && hasPermission("reports.view"),
    },
    {
      id: "reports",
      title: t("dashboard.modules.reports.title"),
      icon: TrendingUp,
      description: t("dashboard.modules.reports.description"),
      href: "/dashboard/reports",
      color: "bg-cyan-50 border-cyan-200 text-cyan-800",
      iconBg: "bg-cyan-100",
      group: "finanzas",
      show: features.reports && hasPermission("reports.view"),
    },
    {
      id: "expenses",
      title: t("dashboard.modules.expenses.title"),
      icon: DollarSign,
      description: t("dashboard.modules.expenses.description"),
      href: "/dashboard/expenses",
      color: "bg-yellow-50 border-yellow-200 text-yellow-800",
      iconBg: "bg-yellow-100",
      group: "finanzas",
      show: features.expenses && (hasPermission("expenses.create") || hasPermission("expenses.view_all")),
    },
    {
      id: "employees",
      title: t("dashboard.modules.employees.title"),
      icon: Users,
      description: t("dashboard.modules.employees.description"),
      href: "/dashboard/employees",
      color: "bg-purple-50 border-purple-200 text-purple-800",
      iconBg: "bg-purple-100",
      group: "rrhh",
      show: features.employees && hasPermission("employees.view"),
    },
    {
      id: "schedules",
      title: t("dashboard.modules.schedules.title"),
      icon: Clock,
      description: t("dashboard.modules.schedules.description"),
      href: "/dashboard/schedules",
      color: "bg-amber-50 border-amber-200 text-amber-800",
      iconBg: "bg-amber-100",
      group: "rrhh",
      show: features.schedules && (hasPermission("schedules.view") || hasPermission("schedules.checkin")),
    },
    {
      id: "payroll-periods",
      title: t("dashboard.modules.payrollPeriods.title"),
      icon: Calendar,
      description: t("dashboard.modules.payrollPeriods.description"),
      href: "/dashboard/payroll/periods",
      color: "bg-emerald-50 border-emerald-200 text-emerald-800",
      iconBg: "bg-emerald-100",
      group: "rrhh",
      show: features.payroll && (hasPermission("payroll.view") || hasPermission("payroll.create")),
    },
    {
      id: "payroll-receipts",
      title: t("dashboard.modules.payrollReceipts.title"),
      icon: FileText,
      description: t("dashboard.modules.payrollReceipts.description"),
      href: "/dashboard/payroll/receipts",
      color: "bg-lime-50 border-lime-200 text-lime-800",
      iconBg: "bg-lime-100",
      group: "rrhh",
      show: features.payroll && (hasPermission("payroll.view") || hasPermission("payroll.create")),
    },
    {
      id: "contacts",
      title: t("dashboard.modules.contacts.title"),
      icon: BookOpen,
      description: t("dashboard.modules.contacts.description"),
      href: "/dashboard/contacts",
      color: "bg-indigo-50 border-indigo-200 text-indigo-800",
      iconBg: "bg-indigo-100",
      group: "admin",
      show: features.contacts && hasPermission("contacts.view"),
    },
    {
      id: "taxes",
      title: t("dashboard.modules.taxes.title"),
      icon: AlertCircle,
      description: t("dashboard.modules.taxes.description"),
      href: "/dashboard/settings/taxes",
      color: "bg-red-50 border-red-200 text-red-800",
      iconBg: "bg-red-100",
      group: "admin",
      show: features.taxes && (canManageRoles || canManageModules),
    },
    {
      id: "roles",
      title: t("dashboard.modules.roles.title"),
      icon: Shield,
      description: t("dashboard.modules.roles.description"),
      href: "/dashboard/admin/roles",
      color: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800",
      iconBg: "bg-fuchsia-100",
      group: "admin",
      show: features.employees && hasPermission("settings.manage_roles"),
    },
    {
      id: "settings",
      title: t("dashboard.modules.settings.title"),
      icon: Settings,
      description: t("dashboard.modules.settings.description"),
      href: "/dashboard/settings",
      color: "bg-indigo-50 border-indigo-200 text-indigo-800",
      iconBg: "bg-indigo-100",
      group: "admin",
      show: hasPermission("settings.view"),
    },
  ];

  const moduleGroups = [
    { id: "ventas",   label: t("dashboard.groups.ventas")   },
    { id: "finanzas", label: t("dashboard.groups.finanzas") },
    { id: "rrhh",     label: t("dashboard.groups.rrhh")     },
    { id: "admin",    label: t("dashboard.groups.admin")    },
  ];

  const visibleCards = statCards.filter((c) => c.show);

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {/* Welcome Section with Icon */}
      <DashboardHeader
        pageType="dashboard"
        title={t("dashboard.pageTitle")}
        subtitle={
          visibleCards.length === 1
            ? t("dashboard.subtitleOne", { role: roleName })
            : t("dashboard.subtitleMany", { role: roleName, count: visibleCards.length })
        }
      />

      {/* ─── Ventes Aujourd'hui ─── */}
      {features.pos && hasPermission("pos.view") && (
        <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 sm:p-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              {/* Live pulse dot */}
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <h2 className="font-semibold text-slate-800 text-base sm:text-lg leading-tight">
                {t("dashboard.today.title")}
              </h2>
              {todaySales.lastUpdated && (
                <span className="hidden sm:inline text-xs text-slate-400">
                  {t("dashboard.today.updatedAt")}{" "}
                  {todaySales.lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {todaySales.lastUpdated && (
                <span className="sm:hidden text-xs text-slate-400">
                  {todaySales.lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                onClick={fetchTodaySales}
                disabled={todayLoading}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-blue-600 transition-all disabled:opacity-40"
                aria-label="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${todayLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* KPI tiles — 3 columns on all sizes */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            {/* Total */}
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-blue-100 shadow-sm">
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">
                {t("dashboard.today.total")}
              </p>
              <p className="text-base sm:text-2xl font-bold text-slate-900 truncate">
                {!todaySales.lastUpdated && todayLoading ? (
                  <span className="inline-block w-16 h-5 bg-slate-200 animate-pulse rounded" />
                ) : (
                  fmt(todaySales.total)
                )}
              </p>
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-blue-100 shadow-sm">
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">
                {t("dashboard.today.sales")}
              </p>
              <p className="text-base sm:text-2xl font-bold text-slate-900">
                {!todaySales.lastUpdated && todayLoading ? (
                  <span className="inline-block w-8 h-5 bg-slate-200 animate-pulse rounded" />
                ) : (
                  todaySales.count
                )}
              </p>
            </div>

            {/* Panier moyen */}
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-blue-100 shadow-sm">
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">
                {t("dashboard.today.avg")}
              </p>
              <p className="text-base sm:text-2xl font-bold text-slate-900 truncate">
                {!todaySales.lastUpdated && todayLoading ? (
                  <span className="inline-block w-14 h-5 bg-slate-200 animate-pulse rounded" />
                ) : todaySales.count > 0 ? (
                  fmt(todaySales.total / todaySales.count)
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>

          {/* Payment method breakdown */}
          {todaySales.count > 0 && (
            <div>
              {/* Segmented bar */}
              <div className="flex h-2 rounded-full overflow-hidden mb-2 bg-slate-100">
                {todayCashPct > 0 && (
                  <div className="bg-emerald-500 transition-all" style={{ width: `${todayCashPct}%` }} />
                )}
                {todayCardPct > 0 && (
                  <div className="bg-blue-500 transition-all" style={{ width: `${todayCardPct}%` }} />
                )}
                {todayTransPct > 0 && (
                  <div className="bg-violet-500 transition-all" style={{ width: `${todayTransPct}%` }} />
                )}
              </div>
              {/* Labels */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                {todayCashPct > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
                    {t("dashboard.today.cash")}&nbsp;
                    <span className="font-medium text-slate-800">{fmt(todaySales.cash)}</span>
                    <span className="text-slate-400">({todayCashPct}%)</span>
                  </span>
                )}
                {todayCardPct > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block flex-shrink-0" />
                    {t("dashboard.today.card")}&nbsp;
                    <span className="font-medium text-slate-800">{fmt(todaySales.card)}</span>
                    <span className="text-slate-400">({todayCardPct}%)</span>
                  </span>
                )}
                {todayTransPct > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-violet-500 inline-block flex-shrink-0" />
                    {t("dashboard.today.transfer")}&nbsp;
                    <span className="font-medium text-slate-800">{fmt(todaySales.transfer)}</span>
                    <span className="text-slate-400">({todayTransPct}%)</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!todayLoading && todaySales.count === 0 && todaySales.lastUpdated && (
            <p className="text-sm text-slate-400 text-center py-1">{t("dashboard.today.noSales")}</p>
          )}

          {/* Link to transactions */}
          <div className="mt-3 flex justify-end">
            <Link
              href="/dashboard/transactions"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
            >
              {t("dashboard.today.viewAll")}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Modules — grouped by category */}
        {visibleCards.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-900">{t("dashboard.noModules")}</p>
              <p className="text-slate-600 mt-2">{t("dashboard.noModulesDesc")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {moduleGroups.map((group) => {
              const cards = visibleCards.filter((c) => c.group === group.id);
              if (cards.length === 0) return null;
              return (
                <div key={group.id}>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 px-1">
                    {group.label}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {cards.map((card) => {
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
                </div>
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
                <h3 className="font-semibold text-blue-900">{t("dashboard.noLowStock")}</h3>
                <p className="text-sm text-blue-800 mt-1">{t("dashboard.noLowStockDesc")}</p>
                <button
                  onClick={() => fetchLowStockProducts()}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-all"
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
                  {t("dashboard.refresh")}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low stock products section */}
      {lowStockProducts.length > 0 && (
        <Section className="mt-12" title={t("dashboard.lowStockTitle")}>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">
                            {p.isVariant ? p.parentName : p.name}
                          </CardTitle>
                          {p.isVariant && (
                            <Badge variant="default" className="flex-shrink-0 text-xs">
                              {p.label || p.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {isEmpty ? (
                          <Badge variant="error" className="text-base font-semibold px-3 py-1">URGENTE</Badge>
                        ) : (
                          <Badge variant="warning" className="text-base font-semibold px-3 py-1">{pct}% stock</Badge>
                        )}
                        {!isEditing && (
                          <button
                            onClick={() => handleEditStart(p.id, p.quantity)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                            title="Editar stock"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Progress bar */}
                      <div>
                        <div className="flex justify-between text-base text-slate-600 mb-2">
                          <span>{t("dashboard.stockInfo", { qty: String(currentQuantity), min: p.min_stock })}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              pct <= 40 ? "bg-red-600" : pct <= 60 ? "bg-orange-600" : pct <= 80 ? "bg-orange-300" : "bg-green-300"
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Suggestion to order */}
                      {!isEditing && (
                        <p className="text-base text-slate-600 pt-2">
                          {t("dashboard.reorderSuggestion", { qty: Math.max(0, p.min_stock - p.quantity) })}
                        </p>
                      )}

                      {/* Edit mode */}
                      {isEditing && (
                        <div className="flex gap-2 items-end pt-2">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-600 mb-1">{t("dashboard.newQuantity")}</label>
                            <input
                              type="number"
                              min="0"
                              value={editValues[p.id] ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                  setEditValues({ ...editValues, [p.id]: "" });
                                } else {
                                  const num = Number(val);
                                  if (!isNaN(num) && num >= 0) {
                                    setEditValues({ ...editValues, [p.id]: String(num) });
                                  }
                                }
                              }}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          </div>
                          <button
                            onClick={() => handleEditSave(p.id)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                            title="Guardar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="px-3 py-1.5 bg-slate-300 text-slate-700 rounded text-sm font-medium hover:bg-slate-400"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
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
              {t("dashboard.inventoryLink")}{" "}
              <Link href="/dashboard/inventory" className="text-blue-600 hover:underline font-medium">
                {t("dashboard.inventoryManagement")}
              </Link>.
            </p>
          </div>
        </Section>
      )}
    </Container>
  );
}


