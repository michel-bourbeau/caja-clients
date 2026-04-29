"use client";

import { useEffect, useState, useMemo } from "react";
import { Calendar, TrendingUp, DollarSign, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { toNicaraguaDateString } from "@/lib/utils/formatters";
import { Button, Card, Container, Section, Alert } from "@/components/StripeUIComponents";
import { ButtonGroup } from "@/components/ButtonGroup";
import { DashboardHeader, PageIcon } from "@/components";
import { TransactionService } from "@/features/transactions/services";
import { Transaction } from "@/lib/types";

type TabType = "summary" | "by-product" | "by-category" | "periods";
type PeriodType = "week" | "month" | "year";

export default function ProfitsPage() {
  const tenantId = useTenantId();
  const { fmt } = useCurrency();
  const [activeTab, setActiveTab] = useState<TabType>("summary");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<PeriodType>("week");
  const [periodDate, setPeriodDate] = useState(() => new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [periodGroupBy, setPeriodGroupBy] = useState<"day" | "week" | "month" | "year">("day");

  // Same date range logic as Transactions page
  const { dateFrom, dateTo } = useMemo(() => {
    const year = periodDate.getFullYear();
    const month = periodDate.getMonth();
    const day = periodDate.getDate();
    let from: Date, to: Date;

    if (periodType === "week") {
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      from = new Date(year, month, diff);
      to = new Date(from);
      to.setDate(to.getDate() + 6);
    } else if (periodType === "month") {
      from = new Date(year, month, 1);
      to = new Date(year, month + 1, 0);
    } else {
      from = new Date(year, 0, 1);
      to = new Date(year, 11, 31);
    }

    return {
      dateFrom: toNicaraguaDateString(from),
      dateTo: toNicaraguaDateString(to),
    };
  }, [periodDate, periodType]);

  // Fetch using the SAME service as the Transactions page
  const fetchData = async () => {
    if (!tenantId) return;
    setLoading(true);
    setMessage(null);
    try {
      const data = await TransactionService.fetchTransactions(tenantId, dateFrom, dateTo);
      setTransactions(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantId, dateFrom, dateTo]);

  // ---- Profit calculations from transactions (client-side) ----

  const summaryData = useMemo(() => {
    const result = {
      totalTransactions: transactions.filter((tx) => tx.status !== "REFUND").length,
      totalRevenue: 0,
      totalCOGS: 0,
      totalProfit: 0,
      avgProfit: 0,
      avgMargin: 0,
      refundCount: 0,
      refundAmount: 0,
      profitByPaymentMethod: {} as Record<string, { revenue: number; cogs: number; profit: number; count: number }>,
    };
    transactions.forEach((tx) => {
      const isRefund = tx.status === "REFUND";
      if (isRefund) result.refundCount += 1;
      let txRevenue = 0, txCOGS = 0;
      (tx.items || []).forEach((item) => {
        txRevenue += (item.price || 0) * (item.quantity || 1);
        txCOGS += (item.cost_price || 0) * (item.quantity || 1);
      });
      if (isRefund) result.refundAmount += Math.abs(txRevenue);
      const txProfit = txRevenue - txCOGS;
      result.totalRevenue += txRevenue;
      result.totalCOGS += txCOGS;
      result.totalProfit += txProfit;

      const method = tx.paymentMethod || "CASH";
      if (!isRefund) {
        if (!result.profitByPaymentMethod[method]) {
          result.profitByPaymentMethod[method] = { revenue: 0, cogs: 0, profit: 0, count: 0 };
        }
        result.profitByPaymentMethod[method].revenue += txRevenue;
        result.profitByPaymentMethod[method].cogs += txCOGS;
        result.profitByPaymentMethod[method].profit += txProfit;
        result.profitByPaymentMethod[method].count += 1;
      }
    });
    const completedCount = result.totalTransactions;
    result.avgProfit = completedCount > 0 ? result.totalProfit / completedCount : 0;
    result.avgMargin = result.totalRevenue > 0 ? (result.totalProfit / result.totalRevenue) * 100 : 0;
    return result;
  }, [transactions]);

  const productData = useMemo(() => {
    const map: Record<string, { productId: string; name: string; quantity: number; totalRevenue: number; totalCOGS: number; totalProfit: number }> = {};
    transactions.forEach((tx) => {
      (tx.items || []).forEach((item) => {
        const key = item.productId || item.name || "unknown";
        if (!map[key]) map[key] = { productId: key, name: item.name || key, quantity: 0, totalRevenue: 0, totalCOGS: 0, totalProfit: 0 };
        const qty = item.quantity || 1;
        const rev = (item.price || 0) * qty;
        const cogs = (item.cost_price || 0) * qty;
        map[key].quantity += qty;
        map[key].totalRevenue += rev;
        map[key].totalCOGS += cogs;
        map[key].totalProfit += rev - cogs;
      });
    });
    return Object.values(map)
      .map((p) => ({ ...p, avgMargin: p.totalRevenue > 0 ? (p.totalProfit / p.totalRevenue) * 100 : 0 }))
      .sort((a, b) => b.totalProfit - a.totalProfit);
  }, [transactions]);

  const categoryData = useMemo(() => {
    const map: Record<string, { categoryId: string; name: string; quantity: number; totalRevenue: number; totalCOGS: number; totalProfit: number }> = {};
    transactions.forEach((tx) => {
      (tx.items || []).forEach((item: any) => {
        const cat = item.category || "Sin categoría";
        if (!map[cat]) map[cat] = { categoryId: cat, name: cat, quantity: 0, totalRevenue: 0, totalCOGS: 0, totalProfit: 0 };
        const qty = item.quantity || 1;
        const rev = (item.price || 0) * qty;
        const cogs = (item.cost_price || 0) * qty;
        map[cat].quantity += qty;
        map[cat].totalRevenue += rev;
        map[cat].totalCOGS += cogs;
        map[cat].totalProfit += rev - cogs;
      });
    });
    return Object.values(map)
      .map((c) => ({ ...c, avgMargin: c.totalRevenue > 0 ? (c.totalProfit / c.totalRevenue) * 100 : 0 }))
      .sort((a, b) => b.totalProfit - a.totalProfit);
  }, [transactions]);

  const periodData = useMemo(() => {
    const map: Record<string, { period: string; revenue: number; cogs: number; profit: number; count: number }> = {};
    transactions.forEach((tx) => {
      const utcDate = new Date(tx.timestamp);
      const nicaraguaDate = new Date(utcDate.getTime() - 6 * 60 * 60 * 1000);
      let key: string;
      switch (periodGroupBy) {
        case "week": {
          const start = new Date(Date.UTC(nicaraguaDate.getUTCFullYear(), 0, 1));
          const weekNum = Math.floor((nicaraguaDate.getTime() - start.getTime()) / 86400000 / 7) + 1;
          key = `${nicaraguaDate.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
          break;
        }
        case "month":
          key = `${nicaraguaDate.getUTCFullYear()}-${String(nicaraguaDate.getUTCMonth() + 1).padStart(2, "0")}`;
          break;
        case "year":
          key = `${nicaraguaDate.getUTCFullYear()}`;
          break;
        default:
          key = `${nicaraguaDate.getUTCFullYear()}-${String(nicaraguaDate.getUTCMonth() + 1).padStart(2, "0")}-${String(nicaraguaDate.getUTCDate()).padStart(2, "0")}`;
      }
      if (!map[key]) map[key] = { period: key, revenue: 0, cogs: 0, profit: 0, count: 0 };
      (tx.items || []).forEach((item) => {
        const qty = item.quantity || 1;
        const rev = (item.price || 0) * qty;
        const cogs = (item.cost_price || 0) * qty;
        map[key].revenue += rev;
        map[key].cogs += cogs;
        map[key].profit += rev - cogs;
      });
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => a.period.localeCompare(b.period));
  }, [transactions, periodGroupBy]);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "summary", label: "Resumen", icon: <Target className="w-4 h-4" /> },
    { id: "by-product", label: "Por Producto", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "by-category", label: "Por Categoría", icon: <DollarSign className="w-4 h-4" /> },
    { id: "periods", label: "Períodos", icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <Container className="space-y-6">
      <DashboardHeader
        pageType="reports"
        title="Análisis de Ganancias"
        subtitle="Monitoree sus ganancias por período, producto y categoría"
      />

      {message && (
        <Alert variant="error">
          {message}
        </Alert>
      )}

      {/* Date Range Filter with Period Navigation */}
      <Section>
        <div className="space-y-4">
          {/* Period Type Selector */}
          <ButtonGroup
            options={[
              { id: "week", label: "Semana", color: "blue" },
              { id: "month", label: "Mes", color: "blue" },
              { id: "year", label: "Año", color: "blue" },
            ]}
            value={periodType}
            onChange={(value) => setPeriodType(value as PeriodType)}
            size="md"
          />

          {/* Period Navigation */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newDate = new Date(periodDate);
                  if (periodType === "week") newDate.setDate(newDate.getDate() - 7);
                  else if (periodType === "month") newDate.setMonth(newDate.getMonth() - 1);
                  else newDate.setFullYear(newDate.getFullYear() - 1);
                  setPeriodDate(newDate);
                }}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center px-4 py-2 bg-slate-50 rounded-lg min-w-fit">
                <span className="font-semibold text-slate-700">
                  {periodType === "week"
                    ? `Semana de ${dateFrom} a ${dateTo}`
                    : periodType === "month"
                    ? `${dateFrom} a ${dateTo}`
                    : `${dateFrom} a ${dateTo}`}
                </span>
              </div>

              <button
                onClick={() => {
                  const newDate = new Date(periodDate);
                  if (periodType === "week") newDate.setDate(newDate.getDate() + 7);
                  else if (periodType === "month") newDate.setMonth(newDate.getMonth() + 1);
                  else newDate.setFullYear(newDate.getFullYear() + 1);
                  setPeriodDate(newDate);
                }}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <Button onClick={fetchData} disabled={loading} className="whitespace-nowrap">
              {loading ? "Cargando..." : "Actualizar"}
            </Button>
          </div>
        </div>
      </Section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Section>
        {/* SUMMARY TAB */}
        {activeTab === "summary" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-slate-600 font-semibold">Transacciones</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{summaryData.totalTransactions}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-600 font-semibold">Ingresos Totales</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(summaryData.totalRevenue)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-600 font-semibold">Costo Total</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(summaryData.totalCOGS)}</p>
              </Card>
              <Card className="p-4 bg-green-50 border border-green-200">
                <p className="text-xs text-green-700 font-semibold">Ganancia Total</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{fmt(summaryData.totalProfit)}</p>
                {summaryData.refundCount > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    {summaryData.refundCount} remb. : -{fmt(summaryData.refundAmount)}
                  </p>
                )}
              </Card>
            </div>

            {/* Average metrics */}
            <Card className="p-6 bg-blue-50 border border-blue-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-blue-700 font-semibold">Ganancia Promedio por Venta</p>
                  <p className="text-xl font-bold text-blue-900 mt-1">{fmt(summaryData.avgProfit)}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-semibold">Margen Promedio</p>
                  <p className="text-xl font-bold text-blue-900 mt-1">{summaryData.avgMargin.toFixed(1)}%</p>
                </div>
              </div>
            </Card>

            {/* By Payment Method */}
            {Object.keys(summaryData.profitByPaymentMethod).length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Por Método de Pago</h3>
                <div className="space-y-3">
                  {Object.entries(summaryData.profitByPaymentMethod).map(([method, data]) => (
                    <div key={method} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{method}</p>
                        <p className="text-xs text-slate-600">{data.count} transacciones</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900">{fmt(data.profit)}</p>
                        <p className="text-xs text-slate-600">Margen: {data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) : 0}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* BY PRODUCT TAB */}
        {activeTab === "by-product" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Producto</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Cantidad</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Ingresos</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Costo</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Ganancia</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {productData.length > 0 ? (
                  productData.map((product) => (
                    <tr key={product.productId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-xs">{product.name}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{product.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(product.totalRevenue)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(product.totalCOGS)}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-700">{fmt(product.totalProfit)}</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-700">{product.avgMargin.toFixed(1)}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No hay datos disponibles
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* BY CATEGORY TAB */}
        {activeTab === "by-category" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Categoría</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Cantidad</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Ingresos</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Costo</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Ganancia</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {categoryData.length > 0 ? (
                  categoryData.map((category) => (
                    <tr key={category.categoryId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-xs">{category.name}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{category.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(category.totalRevenue)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(category.totalCOGS)}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-700">{fmt(category.totalProfit)}</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-700">{category.avgMargin.toFixed(1)}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No hay datos disponibles
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PERIODS TAB */}
        {activeTab === "periods" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {["day", "week", "month", "year"].map((period) => (
                <button
                  key={period}
                  onClick={() => setPeriodGroupBy(period as "day" | "week" | "month" | "year")}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    periodGroupBy === period
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  {period === "day" && "Día"}
                  {period === "week" && "Semana"}
                  {period === "month" && "Mes"}
                  {period === "year" && "Año"}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Período</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Transacciones</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Ingresos</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Costo</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {periodData.length > 0 ? (
                    periodData.map((period) => (
                      <tr key={period.period} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{period.period}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{period.count}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(period.revenue)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(period.cogs)}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">{fmt(period.profit)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No hay datos disponibles
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>
    </Container>
  );
}
