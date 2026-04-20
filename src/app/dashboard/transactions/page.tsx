"use client";

import { useEffect, useState } from "react";
import { Card, Button, Input } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import { Transaction, Product } from "@/lib/types";
import { useTenantId } from "@/lib/utils/tenant";
import { TransactionService } from "@/features/transactions/services";

export default function TransactionsPage() {
  const tenantId = useTenantId();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    paymentMethod: "ALL",
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

  useEffect(() => {
    applyFilters();
  }, [transactions, filters]);

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
        fetch(`/api/tenants/${tenantId}/products`).then(res => res.json()),
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
    const product = products.find(p => p.id === productId);
    return product?.name || productId;
  };

  const groupTransactionsByDate = (transactions: Transaction[]): Record<string, Transaction[]> => {
    const grouped: Record<string, Transaction[]> = {};
    transactions.forEach((tx) => {
      // Get date only (YYYY-MM-DD format)
      const dateKey = tx.timestamp.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(tx);
    });
    // Sort dates in descending order (newest first)
    const sorted: Record<string, Transaction[]> = {};
    Object.keys(grouped).sort().reverse().forEach(key => {
      sorted[key] = grouped[key];
    });
    return sorted;
  };

  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTimeOnly = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (filters.fromDate) {
      // Parse date string in format "YYYY-MM-DD" and create local date at midnight
      const [year, month, day] = filters.fromDate.split("-");
      const fromDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0);
      filtered = filtered.filter((tx) => tx.timestamp >= fromDate);
    }

    if (filters.toDate) {
      // Parse date string in format "YYYY-MM-DD" and create local date at 23:59:59.999
      const [year, month, day] = filters.toDate.split("-");
      const toDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59, 999);
      filtered = filtered.filter((tx) => tx.timestamp <= toDate);
    }

    if (filters.paymentMethod !== "ALL") {
      filtered = filtered.filter(
        (tx) => tx.paymentMethod === filters.paymentMethod
      );
    }

    setFilteredTransactions(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!tenantId) return;
    
    const confirmDelete = window.confirm(
      "¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer."
    );
    
    if (!confirmDelete) return;

    try {
      setError(null);
      await TransactionService.deleteTransaction(tenantId, transactionId);
      // Reload transactions after deletion
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

  const handleCloseDetails = () => {
    setSelectedTransaction(null);
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

      // Reload transactions
      await loadData();
      handleCloseDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Transacciones</h1>

      {error && (
        <Card className="mb-6 p-4 bg-red-50 border border-red-200">
          <p className="text-red-800">Error: {error}</p>
        </Card>
      )}

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Input
            type="date"
            placeholder="Desde"
            value={filters.fromDate}
            onChange={(e) => handleFilterChange("fromDate", e.target.value)}
          />
          <Input
            type="date"
            placeholder="Hasta"
            value={filters.toDate}
            onChange={(e) => handleFilterChange("toDate", e.target.value)}
          />
          <select
            className="px-3 py-2 border border-slate-300 rounded text-slate-900"
            value={filters.paymentMethod}
            onChange={(e) => handleFilterChange("paymentMethod", e.target.value)}
          >
            <option value="ALL">Todos los métodos</option>
            <option value="CASH">EFECTIVO</option>
            <option value="CARD">TARJETA</option>
            <option value="TRANSFER">TRANSFERENCIA</option>
          </select>
          <Button onClick={loadData} disabled={isLoading}>
            {isLoading ? "Cargando..." : "Actualizar"}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-center py-8 text-slate-500">Cargando transacciones...</p>
        ) : filteredTransactions.length === 0 ? (
          <p className="text-center py-8 text-slate-500">
            No hay transacciones disponibles
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupTransactionsByDate(filteredTransactions)).map(([dateKey, dayTransactions]) => (
              <div key={dateKey}>
                {/* Date Header */}
                <div className="sticky top-0 bg-gradient-to-r from-slate-600 to-slate-700 text-white px-4 py-3 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold capitalize">
                      📅 {formatDateHeader(dateKey)}
                    </h3>
                    <span className="text-sm bg-slate-500 px-3 py-1 rounded">
                      {dayTransactions.length} venta{dayTransactions.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Transactions for this day */}
                <div className="space-y-2 bg-slate-50 px-4 py-3 rounded-b-lg border border-slate-200 border-t-0">
                  {dayTransactions.map((transaction) => (
                    <div key={transaction.id} className="border border-slate-300 rounded overflow-hidden hover:border-slate-400 transition-colors bg-white flex flex-col">
                      {/* HEADER - Hora y método de pago */}
                      <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-700">
                          🕐 {getTimeOnly(transaction.timestamp)}
                        </span>
                        <span className="text-xs font-medium text-slate-600">{transaction.paymentMethod} • {formatCurrency(transaction.total)}</span>
                      </div>

                      {/* MIDDLE - Productos Vendidos */}
                      <div className="px-3 py-2 flex-1">
                        {transaction.items && transaction.items.length > 0 ? (
                          <div className="space-y-1">
                            {transaction.items.map((item: any, index: number) => (
                              <div key={index} className="flex justify-between items-center text-xs">
                                <span className="text-slate-900 font-medium flex-1 truncate">
                                  {getProductName(item.productId, item.name)}
                                </span>
                                <span className="text-slate-600 mx-2">
                                  {item.quantity}×{formatCurrency(item.price)}
                                </span>
                                <span className="font-semibold text-slate-900 text-right min-w-fit">
                                  {formatCurrency(item.total)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">Sin productos</p>
                        )}
                      </div>

                      {/* FOOTER - Resumen y botones */}
                      <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 space-y-2">
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold">Sub: {formatCurrency(transaction.subtotal)}</span>
                          {(transaction.discount || 0) > 0 && <span className="ml-3">Desc: {formatCurrency(transaction.discount || 0)}</span>}
                          {(transaction.tax || 0) > 0 && <span className="ml-3">Imp: {formatCurrency(transaction.tax)}</span>}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleOpenDetails(transaction)}
                            className="text-xs py-1 px-3 flex-1"
                          >
                            Detalles
                          </Button>
                          <Button 
                            size="sm" 
                            variant="danger"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="text-xs py-1 px-3 flex-1"
                          >
                            Revertir
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal de detalles */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md p-6 bg-white">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Detalles de la Transacción</h2>
            
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-600">ID Transacción:</p>
              <p className="text-gray-900">{selectedTransaction.id}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-600">Subtotal:</p>
              <p className="text-gray-900">{formatCurrency(selectedTransaction.subtotal)}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-600">Descuento:</p>
              <p className="text-gray-900">{formatCurrency(selectedTransaction.discount || 0)}</p>
            </div>

            {(selectedTransaction.tax || 0) > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-600">Impuesto:</p>
                <p className="text-gray-900">{formatCurrency(selectedTransaction.tax)}</p>
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-600">Total:</p>
              <p className="text-gray-900">{formatCurrency(selectedTransaction.total)}</p>
            </div>

            {/* Products Section */}
            {selectedTransaction.items && selectedTransaction.items.length > 0 && (
              <div className="mb-6 p-3 bg-slate-50 rounded border border-slate-200">
                <p className="text-sm font-semibold text-slate-700 mb-3">Productos Vendidos:</p>
                <div className="space-y-2">
                  {selectedTransaction.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-start text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{item.name || item.productId}</p>
                        <p className="text-slate-600 text-xs">
                          {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900">{formatCurrency(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="text-sm font-semibold text-slate-600">Método de Pago:</label>
              <select
                value={editForm.paymentMethod}
                onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value as "CASH" | "CARD" | "TRANSFER" })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded text-slate-900"
              >
                <option value="CASH">EFECTIVO</option>
                <option value="CARD">TARJETA</option>
                <option value="TRANSFER">TRANSFERENCIA</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="text-sm font-semibold text-slate-600">Fecha/Hora:</label>
              <input
                type="datetime-local"
                value={editForm.datetime}
                onChange={(e) => setEditForm({ ...editForm, datetime: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded text-slate-900"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleCloseDetails}
                disabled={isSaving}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
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
    </div>
  );
}
