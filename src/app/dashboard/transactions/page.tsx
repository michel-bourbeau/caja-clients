"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Container, Section, Badge, Alert } from "@/components/StripeUIComponents";
import { formatDateTime, toNicaraguaDateString } from "@/lib/utils/formatters";
import { useCurrency } from "@/lib/utils/useCurrency";
import { Transaction, Product } from "@/lib/types";
import { useTenantId } from "@/lib/utils/tenant";
import { TransactionService } from "@/features/transactions/services";

const PAYMENT_BADGE: Record<string, string> = {
  CASH: "bg-green-100 text-green-700",
  CARD: "bg-blue-100 text-blue-700",
  TRANSFER: "bg-purple-100 text-purple-700",
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

type PeriodType = "WEEK" | "MONTH" | "YEAR";

export default function TransactionsPage() {
  const tenantId = useTenantId();
  const { fmt } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<PeriodType>("MONTH");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState({
    paymentMethod: "ALL",
    search: "",
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    paymentMethod: "CASH" as "CASH" | "CARD" | "TRANSFER",
    datetime: "",
    amount_received: 0,
    change: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Calculate date range based on period type
  const getDateRange = (date: Date, type: PeriodType): { from: string; to: string } => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    if (type === "WEEK") {
      // Get start of week (Monday)
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
      // YEAR
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
    const month = currentDate.getMonth();

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

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    if (!tenantId) {
      setError("Tenant ID not found");
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const [transactionsData, productsData] = await Promise.all([
        TransactionService.fetchTransactions(tenantId),
        fetch(`/api/tenants/${tenantId}/products`).then((res) => res.json()),
      ]);
      setTransactions(transactionsData);
      setProducts(productsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const getProductName = (productId: string, itemName?: string): string => {
    if (itemName) return itemName;
    const product = products.find((p) => p.id === productId);
    return product?.name || productId;
  };

  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // Apply date range filter
    list = list.filter((tx) => {
      const txDate = toNicaraguaDateString(tx.timestamp);
      return txDate >= dateRange.from && txDate <= dateRange.to;
    });

    if (filters.paymentMethod !== "ALL") {
      list = list.filter((tx) => tx.paymentMethod === filters.paymentMethod);
    }
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (tx) =>
          tx.id.toLowerCase().includes(q) ||
          tx.items?.some((item: any) =>
            (item.name || "").toLowerCase().includes(q)
          )
      );
    }
    return list;
  }, [transactions, filters, dateRange]);

  const groupedByDate = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    filteredTransactions.forEach((tx) => {
      const key = toNicaraguaDateString(tx.timestamp);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(tx);
    });
    const sorted: Record<string, Transaction[]> = {};
    Object.keys(grouped)
      .sort()
      .reverse()
      .forEach((k) => (sorted[k] = grouped[k]));
    return sorted;
  }, [filteredTransactions]);

  const totals = useMemo(() => ({
    count: filteredTransactions.length,
    amount: filteredTransactions.reduce((s, tx) => s + tx.total, 0),
  }), [filteredTransactions]);

  const formatDateHeader = (dateString: string): string => {
    const [y, m, d] = dateString.split("-").map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    return date.toLocaleDateString("es-NI", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!tenantId) return;
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer."))
      return;
    try {
      setError(null);
      await TransactionService.deleteTransaction(tenantId, transactionId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar la transacción");
    }
  };

  const handleOpenDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    // Format as local Nicaragua time for the datetime-local input
    const tz = "America/Managua";
    const pad = (n: number) => String(n).padStart(2, "0");
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
      timeZone: tz,
    }).formatToParts(transaction.timestamp);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    const localDT = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
    setEditForm({
      paymentMethod: transaction.paymentMethod,
      datetime: localDT,
      amount_received: transaction.amount_received || 0,
      change: transaction.change || 0,
    });
  };

  const handleSaveChanges = async () => {
    if (!tenantId || !selectedTransaction) return;
    try {
      setIsSaving(true);
      setError(null);
      await TransactionService.updateTransaction(tenantId, selectedTransaction.id, {
        payment_method: editForm.paymentMethod,
        created_at: new Date(editForm.datetime).toISOString(),
        amount_received: editForm.amount_received,
        change: editForm.change,
      });
      await loadData();
      setSelectedTransaction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container>
      <Section>
        {/* Header */}
        <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Transacciones</h1>
            <p className="text-sm text-slate-600 mt-1">
              {totals.count} transacción{totals.count !== 1 ? "es" : ""}
              {totals.count > 0 && <> · Total: <span className="font-semibold text-slate-800">{fmt(totals.amount)}</span></>}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2"
          >
            <svg className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 0120 15M19.418 15A8 8 0 014 9" />
            </svg>
            {isLoading ? "Cargando..." : "Actualizar"}
          </Button>
        </div>

        {error && (
          <Alert variant="error" title="Error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Table container */}
        <Card>
          {/* Toolbar */}
          <div className="flex flex-col gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50 -m-6 mb-0 rounded-t-lg">
            {/* Line 1: Search */}
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Buscar por ID o producto..."
                className="w-full pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ paddingLeft: '32px' }}
              />
            </div>
            {/* Line 2: Period Filters + Payment Method */}
            <div className="flex gap-2 items-center justify-between flex-wrap">
              <div className="flex gap-2 items-center">
                {/* Period Buttons */}
                <div className="flex gap-1 bg-slate-200 rounded-lg p-1">
                  {(["WEEK", "MONTH", "YEAR"] as PeriodType[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => setPeriodType(period)}
                      className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                        periodType === period
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {period === "WEEK" ? "Semana" : period === "MONTH" ? "Mes" : "Año"}
                    </button>
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex gap-1">
                  <button
                    onClick={() => navigatePeriod(-1)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => navigatePeriod(1)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors"
                  >
                    →
                  </button>
                </div>

                {/* Period Label */}
                <span className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 whitespace-nowrap">
                  {formatPeriodLabel()}
                </span>
              </div>

              {/* Payment Method */}
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters((f) => ({ ...f, paymentMethod: e.target.value }))}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Todos los métodos</option>
                <option value="CASH">Efectivo</option>
                <option value="CARD">Tarjeta</option>
                <option value="TRANSFER">Transferencia</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-center py-12 text-slate-500">Cargando transacciones...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-center py-12 text-slate-400">No hay transacciones disponibles.</p>
          ) : (
          <div className="overflow-x-auto">
            {Object.entries(groupedByDate).map(([dateKey, dayTxs]) => {
              const dayTotal = dayTxs.reduce((s, tx) => s + tx.total, 0);
              return (
                <div key={dateKey}>
                  {/* Date group header */}
                  <div className="flex justify-between items-center px-4 py-2 bg-slate-700 text-white text-sm font-semibold sticky top-0 z-10">
                    <span className="capitalize">{formatDateHeader(dateKey)}</span>
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-600 px-2 py-0.5 rounded-full">
                        {dayTxs.length} venta{dayTxs.length > 1 ? "s" : ""}
                      </span>
                      <span className="text-white">{fmt(dayTotal)}</span>
                    </div>
                  </div>

                  {/* Table for this day */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-800 text-white text-sm font-semibold uppercase tracking-wide">
                        <th className="px-4 py-2 text-left text-white">Hora</th>
                        <th className="px-4 py-2 text-left text-white">Productos</th>
                        <th className="px-4 py-2 text-left hidden lg:table-cell text-white">Cajero</th>
                        <th className="px-4 py-2 text-center hidden sm:table-cell text-white">Método</th>
                        <th className="px-4 py-2 text-right hidden md:table-cell text-white">Subtotal</th>
                        <th className="px-4 py-2 text-right hidden md:table-cell text-white">Desc.</th>
                        <th className="px-4 py-2 text-right hidden md:table-cell text-white">Imp.</th>
                        <th className="px-4 py-2 text-right font-bold text-white">Total</th>
                        <th className="px-4 py-2 text-center w-24"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dayTxs.map((tx) => (
                        <tr key={tx.id} className="hover:bg-blue-50 transition-colors group">
                          <td className="px-4 py-2.5 text-slate-500 text-sm whitespace-nowrap">
                            {tx.timestamp.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-4 py-2.5 max-w-xs">
                            {tx.items && tx.items.length > 0 ? (
                              <div className="space-y-0.5">
                                {tx.items.map((item: any, i: number) => (
                                  <p key={i} className="text-sm text-slate-700 truncate">
                                    <span className="font-medium">{item.quantity}×</span>{" "}
                                    {getProductName(item.productId, item.name)}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400 italic">Sin productos</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-left hidden lg:table-cell">
                            <span className="text-sm text-slate-700">{tx.cashierName || "—"}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                            <Badge variant={tx.paymentMethod === "CASH" ? "success" : tx.paymentMethod === "CARD" ? "primary" : "default"}>
                              {PAYMENT_LABEL[tx.paymentMethod] ?? tx.paymentMethod}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm text-slate-600 hidden md:table-cell">
                            {fmt(tx.subtotal)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm hidden md:table-cell">
                            {(tx.discount || 0) > 0 ? (
                              <span className="text-amber-600">-{fmt(tx.discount || 0)}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm text-slate-600 hidden md:table-cell">
                            {(tx.tax || 0) > 0 ? fmt(tx.tax) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                            {fmt(tx.total)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex gap-1.5 justify-center">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenDetails(tx)}
                              >
                                Ver
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteTransaction(tx.id)}
                              >
                                ✕
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
            <div className="px-4 py-2 border-t border-slate-100 text-sm text-slate-400 bg-slate-50">
              {totals.count} transacción{totals.count !== 1 ? "es" : ""}
              {(filters.search || filters.paymentMethod !== "ALL") &&
                ` · filtrado de ${transactions.length}`}
            </div>
          </div>
          )}
        </Card>

      </Section>

      {/* Detail / Edit Modal */}
      {selectedTransaction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setSelectedTransaction(null)}
        >
          <Card className="w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex-shrink-0">
              <h2 className="font-semibold text-sm">Detalles de la Transacción</h2>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                aria-label="Cerrar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* ID */}
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-0.5">ID</p>
                <p className="font-mono text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 break-all">
                  {selectedTransaction.id}
                </p>
              </div>

              {/* Cashier */}
              {selectedTransaction.cashierName && (
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Cajero</p>
                  <p className="text-sm text-slate-700 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    {selectedTransaction.cashierName}
                  </p>
                </div>
              )}

              {/* Products */}
              {selectedTransaction.items && selectedTransaction.items.length > 0 && (
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">Productos</p>
                  <div className="bg-slate-50 rounded border border-slate-200 divide-y divide-slate-100">
                    {selectedTransaction.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-slate-900">{item.name || item.productId}</p>
                          <p className="text-sm text-slate-500">{item.quantity} × {fmt(item.price)}</p>
                        </div>
                        <p className="font-semibold text-slate-900">{fmt(item.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-slate-50 rounded border border-slate-200 divide-y divide-slate-100 text-sm">
                <div className="flex justify-between px-3 py-2 text-slate-600">
                  <span>Subtotal</span><span>{fmt(selectedTransaction.subtotal)}</span>
                </div>
                {(selectedTransaction.discount || 0) > 0 && (
                  <div className="flex justify-between px-3 py-2 text-amber-600">
                    <span>Descuento</span><span>-{fmt(selectedTransaction.discount || 0)}</span>
                  </div>
                )}
                {(selectedTransaction.tax || 0) > 0 && (
                  <div className="flex justify-between px-3 py-2 text-slate-600">
                    <span>Impuesto</span><span>{fmt(selectedTransaction.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2 font-bold text-slate-900">
                  <span>Total</span><span>{fmt(selectedTransaction.total)}</span>
                </div>
                {selectedTransaction.paymentMethod === "CASH" && (
                  <>
                    <div className="flex justify-between px-3 py-2 bg-blue-50 text-blue-700 font-medium">
                      <span>Monto Recibido</span><span>{fmt(selectedTransaction.amount_received || 0)}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2 bg-green-50 text-green-700 font-bold">
                      <span>Cambio</span><span>{fmt(selectedTransaction.change || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Método de Pago</label>
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value as "CASH" | "CARD" | "TRANSFER" })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="TRANSFER">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Fecha / Hora</label>
                  <input
                    type="datetime-local"
                    value={editForm.datetime}
                    onChange={(e) => setEditForm({ ...editForm, datetime: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Payment tracking fields (CASH only) */}
              {selectedTransaction.paymentMethod === "CASH" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded border border-blue-200">
                  <div>
                    <label className="block text-sm font-semibold text-blue-700 mb-1">Monto Recibido</label>
                    <input
                      type="number"
                      value={editForm.amount_received}
                      onChange={(e) => setEditForm({ ...editForm, amount_received: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-blue-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-green-700 mb-1">Cambio</label>
                    <input
                      type="number"
                      value={editForm.change}
                      onChange={(e) => setEditForm({ ...editForm, change: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-green-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
              <Button
                variant="secondary"
                onClick={() => setSelectedTransaction(null)}
                disabled={isSaving}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Container>
  );
}

