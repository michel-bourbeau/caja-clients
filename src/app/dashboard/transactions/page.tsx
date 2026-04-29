"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Trash2, RefreshCw, RotateCcw } from "lucide-react";
import { Button, Card, Container, Section, Badge, Alert } from "@/components/StripeUIComponents";
import { IconButton, PageIcon, SearchInput, DashboardHeader, Dialog, DialogFooter } from "@/components";
import { formatDateTime, toNicaraguaDateString } from "@/lib/utils/formatters";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useTenantFeatures } from "@/context/TenantFeaturesContext";
import { Transaction, Product } from "@/lib/types";
import { useTenantId } from "@/lib/utils/tenant";
import { TransactionService } from "@/features/transactions/services";

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

type PeriodType = "WEEK" | "MONTH" | "YEAR";

export default function TransactionsPage() {
  const tenantId = useTenantId();
  const { fmt } = useCurrency();
  const { features, loading: featuresLoading, error: featuresError } = useTenantFeatures();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTaxModuleEnabled, setIsTaxModuleEnabled] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>("WEEK");
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
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [showRefundModal, setShowRefundModal] = useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState("");

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
    if (tenantId) {
      // Load products once
      fetch(`/api/tenants/${tenantId}/products`)
        .then((res) => res.json())
        .then((data) => setProducts(data))
        .catch((err) => console.error("Failed to load products:", err));
    }
  }, [tenantId]);

  // Load transactions when date range changes
  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId, currentDate, periodType]);

  // Update tax module status when features load
  useEffect(() => {
    if (features) {
      setIsTaxModuleEnabled(features.taxes ?? false);
    }
  }, [features?.taxes]);

  const loadData = async () => {
    if (!tenantId) {
      setError("Tenant ID not found");
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      // Fetch transactions for the current date range
      const transactionsData = await TransactionService.fetchTransactions(
        tenantId,
        dateRange.from,
        dateRange.to
      );
      setTransactions(transactionsData);
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
    count: filteredTransactions.filter((tx) => tx.status !== "REFUND").length,
    amount: filteredTransactions.reduce((s, tx) => s + tx.total, 0),
    taxes: filteredTransactions.reduce((s, tx) => s + (tx.tax || 0), 0),
    refundCount: filteredTransactions.filter((tx) => tx.status === "REFUND").length,
    refundAmount: filteredTransactions.filter((tx) => tx.status === "REFUND").reduce((s, tx) => s + Math.abs(tx.total), 0),
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

  const handleRefund = async (tx: Transaction) => {
    if (!tenantId) return;
    setRefundingId(tx.id);
    try {
      setError(null);
      const res = await fetch(`/api/tenants/${tenantId}/transactions/${tx.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: refundReason }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Erreur lors du remboursement");
        return;
      }
      setShowRefundModal(null);
      setRefundReason("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <Container>
      <Section>
        <DashboardHeader
          pageType="transactions"
          title="Transacciones"
          subtitle={`${totals.count} transacción${totals.count !== 1 ? "es" : ""}`}
        />

        {featuresError && (
          <Alert variant="error" title="Configuration Error" className="mb-6">
            Failed to load tenant features: {featuresError}. Using default settings.
          </Alert>
        )}

        {error && (
          <Alert variant="error" title="Error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Table container */}
        <Card>
          {/* Toolbar */}
          <div className="flex flex-col gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50 -m-6 mb-0 rounded-t-lg">
            {/* Period Summary - Total for selected period */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-blue-700 font-medium">
                      Total net {periodType === "WEEK" ? "de la semaine" : periodType === "MONTH" ? "du mois" : "de l'année"}:
                    </span>
                    <div className="text-lg font-bold text-blue-900">{fmt(totals.amount)}</div>
                  </div>
                  {totals.refundCount > 0 && (
                    <div>
                      <span className="text-sm text-red-600 font-medium">
                        Remboursements ({totals.refundCount}):
                      </span>
                      <div className="text-lg font-bold text-red-600">-{fmt(totals.refundAmount)}</div>
                    </div>
                  )}
                  {isTaxModuleEnabled && (
                    <div>
                      <span className="text-sm text-blue-700 font-medium">
                        Total Impuestos:
                      </span>
                      <div className="text-lg font-bold text-blue-900">{fmt(totals.taxes)}</div>
                    </div>
                  )}
                </div>
                <button
                  onClick={loadData}
                  disabled={isLoading}
                  className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                  title="Actualizar datos"
                >
                  <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
            {/* Line 1: Search */}
            <SearchInput
              value={filters.search}
              onChange={(value) => setFilters((f) => ({ ...f, search: value }))}
              placeholder="Buscar por ID o producto..."
              className="flex-1"
            />
            {/* Line 2: Period Filters + Payment Method */}
            <div className="flex gap-2 items-center justify-between flex-wrap">
              <div className="w-full lg:w-auto flex flex-col lg:flex-row gap-2 items-center">
                {/* Mobile: Date with navigation arrows at top */}
                <div className="lg:hidden w-full flex gap-1 items-center justify-between">
                  <button
                    onClick={() => navigatePeriod(-1)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors"
                  >
                    ←
                  </button>
                  <span className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 text-center">
                    {formatPeriodLabel()}
                  </span>
                  <button
                    onClick={() => navigatePeriod(1)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors"
                  >
                    →
                  </button>
                </div>

                {/* Period Buttons */}
                <div className="w-full lg:w-auto flex gap-1 bg-slate-200 rounded-lg p-1">
                  {(["WEEK", "MONTH", "YEAR"] as PeriodType[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => setPeriodType(period)}
                      className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-colors flex-1 lg:flex-none ${
                        periodType === period
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {period === "WEEK" ? "Semana" : period === "MONTH" ? "Mes" : "Año"}
                    </button>
                  ))}
                </div>

                {/* Navigation + Date - Desktop only */}
                <div className="hidden lg:flex gap-1 items-center">
                  <button
                    onClick={() => navigatePeriod(-1)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors"
                  >
                    ←
                  </button>
                  <span className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 whitespace-nowrap">
                    {formatPeriodLabel()}
                  </span>
                  <button
                    onClick={() => navigatePeriod(1)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters((f) => ({ ...f, paymentMethod: e.target.value }))}
                className="px-3 py-1.5 pr-10 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full lg:w-auto appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2224%22%20height=%2224%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23475569%22%20stroke-width=%222%22%3E%3Cpolyline%20points=%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right bg-[length:24px] pr-12"
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
                  <div className="flex justify-between items-center px-3 lg:px-4 py-2 bg-slate-700 text-white text-sm font-semibold sticky top-0 z-10">
                    <span className="capitalize">{formatDateHeader(dateKey)}</span>
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-600 px-2 py-0.5 rounded-full text-xs lg:text-sm">
                        {dayTxs.length} venta{dayTxs.length > 1 ? "s" : ""}
                      </span>
                      <span className="text-white text-xs lg:text-sm">{fmt(dayTotal)}</span>
                    </div>
                  </div>

                  {/* Mobile: Card view | Desktop: Table view */}
                  <div className="hidden lg:block">
                    {/* Desktop Table */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-800 text-white text-sm font-semibold uppercase tracking-wide">
                          <th className="px-4 py-2 text-left text-white">Hora</th>
                          <th className="px-4 py-2 text-left text-white">Productos</th>
                          <th className="px-4 py-2 text-left hidden lg:table-cell text-white">Cajero</th>
                          <th className="px-4 py-2 text-center hidden lg:table-cell text-white">Método</th>
                          <th className="px-4 py-2 text-right hidden lg:table-cell text-white">Subtotal</th>
                          <th className="px-4 py-2 text-right hidden lg:table-cell text-white">Desc.</th>
                          <th className="px-4 py-2 text-right hidden lg:table-cell text-white">Imp.</th>
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
                            <td className="px-4 py-2.5 text-center hidden lg:table-cell">
                              {tx.status === "REFUND" ? (
                                <Badge variant="error">Remboursé</Badge>
                              ) : (
                                <Badge variant={tx.paymentMethod === "CASH" ? "success" : tx.paymentMethod === "CARD" ? "primary" : "default"}>
                                  {PAYMENT_LABEL[tx.paymentMethod] ?? tx.paymentMethod}
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right text-sm text-slate-600 hidden lg:table-cell">
                              {fmt(tx.subtotal)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-sm hidden lg:table-cell">
                              {(tx.discount || 0) > 0 ? (
                                <span className="text-amber-600">-{fmt(tx.discount || 0)}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right text-sm text-slate-600 hidden lg:table-cell">
                              {(tx.tax || 0) > 0 ? fmt(tx.tax) : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold whitespace-nowrap">
                              <span className={tx.status === "REFUND" ? "text-red-600" : "text-slate-900"}>
                                {tx.status === "REFUND" && "-"}{fmt(Math.abs(tx.total))}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex gap-1.5 justify-center">
                                <IconButton
                                  icon="eye"
                                  color="slate"
                                  size="sm"
                                  onClick={() => handleOpenDetails(tx)}
                                  title="Ver detalles"
                                />
                                {tx.status === "COMPLETED" && (
                                  <button
                                    onClick={() => { setShowRefundModal(tx); setRefundReason(""); }}
                                    title="Rembourser cette transaction"
                                    className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                )}
                              <IconButton
                                icon="delete"
                                color="red"
                                size="sm"
                                disabled={!!tx.cash_closing_id}
                                onClick={() => handleDeleteTransaction(tx.id)}
                                title={tx.cash_closing_id ? "No se puede eliminar: esta transacción está vinculada a un cierre de caja" : "Eliminar transacción"}
                                className={tx.cash_closing_id ? "opacity-50 cursor-not-allowed" : ""}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>

                  {/* Mobile: Card view */}
                  <div className="lg:hidden space-y-2 p-2">
                    {dayTxs.map((tx) => (
                        <div key={tx.id} className={`bg-white border rounded-lg p-3 space-y-2 ${tx.status === "REFUND" ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
                        {/* Time + Total */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500">
                              {tx.timestamp.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {tx.status === "REFUND" && (
                              <span className="text-xs font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">REMB.</span>
                            )}
                          </div>
                          <span className={`text-lg font-bold ${tx.status === "REFUND" ? "text-red-600" : "text-slate-900"}`}>
                            {tx.status === "REFUND" && "-"}{fmt(Math.abs(tx.total))}
                          </span>
                        </div>

                        {/* Products */}
                        {tx.items && tx.items.length > 0 ? (
                          <div className="text-xs space-y-1">
                            {tx.items.map((item: any, i: number) => (
                              <p key={i} className="text-slate-700">
                                <span className="font-medium">{item.quantity}×</span> {getProductName(item.productId, item.name)}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin productos</span>
                        )}

                        {/* Payment method + Cashier */}
                        <div className="flex justify-between items-center text-xs">
                          <Badge variant={tx.paymentMethod === "CASH" ? "success" : tx.paymentMethod === "CARD" ? "primary" : "default"}>
                            {PAYMENT_LABEL[tx.paymentMethod] ?? tx.paymentMethod}
                          </Badge>
                          {tx.cashierName && <span className="text-slate-600">{tx.cashierName}</span>}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleOpenDetails(tx)}
                            className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-medium text-slate-700 transition-colors"
                          >
                            <Eye size={14} />
                            Ver
                          </button>
                          {tx.status === "COMPLETED" && (
                            <button
                              onClick={() => { setShowRefundModal(tx); setRefundReason(""); }}
                              className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 bg-amber-50 hover:bg-amber-100 rounded text-xs font-medium text-amber-700 transition-colors"
                            >
                              <RotateCcw size={14} />
                              Rembourser
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            disabled={!!tx.cash_closing_id}
                            title={tx.cash_closing_id ? "No se puede eliminar: esta transacción está vinculada a un cierre de caja" : "Eliminar transacción"}
                            className={`flex-1 flex items-center justify-center gap-2 px-2 py-1.5 bg-red-50 hover:bg-red-100 rounded text-xs font-medium text-red-600 transition-colors ${tx.cash_closing_id ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="px-3 lg:px-4 py-2 border-t border-slate-100 text-sm text-slate-400 bg-slate-50">
              {totals.count} transacción{totals.count !== 1 ? "es" : ""}
              {(filters.search || filters.paymentMethod !== "ALL") &&
                ` · filtrado de ${transactions.length}`}
            </div>
          </div>
          )}
        </Card>

      </Section>

      {/* Detail / Edit Modal */}
      <Dialog
        isOpen={!!selectedTransaction}
        title="Detalles de la Transacción"
        onClose={() => setSelectedTransaction(null)}
        maxWidth="lg"
        footer={
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleSaveChanges}
              disabled={isSaving || !!selectedTransaction?.cash_closing_id}
              title={selectedTransaction?.cash_closing_id ? "No se puede guardar cambios en una transacción cerrada" : ""}
              className="whitespace-nowrap"
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        }
      >
        {selectedTransaction && (
              <>
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
              {selectedTransaction.cash_closing_id && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                  <p className="font-semibold mb-1">⚠ Esta transacción está vinculada a un cierre de caja</p>
                  <p className="text-xs">No se puede modificar ni eliminar una vez que ha sido cerrada.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Método de Pago</label>
                  <select
                    disabled={!!selectedTransaction.cash_closing_id}
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
                    disabled={!!selectedTransaction.cash_closing_id}
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
                      disabled={!!selectedTransaction.cash_closing_id}
                      type="number"
                      value={editForm.amount_received}
                      onChange={(e) => setEditForm({ ...editForm, amount_received: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-blue-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-green-700 mb-1">Cambio</label>
                    <input
                      disabled={!!selectedTransaction.cash_closing_id}
                      type="number"
                      value={editForm.change}
                      onChange={(e) => setEditForm({ ...editForm, change: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-green-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              )}
              </>
        )}
      </Dialog>

      {/* ── Refund Confirmation Modal ──────────────────────────────── */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-amber-50">
              <div className="p-2 rounded-lg bg-amber-100">
                <RotateCcw className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Confirmer le remboursement</h2>
                <p className="text-xs text-slate-500">{showRefundModal.id}</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-semibold mb-1">Cette action va :</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Marquer la transaction originale comme <strong>REMBOURSÉE</strong></li>
                  <li>Créer une transaction de remboursement de <strong className="text-red-600">-{fmt(showRefundModal.total)}</strong></li>
                  <li>Remettre le stock des articles en inventaire</li>
                  <li>Apparaître en déduction dans Rapports, Profits et Bilan</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Raison du remboursement <span className="font-normal text-slate-400">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white"
                  placeholder="Ex: produit défectueux, erreur de commande..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => { setShowRefundModal(null); setRefundReason(""); }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleRefund(showRefundModal)}
                  disabled={refundingId === showRefundModal.id}
                  className="flex-1"
                >
                  {refundingId === showRefundModal.id ? "En cours..." : `Rembourser ${fmt(showRefundModal.total)}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Container>
  );
}

