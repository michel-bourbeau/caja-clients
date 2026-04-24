"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/components/ui";
import { useCurrency } from "@/lib/utils/useCurrency";
import { formatDateTime, toNicaraguaDateString } from "@/lib/utils/formatters";
import { Transaction } from "@/lib/types";

interface Tax {
  id: string;
  name: string;
  rate: number;
  is_active: boolean;
}

type PeriodType = "WEEK" | "MONTH" | "YEAR";

export default function TaxesSettingsPage() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const { fmt } = useCurrency();
  const router = useRouter();

  // Taxes management states
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showAddTax, setShowAddTax] = useState(false);
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    rate: "",
  });

  // Report states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>("MONTH");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTaxId, setSelectedTaxId] = useState<string>("ALL");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    // Removido: verificação de permissão para permitir acesso a todos os admins
    fetchTaxes();
    fetchReport();
  }, [tenantId, user, periodType, currentDate]);

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tenants/${tenantId}/taxes`);
      if (res.ok) {
        setTaxes(await res.json());
      }
    } catch (error) {
      console.error("Error al cargar impuestos:", error);
      setMessage("Error al cargar impuestos");
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    if (!tenantId) return;
    try {
      setReportLoading(true);
      const res = await fetch(`/api/tenants/${tenantId}/transactions`);
      if (res.ok) {
        const data = await res.json();
        // Convert timestamp strings to Date objects with validation
        const transactionsWithDates = data.map((tx: any) => {
          let timestamp = new Date();
          
          if (tx.timestamp) {
            const parsed = new Date(tx.timestamp);
            // Check if date is valid
            if (!isNaN(parsed.getTime())) {
              timestamp = parsed;
            }
          }
          
          return {
            ...tx,
            timestamp,
          };
        });
        setTransactions(transactionsWithDates);
      }
    } catch (error) {
      console.error("Error al cargar transacciones:", error);
    } finally {
      setReportLoading(false);
    }
  };

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

  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // Apply date range filter
    list = list.filter((tx) => {
      const txDate = toNicaraguaDateString(tx.timestamp);
      return txDate >= dateRange.from && txDate <= dateRange.to;
    });

    // Apply tax filter
    if (selectedTaxId === "WITH_TAX") {
      list = list.filter((tx) => (tx.tax || 0) > 0);
    } else if (selectedTaxId === "WITHOUT_TAX") {
      list = list.filter((tx) => (tx.tax || 0) === 0);
    }
    // "ALL" shows all transactions

    // Sort by timestamp descending
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return list;
  }, [transactions, dateRange, selectedTaxId]);

  const taxStats = useMemo(() => {
    const totalTax = filteredTransactions.reduce((sum, tx) => sum + (tx.tax || 0), 0);
    const totalSales = filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);
    const countWithTax = filteredTransactions.filter((tx) => tx.tax && tx.tax > 0).length;

    // Build breakdown by tax type
    const taxByType: Record<string, { name: string; rate: number; total: number }> = {};
    
    filteredTransactions.forEach((tx) => {
      if (tx.tax_breakdown && Array.isArray(tx.tax_breakdown)) {
        tx.tax_breakdown.forEach((breakdown: any) => {
          const key = `${breakdown.name}-${breakdown.rate}`;
          if (!taxByType[key]) {
            taxByType[key] = {
              name: breakdown.name,
              rate: breakdown.rate,
              total: 0,
            };
          }
          taxByType[key].total += breakdown.amount || 0;
        });
      }
    });

    return {
      totalTax,
      totalSales,
      countWithTax,
      count: filteredTransactions.length,
      avgTaxPerTransaction: countWithTax > 0 ? totalTax / countWithTax : 0,
      taxByType: Object.values(taxByType),
    };
  }, [filteredTransactions]);

  const handleAddTax = async () => {
    if (!formData.name.trim() || !formData.rate) {
      setMessage("Por favor, completa todos los campos");
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${tenantId}/taxes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          rate: parseFloat(formData.rate),
          is_active: true,
        }),
      });

      if (res.ok) {
        setMessage("Impuesto creado exitosamente");
        setFormData({ name: "", rate: "" });
        setShowAddTax(false);
        await fetchTaxes();
      } else {
        const error = await res.json();
        setMessage(error.error || "Error al crear");
      }
    } catch (error) {
      setMessage("Error de conexión");
      console.error(error);
    }
  };

  const handleUpdateTax = async (taxId: string) => {
    if (!formData.name.trim() || !formData.rate) {
      setMessage("Por favor, completa todos los campos");
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${tenantId}/taxes/${taxId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          rate: parseFloat(formData.rate),
        }),
      });

      if (res.ok) {
        setMessage("Impuesto actualizado exitosamente");
        setFormData({ name: "", rate: "" });
        setEditingTaxId(null);
        await fetchTaxes();
      } else {
        const error = await res.json();
        setMessage(error.error || "Error al actualizar");
      }
    } catch (error) {
      setMessage("Error de conexión");
      console.error(error);
    }
  };

  const handleDeleteTax = async (taxId: string) => {
    if (!confirm("¿Confirmar la eliminación de este impuesto?")) return;

    try {
      const res = await fetch(`/api/tenants/${tenantId}/taxes/${taxId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage("Impuesto eliminado");
        await fetchTaxes();
      } else {
        setMessage("Error al eliminar");
      }
    } catch (error) {
      setMessage("Erreur réseau");
      console.error(error);
    }
  };

  const toggleTaxActive = async (tax: Tax) => {
    try {
      const res = await fetch(`/api/tenants/${tenantId}/taxes/${tax.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tax.name,
          rate: tax.rate,
          is_active: !tax.is_active,
        }),
      });

      if (res.ok) {
        await fetchTaxes();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Impuestos</h1>
        <Button
          onClick={() => {
            setShowAddTax(!showAddTax);
            setEditingTaxId(null);
            setFormData({ name: "", rate: "" });
          }}
          className="bg-green-600 text-white"
        >
          + Agregar Impuesto
        </Button>
      </div>

      {message && (
        <div className="p-3 bg-blue-100 text-blue-700 rounded">
          {message}
        </div>
      )}

      {/* Add/Edit Tax Form */}
      {(showAddTax || editingTaxId) && (
        <Card className="p-4 bg-white border-2 border-green-400">
          <h2 className="font-bold mb-4 text-gray-900 text-lg">
            {editingTaxId ? "Editar Impuesto" : "Nuevo Impuesto"}
          </h2>
          <div className="space-y-3">
            <Input
              label="Nombre del Impuesto"
              placeholder="Ej: IVA, ISC, Impuesto Municipal, etc."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Tasa (%)"
              type="number"
              placeholder="Ej: 15"
              step="0.01"
              min="0"
              max="100"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
            />
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  editingTaxId
                    ? handleUpdateTax(editingTaxId)
                    : handleAddTax()
                }
                className="bg-green-600 text-white"
              >
                {editingTaxId ? "Actualizar" : "Crear"}
              </Button>
              <Button
                onClick={() => {
                  setShowAddTax(false);
                  setEditingTaxId(null);
                  setFormData({ name: "", rate: "" });
                }}
                className="bg-gray-400"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Taxes List */}
      <div className="space-y-3">
        {taxes.length === 0 ? (
          <Card className="p-6 text-center text-gray-900">
            Sin impuestos configurados. Crea al menos un impuesto para usarlo en las ventas.
          </Card>
        ) : (
          taxes.map((tax) => (
            <Card key={tax.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
              <div>
                <p className="font-semibold text-gray-900">{tax.name}</p>
                <p className="text-sm text-gray-700">Tasa: {tax.rate}%</p>
              </div>
              <div className="flex gap-2 items-center">
                <Button
                  onClick={() => toggleTaxActive(tax)}
                  className={tax.is_active ? "bg-green-600 text-white" : "bg-gray-400"}
                >
                  {tax.is_active ? "✓ Activo" : "Inactivo"}
                </Button>
                <Button
                  onClick={() => {
                    setEditingTaxId(tax.id);
                    setFormData({ name: tax.name, rate: tax.rate.toString() });
                    setShowAddTax(false);
                  }}
                  className="bg-blue-500 text-white"
                >
                  ✎
                </Button>
                <Button
                  onClick={() => handleDeleteTax(tax.id)}
                  className="bg-red-500 text-white"
                >
                  ✕
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="p-4 bg-blue-50 border-2 border-blue-200">
        <h3 className="font-bold text-gray-900 mb-2">ℹ️ Información</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Los impuestos activos aparecerán en la sección "Resumen de Venta" del POS</li>
          <li>• Puedes definir múltiples impuestos (IVA, Impuesto municipal, etc.)</li>
          <li>• El nombre del impuesto es flexible: IVA, ISC, GST, etc.</li>
          <li>• Los impuestos inactivos no se utilizan en los cálculos</li>
        </ul>
      </Card>

      {/* TAX REPORT SECTION */}
      <div className="border-t pt-8 mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Reporte de Impuestos</h2>

        {/* Filters */}
        <Card className="p-4 bg-slate-50 border border-slate-200 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Period Buttons */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Período</label>
              <div className="flex gap-1 bg-slate-200 rounded-lg p-1">
                {(["WEEK", "MONTH", "YEAR"] as PeriodType[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setPeriodType(period)}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors flex-1 lg:flex-none ${
                      periodType === period
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {period === "WEEK" ? "Semana" : period === "MONTH" ? "Mes" : "Año"}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Navigation */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Fecha</label>
              <div className="flex gap-1 items-center">
                <button
                  onClick={() => navigatePeriod(-1)}
                  className="px-2 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold"
                >
                  ←
                </button>
                <span className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 text-center whitespace-nowrap">
                  {formatPeriodLabel()}
                </span>
                <button
                  onClick={() => navigatePeriod(1)}
                  className="px-2 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold"
                >
                  →
                </button>
              </div>
            </div>

            {/* Tax Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Filtrar por Impuesto</label>
              <select
                value={selectedTaxId}
                onChange={(e) => setSelectedTaxId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Todas las transacciones</option>
                <option value="WITH_TAX">Solo con impuestos</option>
                <option value="WITHOUT_TAX">Sin impuestos</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <p className="text-sm text-blue-700 font-medium">Total Impuestos</p>
            <p className="text-2xl font-bold text-blue-900">{fmt(taxStats.totalTax)}</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
            <p className="text-sm text-green-700 font-medium">Ventas Totales</p>
            <p className="text-2xl font-bold text-green-900">{fmt(taxStats.totalSales)}</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
            <p className="text-sm text-purple-700 font-medium">Transacciones con Impuesto</p>
            <p className="text-2xl font-bold text-purple-900">{taxStats.countWithTax}</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
            <p className="text-sm text-orange-700 font-medium">Impuesto Promedio</p>
            <p className="text-2xl font-bold text-orange-900">{fmt(taxStats.avgTaxPerTransaction)}</p>
          </Card>
        </div>

        {/* Tax Breakdown by Type */}
        {taxStats.taxByType.length > 0 && (
          <Card className="p-4 mb-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">📋 Desglose de Impuestos por Tipo</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Tipo de Impuesto</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-900">Tasa</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-900">Total Recaudado</th>
                  </tr>
                </thead>
                <tbody>
                  {taxStats.taxByType.map((tax, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{tax.name}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{tax.rate}%</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">{fmt(tax.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                    <td colSpan={2} className="px-4 py-3 text-slate-900">Total</td>
                    <td className="px-4 py-3 text-right text-blue-600">{fmt(taxStats.taxByType.reduce((sum, tax) => sum + tax.total, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
        <Card className="overflow-hidden">
          {reportLoading ? (
            <p className="text-center py-12 text-slate-500">Cargando transacciones...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-center py-12 text-slate-400">No hay transacciones en este período.</p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-800 text-white uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Hora</th>
                      <th className="px-4 py-3 text-left">Transacción</th>
                      <th className="px-4 py-3 text-left">Cajero</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                      <th className="px-4 py-3 text-right">Impuesto</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-center">Método</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {tx.timestamp.toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-slate-900 font-medium">{tx.id}</td>
                        <td className="px-4 py-3 text-slate-700">{tx.cashierName || "—"}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{fmt(tx.subtotal)}</td>
                        <td className="px-4 py-3 text-right">
                          {tx.tax && tx.tax > 0 ? (
                            <span className="font-semibold text-green-600">{fmt(tx.tax)}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(tx.total)}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              tx.paymentMethod === "CASH"
                                ? "bg-green-100 text-green-700"
                                : tx.paymentMethod === "CARD"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {tx.paymentMethod === "CASH"
                              ? "Efectivo"
                              : tx.paymentMethod === "CARD"
                              ? "Tarjeta"
                              : "Transferencia"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-2 p-3">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                    {/* Header: Time + Total */}
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-500">
                        {tx.timestamp.toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-lg font-bold text-slate-900">{fmt(tx.total)}</span>
                    </div>

                    {/* Transaction ID */}
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold">ID:</span> {tx.id}
                    </div>

                    {/* Cashier */}
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold">Cajero:</span> {tx.cashierName || "—"}
                    </div>

                    {/* Amounts */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-slate-500 font-medium">Subtotal</p>
                        <p className="font-semibold text-slate-900">{fmt(tx.subtotal)}</p>
                      </div>
                      <div
                        className={`p-2 rounded ${
                          tx.tax && tx.tax > 0 ? "bg-green-50" : "bg-slate-50"
                        }`}
                      >
                        <p className={`font-medium ${tx.tax && tx.tax > 0 ? "text-green-700" : "text-slate-500"}`}>
                          Impuesto
                        </p>
                        <p
                          className={`font-semibold ${
                            tx.tax && tx.tax > 0 ? "text-green-900" : "text-slate-400"
                          }`}
                        >
                          {tx.tax && tx.tax > 0 ? fmt(tx.tax) : "—"}
                        </p>
                      </div>
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="text-blue-700 font-medium">Método</p>
                        <p className="font-semibold text-blue-900 text-xs">
                          {tx.paymentMethod === "CASH"
                            ? "Efectivo"
                            : tx.paymentMethod === "CARD"
                            ? "Tarjeta"
                            : "Transfer."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
