"use client";

import { useEffect, useState } from "react";
import { Card, Button, Input } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import { Transaction } from "@/lib/types";
import { useTenantId } from "@/lib/utils/tenant";
import { TransactionService } from "@/features/transactions/services";

export default function TransactionsPage() {
  const tenantId = useTenantId();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
    loadTransactions();
  }, [tenantId]);

  useEffect(() => {
    applyFilters();
  }, [transactions, filters]);

  const loadTransactions = async () => {
    if (!tenantId) {
      setError("Tenant ID not found");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await TransactionService.fetchTransactions(tenantId);
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
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
      await loadTransactions();
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
      await loadTransactions();
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
          <Button onClick={loadTransactions} disabled={isLoading}>
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
          <DataTable<Transaction>
            columns={[
              { key: "id", label: "ID Transacción" },
              {
                key: "timestamp",
                label: "Fecha/Hora",
                format: (value) => formatDateTime(value as Date),
              },
              {
                key: "subtotal",
                label: "Subtotal",
                format: (value) => formatCurrency(value),
              },
              {
                key: "tax",
                label: "Impuesto",
                format: (value) => formatCurrency(value),
              },
              {
                key: "total",
                label: "Total",
                format: (value) => formatCurrency(value),
              },
              { key: "paymentMethod", label: "Método de Pago" },
              { key: "status", label: "Estado" },
            ]}
            data={filteredTransactions}
            actions={(item) => (
              <>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => handleOpenDetails(item)}
                >
                  Ver Detalle
                </Button>
                <Button 
                  size="sm" 
                  variant="danger"
                  onClick={() => handleDeleteTransaction(item.id)}
                >
                  Revertir
                </Button>
              </>
            )}
          />
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
              <p className="text-sm font-semibold text-slate-600">Impuesto:</p>
              <p className="text-gray-900">{formatCurrency(selectedTransaction.tax)}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-600">Total:</p>
              <p className="text-gray-900">{formatCurrency(selectedTransaction.total)}</p>
            </div>

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
