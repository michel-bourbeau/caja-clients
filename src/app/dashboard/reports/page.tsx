"use client";

import { useState, useEffect } from "react";
import { useTenantId } from "@/lib/utils/tenant";
import { useAuth } from "@/context/AuthContext";
import { toNicaraguaDateString } from "@/lib/utils/formatters";
import { Button, Container, Section, Alert } from "@/components/StripeUIComponents";
import { PageIcon, DashboardHeader, EmptyState } from "@/components";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

type PeriodType = "WEEK" | "MONTH" | "YEAR";

interface SalesData {
  summary: {
    totalSales: number;
    totalDiscount: number;
    totalTax: number;
    totalTransactions: number;
    averageTransaction: number;
    bestHour: number;
    bestHourCount: number;
  };
  byDay: Array<{
    date: string;
    sales: number;
    discount: number;
    tax: number;
    transactions: number;
    payment: Record<string, number>;
  }>;
  byHour: Array<{
    hour: number;
    sales: number;
    transactions: number;
  }>;
}

interface ProductData {
  topByRevenue: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
    count: number;
  }>;
  topByQuantity: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
    count: number;
  }>;
}

interface PaymentData {
  breakdown: Array<{
    method: string;
    amount: number;
    count: number;
  }>;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function ReportsPage() {
  const tenantId = useTenantId();
  const { user, hasPermission } = useAuth();

  const [periodType, setPeriodType] = useState<PeriodType>("MONTH");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range based on period type
  const getDateRange = (date: Date, type: PeriodType): { from: string; to: string } => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    if (type === "WEEK") {
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startDate = new Date(year, month, diff);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      return {
        from: toNicaraguaDateString(startDate),
        to: toNicaraguaDateString(endDate),
      };
    } else if (type === "MONTH") {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      return {
        from: toNicaraguaDateString(startDate),
        to: toNicaraguaDateString(endDate),
      };
    } else {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      return {
        from: toNicaraguaDateString(startDate),
        to: toNicaraguaDateString(endDate),
      };
    }
  };

  const dateRange = getDateRange(currentDate, periodType);

  const navigatePeriod = (direction: -1 | 1) => {
    const newDate = new Date(currentDate);
    if (periodType === "WEEK") {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else if (periodType === "MONTH") {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setFullYear(newDate.getFullYear() + direction);
    }
    setCurrentDate(newDate);
  };

  const formatPeriodLabel = (): string => {
    const year = currentDate.getFullYear();

    if (periodType === "WEEK") {
      const range = getDateRange(currentDate, "WEEK");
      const [y1, m1, d1] = range.from.split("-").map(Number);
      const [y2, m2, d2] = range.to.split("-").map(Number);
      const startDate = new Date(y1, m1 - 1, d1);
      const endDate = new Date(y2, m2 - 1, d2);
      return `${startDate.toLocaleDateString("es-NI", { day: "numeric", month: "short" })} - ${endDate.toLocaleDateString("es-NI", { day: "numeric", month: "short", year: "numeric" })}`;
    } else if (periodType === "MONTH") {
      return currentDate.toLocaleDateString("es-NI", { month: "long", year: "numeric" });
    } else {
      return year.toString();
    }
  };

  const loadReports = async () => {
    if (!tenantId || !hasPermission("reports.view")) return;

    setLoading(true);
    setError(null);

    try {
      const [summaryRes, productRes, paymentRes] = await Promise.all([
        fetch(
          `/api/tenants/${tenantId}/reports?type=SUMMARY&fromDate=${dateRange.from}&toDate=${dateRange.to}`
        ),
        fetch(
          `/api/tenants/${tenantId}/reports?type=PRODUCT&fromDate=${dateRange.from}&toDate=${dateRange.to}`
        ),
        fetch(
          `/api/tenants/${tenantId}/reports?type=PAYMENT&fromDate=${dateRange.from}&toDate=${dateRange.to}`
        ),
      ]);

      if (!summaryRes.ok || !productRes.ok || !paymentRes.ok) {
        throw new Error("Error fetching reports");
      }

      const [summary, products, payments] = await Promise.all([
        summaryRes.json(),
        productRes.json(),
        paymentRes.json(),
      ]);

      setSalesData(summary);
      setProductData(products);
      setPaymentData(payments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [tenantId, currentDate, periodType]);

  if (!hasPermission("reports.view")) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p className="text-lg font-medium">No tienes permisos para ver reportes.</p>
      </div>
    );
  }

  return (
    <Container>
      <Section>
        <DashboardHeader
          pageType="reports"
          title="Reportes de Ventas"
          subtitle="Análisis de desempeño y tendencias"
        />

        {/* Period Selector */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Period Buttons */}
            <div className="flex gap-1 bg-slate-200 rounded-lg p-1">
              {(["WEEK", "MONTH", "YEAR"] as PeriodType[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setPeriodType(period)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    periodType === period
                      ? "bg-blue-600 text-white"
                      : "bg-transparent text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  {period === "WEEK" ? "Semana" : period === "MONTH" ? "Mes" : "Año"}
                </button>
              ))}
            </div>

            {/* Period Navigation */}
            <div className="flex gap-2 items-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigatePeriod(-1)}
                className="px-2 py-1 text-xs"
              >
                ← Anterior
              </Button>
              <span className="text-sm font-semibold text-slate-900 min-w-40 text-center capitalize">
                {formatPeriodLabel()}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigatePeriod(1)}
                className="px-2 py-1 text-xs"
                disabled={periodType === "YEAR" && currentDate.getFullYear() === new Date().getFullYear()}
              >
                Siguiente →
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {/* Loading state */}
        {loading && (
          <EmptyState state="loading" message="Cargando reportes..." />
        )}

        {/* Summary Cards */}
        {!loading && salesData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-4">
              <p className="text-sm text-blue-700 font-semibold mb-1">Total de Ventas</p>
              <p className="text-3xl font-bold text-blue-900">C$ {salesData.summary.totalSales.toFixed(2)}</p>
              <p className="text-xs text-blue-600 mt-2">{salesData.summary.totalTransactions} transacciones</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-4">
              <p className="text-sm text-green-700 font-semibold mb-1">Promedio por Venta</p>
              <p className="text-3xl font-bold text-green-900">C$ {salesData.summary.averageTransaction.toFixed(2)}</p>
              <p className="text-xs text-green-600 mt-2">({salesData.summary.totalTransactions} ventas)</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 p-4">
              <p className="text-sm text-orange-700 font-semibold mb-1">Descuentos</p>
              <p className="text-3xl font-bold text-orange-900">C$ {salesData.summary.totalDiscount.toFixed(2)}</p>
              <p className="text-xs text-orange-600 mt-2">
                {((salesData.summary.totalDiscount / (salesData.summary.totalSales + salesData.summary.totalDiscount)) * 100).toFixed(1)}% del total
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-4">
              <p className="text-sm text-purple-700 font-semibold mb-1">Mejor Hora</p>
              <p className="text-3xl font-bold text-purple-900">{String(salesData.summary.bestHour).padStart(2, "0")}:00</p>
              <p className="text-xs text-purple-600 mt-2">{salesData.summary.bestHourCount} transacciones</p>
            </div>
          </div>
        )}

        {/* Sales by Hour Chart */}
        {salesData && salesData.byHour && salesData.byHour.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Ventas por Hora</h2>
            
            {/* Desktop Chart */}
            <div className="hidden sm:block">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData.byHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${String(value).padStart(2, "0")}:00`}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`C$ ${Number(value).toFixed(2)}`, "Ventas"]}
                    labelFormatter={(label) => `${String(label).padStart(2, "0")}:00`}
                  />
                  <Legend />
                  <Bar dataKey="sales" fill="#3B82F6" name="Ventas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Mobile List */}
            <div className="sm:hidden space-y-2">
              {salesData.byHour.filter((h: any) => h.sales > 0).map((hour: any) => (
                <div key={hour.hour} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="font-medium text-slate-900">{String(hour.hour).padStart(2, "0")}:00</p>
                    <p className="text-xs text-slate-600">{hour.transactions} transacciones</p>
                  </div>
                  <p className="font-bold text-blue-900">C$ {hour.sales.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sales by Day Chart */}
        {salesData && salesData.byDay.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Ventas Diarias</h2>
            
            {/* Desktop Chart */}
            <div className="hidden sm:block">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData.byDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString("es-NI", { month: "short", day: "numeric" })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`C$ ${Number(value).toFixed(2)}`, "Ventas"]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString("es-NI")}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    name="Ventas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Mobile List */}
            <div className="sm:hidden space-y-2">
              {salesData.byDay.map((day: any) => (
                <div key={day.date} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="font-medium text-slate-900">{new Date(day.date).toLocaleDateString("es-NI", { month: "short", day: "numeric" })}</p>
                    <p className="text-xs text-slate-600">{day.transactions} transacciones</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-900">C$ {day.sales.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Payment Method Breakdown */}
          {paymentData && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Métodos de Pago</h2>
              {paymentData.breakdown.length > 0 ? (
                <>
                  {/* Desktop Pie Chart */}
                  <div className="hidden sm:block">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={paymentData.breakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ method, percent }: any) => `${method} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                        >
                          {paymentData.breakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `C$ ${Number(value).toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Mobile and Desktop List */}
                  <div className="space-y-2">
                    {paymentData.breakdown.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          ></span>
                          <span className="text-sm font-medium text-slate-700">{item.method}</span>
                        </span>
                        <span className="text-sm font-semibold text-slate-900">C$ {item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-center py-8">No hay datos</p>
              )}
            </div>
          )}

          {/* Top Products by Revenue */}
          {productData && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Top 10 Productos (Ingresos)</h2>
              {productData.topByRevenue.length > 0 ? (
                <>
                  {/* Desktop Bar Chart */}
                  <div className="hidden sm:block">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={productData.topByRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => `C$ ${Number(value).toFixed(2)}`} />
                        <Bar dataKey="revenue" fill="#10B981" name="Ingresos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Mobile and Desktop List */}
                  <div className="sm:hidden space-y-2">
                    {productData.topByRevenue.slice(0, 5).map((prod, i) => (
                      <div key={`revenue-${prod.productId}-${i}`} className="flex justify-between items-start p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 text-sm">#{i + 1} {prod.name}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{prod.quantity} unidades</p>
                        </div>
                        <p className="font-bold text-green-900 text-sm">C$ {prod.revenue.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-center py-8">No hay datos</p>
              )}
            </div>
          )}
        </div>

        {/* Top Products by Quantity */}
        {productData && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Top 10 Productos (Cantidad)</h2>
            {productData.topByQuantity.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-900 text-white uppercase text-xs font-semibold">
                        <th className="px-4 py-3 text-left text-white">Producto</th>
                        <th className="px-4 py-3 text-right text-white">Cantidad</th>
                        <th className="px-4 py-3 text-right text-white">Ingresos</th>
                        <th className="px-4 py-3 text-right text-white">Precio Promedio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productData.topByQuantity.map((prod, i) => (
                        <tr key={prod.productId} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            #{i + 1} {prod.name}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">{prod.quantity}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            C$ {prod.revenue.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            C$ {(prod.revenue / prod.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Mobile Cards */}
                <div className="sm:hidden space-y-2">
                  {productData.topByQuantity.map((prod, i) => (
                    <div key={`quantity-${prod.productId}-${i}`} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 text-sm">#{i + 1}</p>
                          <p className="font-semibold text-slate-900 mt-0.5">{prod.name}</p>
                        </div>
                        <p className="text-right font-bold text-slate-900">C$ {prod.revenue.toFixed(2)}</p>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600 pt-2 border-t border-slate-200">
                        <span>{prod.quantity} unidades</span>
                        <span>Precio promedio: C$ {(prod.revenue / prod.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-slate-500 text-center py-8">No hay datos</p>
            )}
          </div>
        )}
      </Section>
    </Container>
  );
}
