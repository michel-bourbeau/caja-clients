"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";
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

export default function TransactionsPage() {
  const tenantId = useTenantId();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    paymentMethod: "ALL",
    search: "",
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    paymentMethod: "CASH" as "CASH" | "CARD" | "TRANSFER",
    datetime: "",
  });
  const [isSaving, setIsSaving] = useState(false);

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

    if (filters.fromDate) {
      const [y, m, d] = filters.fromDate.split("-");
      const from = new Date(+y, +m - 1, +d, 0, 0, 0, 0);
      list = list.filter((tx) => tx.timestamp >= from);
    }
    if (filters.toDate) {
      const [y, m, d] = filters.toDate.split("-");
      const to = new Date(+y, +m - 1, +d, 23, 59, 59, 999);
      list = list.filter((tx) => tx.timestamp <= to);
    }
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
  }, [transactions, filters]);

  const groupedByDate = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    filteredTransactions.forEach((tx) => {
      const key = tx.timestamp.toISOString().split("T")[0];
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
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("es-ES", {
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
    setEditForm({
      paymentMethod: transaction.paymentMethod,
      datetime: transaction.timestamp.toISOString().slice(0, 16),
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transacciones</h1>
          <p className="text-sm text-slate-600 mt-1">
            {totals.count} transacción{totals.count !== 1 ? "es" : ""}
            {totals.count > 0 && <> · Total: <span className="font-semibold text-slate-800">{formatCurrency(totals.amount)}</span></>}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow transition-colors"
        >
          <svg className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 0120 15M19.418 15A8 8 0 014 9" />
          </svg>
          {isLoading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Table container */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Buscar por ID o producto..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Date from */}
          <input
            type="date"
            value={filters.fromDate}
            onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* Date to */}
          <input
            type="date"
            value={filters.toDate}
            onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* Payment method */}
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
                  <div className="flex justify-between items-center px-4 py-2 bg-slate-800 text-white text-sm font-semibold sticky top-0 z-10">
                    <span className="capitalize">{formatDateHeader(dateKey)}</span>
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-600 px-2 py-0.5 rounded-full">
                        {dayTxs.length} venta{dayTxs.length > 1 ? "s" : ""}
                      </span>
                      <span className="text-slate-300">{formatCurrency(dayTotal)}</span>
                    </div>
                  </div>

                  {/* Table for this day */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-2 text-left">Hora</th>
                        <th className="px-4 py-2 text-left">Productos</th>
                        <th className="px-4 py-2 text-center hidden sm:table-cell">Método</th>
                        <th className="px-4 py-2 text-right hidden md:table-cell">Subtotal</th>
                        <th className="px-4 py-2 text-right hidden md:table-cell">Desc.</th>
                        <th className="px-4 py-2 text-right hidden md:table-cell">Imp.</th>
                        <th className="px-4 py-2 text-right font-bold">Total</th>
                        <th className="px-4 py-2 text-center w-20">Acc.</th>
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
                                {tx.items.slice(0, 2).map((item: any, i: number) => (
                                  <p key={i} className="text-sm text-slate-700 truncate">
                                    <span className="font-medium">{item.quantity}×</span>{" "}
                                    {getProductName(item.productId, item.name)}
                                  </p>
                                ))}
                                {tx.items.length > 2 && (
                                  <p className="text-sm text-slate-400">+{tx.items.length - 2} más</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400 italic">Sin productos</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                            <span className={`inline-block px-2 py-0.5 text-sm rounded-full font-semibold ${PAYMENT_BADGE[tx.paymentMethod] ?? "bg-slate-100 text-slate-600"}`}>
                              {PAYMENT_LABEL[tx.paymentMethod] ?? tx.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm text-slate-600 hidden md:table-cell">
                            {formatCurrency(tx.subtotal)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm hidden md:table-cell">
                            {(tx.discount || 0) > 0 ? (
                              <span className="text-amber-600">-{formatCurrency(tx.discount || 0)}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm text-slate-600 hidden md:table-cell">
                            {(tx.tax || 0) > 0 ? formatCurrency(tx.tax) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                            {formatCurrency(tx.total)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => handleOpenDetails(tx)}
                                className="inline-flex items-center px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                                title="Ver / editar"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(tx.id)}
                                className="inline-flex items-center px-2.5 py-1 bg-red-100 hover:bg-red-600 hover:text-white text-red-600 text-sm font-semibold rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                              </button>
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
              {(filters.search || filters.fromDate || filters.toDate || filters.paymentMethod !== "ALL") &&
                ` · filtrado de ${transactions.length}`}
            </div>
          </div>
        )}
      </div>

      {/* Detail / Edit Modal */}
      {selectedTransaction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setSelectedTransaction(null)}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-900 text-white">
              <h2 className="font-semibold text-sm">Detalles de la Transacción</h2>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-1 rounded hover:bg-slate-700 transition-colors"
                aria-label="Cerrar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* ID */}
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-0.5">ID</p>
                <p className="font-mono text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 break-all">
                  {selectedTransaction.id}
                </p>
              </div>

              {/* Products */}
              {selectedTransaction.items && selectedTransaction.items.length > 0 && (
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">Productos</p>
                  <div className="bg-slate-50 rounded border border-slate-200 divide-y divide-slate-100">
                    {selectedTransaction.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-slate-900">{item.name || item.productId}</p>
                          <p className="text-sm text-slate-500">{item.quantity} × {formatCurrency(item.price)}</p>
                        </div>
                        <p className="font-semibold text-slate-900">{formatCurrency(item.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-slate-50 rounded border border-slate-200 divide-y divide-slate-100 text-sm">
                <div className="flex justify-between px-3 py-2 text-slate-600">
                  <span>Subtotal</span><span>{formatCurrency(selectedTransaction.subtotal)}</span>
                </div>
                {(selectedTransaction.discount || 0) > 0 && (
                  <div className="flex justify-between px-3 py-2 text-amber-600">
                    <span>Descuento</span><span>-{formatCurrency(selectedTransaction.discount || 0)}</span>
                  </div>
                )}
                {(selectedTransaction.tax || 0) > 0 && (
                  <div className="flex justify-between px-3 py-2 text-slate-600">
                    <span>Impuesto</span><span>{formatCurrency(selectedTransaction.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2 font-bold text-slate-900">
                  <span>Total</span><span>{formatCurrency(selectedTransaction.total)}</span>
                </div>
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
            </div>

            {/* Modal footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setSelectedTransaction(null)}
                disabled={isSaving}
                className="flex-1 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

