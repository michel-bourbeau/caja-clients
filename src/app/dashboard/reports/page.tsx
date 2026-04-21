"use client";

import { useState, useEffect } from "react";
import { useTenantId } from "@/lib/utils/tenant";
import { useAuth } from "@/context/AuthContext";
import { toNicaraguaDateString } from "@/lib/utils/formatters";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

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

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Last 30 days
    return toNicaraguaDateString(d);
  });
  const [toDate, setToDate] = useState(toNicaraguaDateString(new Date()));

  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    if (!tenantId || !hasPermission("reports.view")) return;

    setLoading(true);
    setError(null);

    try {
      const [summaryRes, productRes, paymentRes] = await Promise.all([
        fetch(
          `/api/tenants/${tenantId}/reports?type=SUMMARY&fromDate=${fromDate}&toDate=${toDate}`
        ),
        fetch(
          `/api/tenants/${tenantId}/reports?type=PRODUCT&fromDate=${fromDate}&toDate=${toDate}`
        ),
        fetch(
          `/api/tenants/${tenantId}/reports?type=PAYMENT&fromDate=${fromDate}&toDate=${toDate}`
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
  }, [tenantId, fromDate, toDate]);

  if (!hasPermission("reports.view")) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p className="text-lg font-medium">No tienes permisos para ver reportes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes de Ventas</h1>
          <p className="text-sm text-slate-600 mt-1">Análisis de desempeño y tendencias</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Desde</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Hasta</label>
          <input
            type="date"
            value={toDate}
            max={toNicaraguaDateString(new Date())}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={loadReports}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {salesData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4">
            <p className="text-sm text-blue-700 font-semibold mb-1">Total de Ventas</p>
            <p className="text-3xl font-bold text-blue-900">C$ {salesData.summary.totalSales.toFixed(2)}</p>
            <p className="text-xs text-blue-600 mt-2">{salesData.summary.totalTransactions} transacciones</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-4">
            <p className="text-sm text-green-700 font-semibold mb-1">Promedio por Venta</p>
            <p className="text-3xl font-bold text-green-900">C$ {salesData.summary.averageTransaction.toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-2">({salesData.summary.totalTransactions} ventas)</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-4">
            <p className="text-sm text-orange-700 font-semibold mb-1">Descuentos</p>
            <p className="text-3xl font-bold text-orange-900">C$ {salesData.summary.totalDiscount.toFixed(2)}</p>
            <p className="text-xs text-orange-600 mt-2">
              {((salesData.summary.totalDiscount / (salesData.summary.totalSales + salesData.summary.totalDiscount)) * 100).toFixed(1)}% del total
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-4">
            <p className="text-sm text-purple-700 font-semibold mb-1">Mejor Hora</p>
            <p className="text-3xl font-bold text-purple-900">{String(salesData.summary.bestHour).padStart(2, "0")}:00</p>
            <p className="text-xs text-purple-600 mt-2">{salesData.summary.bestHourCount} transacciones</p>
          </div>
        </div>
      )}

      {/* Sales by Day Chart */}
      {salesData && salesData.byDay.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Ventas Diarias</h2>
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Breakdown */}
        {paymentData && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Métodos de Pago</h2>
            {paymentData.breakdown.length > 0 ? (
              <>
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
                <div className="space-y-2 mt-4">
                  {paymentData.breakdown.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        ></span>
                        {item.method}
                      </span>
                      <span className="font-semibold">C$ {item.amount.toFixed(2)} ({item.count})</span>
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Top 10 Productos (Ingresos)</h2>
            {productData.topByRevenue.length > 0 ? (
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
            ) : (
              <p className="text-slate-500 text-center py-8">No hay datos</p>
            )}
          </div>
        )}
      </div>

      {/* Top Products by Quantity */}
      {productData && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Top 10 Productos (Cantidad)</h2>
          {productData.topByQuantity.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 uppercase text-xs font-semibold">
                    <th className="px-4 py-3 text-left">Producto</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3 text-right">Ingresos</th>
                    <th className="px-4 py-3 text-right">Precio Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productData.topByQuantity.map((prod, i) => (
                    <tr key={prod.productId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        #{i + 1} {prod.name}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{prod.quantity}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        C$ {prod.revenue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        C$ {(prod.revenue / prod.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No hay datos</p>
          )}
        </div>
      )}
    </div>
  );
}
