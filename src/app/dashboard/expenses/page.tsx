"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { Expense, Supplier } from "@/lib/types";

export default function ExpensesPage() {
  const { user, hasPermission } = useAuth();
  const tenantId = useTenantId();
  const { fmt } = useCurrency();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form states
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [formData, setFormData] = useState({
    supplier_id: "",
    amount: 0,
    description: "",
    category: "",
    expense_date: new Date().toISOString().split("T")[0],
    is_recurring: false,
    recurring_day_of_month: new Date().getDate(),
    notes: "",
  });

  const [supplierForm, setSupplierForm] = useState({
    name: "",
    description: "",
    contact: "",
  });

  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    category: "ALL",
    supplier_id: "ALL",
  });

  const canViewAll = hasPermission("expenses.view_all");
  const canCreate = hasPermission("expenses.create");
  const canEdit = hasPermission("expenses.edit");
  const canManageSuppliers = hasPermission("expenses.manage_suppliers");

  // Load data
  const loadData = useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      setError(null);

      const headers = { "x-user-id": user?.id || "" };
      const [expensesRes, suppliersRes] = await Promise.all([
        fetch(`/api/tenants/${tenantId}/expenses`, { headers }),
        fetch(`/api/tenants/${tenantId}/suppliers`),
      ]);

      if (!expensesRes.ok || !suppliersRes.ok) throw new Error("Failed to load data");

      const expensesData = await expensesRes.json();
      const suppliersData = await suppliersRes.json();

      setExpenses(
        expensesData.map((e: any) => ({
          ...e,
          expense_date: new Date(e.expense_date),
          created_at: new Date(e.created_at),
          updated_at: new Date(e.updated_at),
        }))
      );
      setSuppliers(suppliersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data");
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle create/edit expense
  const handleSaveExpense = async () => {
    if (!tenantId || formData.amount <= 0) {
      setError("Monto debe ser mayor a 0");
      return;
    }

    try {
      setError(null);
      const headers = {
        "Content-Type": "application/json",
        "x-user-id": user?.id || "",
      };

      const method = editingExpense ? "PUT" : "POST";
      const url = editingExpense
        ? `/api/tenants/${tenantId}/expenses/${editingExpense.id}`
        : `/api/tenants/${tenantId}/expenses`;

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          supplier_id: formData.supplier_id || null,
          amount: parseFloat(formData.amount.toString()),
          description: formData.description,
          category: formData.category,
          expense_date: formData.expense_date,
          is_recurring: formData.is_recurring,
          recurring_day_of_month: formData.is_recurring
            ? formData.recurring_day_of_month
            : null,
          notes: formData.notes,
        }),
      });

      if (!response.ok) throw new Error("Failed to save expense");

      setMessage(editingExpense ? "Gasto actualizado" : "Gasto registrado");
      setShowExpenseForm(false);
      setEditingExpense(null);
      resetExpenseForm();
      await loadData();

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving expense");
    }
  };

  const handleCreateSupplier = async () => {
    if (!tenantId || !supplierForm.name.trim()) {
      setError("Nombre del proveedor es requerido");
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/tenants/${tenantId}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierForm),
      });

      if (!response.ok) throw new Error("Failed to create supplier");

      setMessage("Proveedor creado");
      setShowSupplierForm(false);
      setSupplierForm({ name: "", description: "", contact: "" });
      await loadData();

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating supplier");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm("¿Eliminar este gasto?")) return;

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/expenses/${expenseId}`,
        {
          method: "DELETE",
          headers: { "x-user-id": user?.id || "" },
        }
      );

      if (!response.ok) throw new Error("Failed to delete");

      setMessage("Gasto eliminado");
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting expense");
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      supplier_id: expense.supplier_id || "",
      amount: expense.amount,
      description: expense.description || "",
      category: expense.category || "",
      expense_date: expense.expense_date instanceof Date
        ? expense.expense_date.toISOString().split("T")[0]
        : expense.expense_date,
      is_recurring: expense.is_recurring,
      recurring_day_of_month: expense.recurring_day_of_month || new Date().getDate(),
      notes: expense.notes || "",
    });
    setShowExpenseForm(true);
  };

  const resetExpenseForm = () => {
    setFormData({
      supplier_id: "",
      amount: 0,
      description: "",
      category: "",
      expense_date: new Date().toISOString().split("T")[0],
      is_recurring: false,
      recurring_day_of_month: new Date().getDate(),
      notes: "",
    });
    setEditingExpense(null);
  };

  // Filtering
  const filteredExpenses = useMemo(() => {
    let list = [...expenses];

    if (!canViewAll) {
      list = list.filter((e) => e.created_by === user?.id);
    }

    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      list = list.filter((e) => new Date(e.expense_date) >= fromDate);
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59);
      list = list.filter((e) => new Date(e.expense_date) <= toDate);
    }

    if (filters.category !== "ALL") {
      list = list.filter((e) => e.category === filters.category);
    }

    if (filters.supplier_id !== "ALL") {
      list = list.filter((e) => e.supplier_id === filters.supplier_id);
    }

    return list.sort(
      (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    );
  }, [expenses, filters, canViewAll, user?.id]);

  const totals = useMemo(
    () => ({
      count: filteredExpenses.length,
      amount: filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    }),
    [filteredExpenses]
  );

  const categories = useMemo(
    () => [...new Set(expenses.map((e) => e.category).filter(Boolean))],
    [expenses]
  );

  if (!canCreate) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Acceso Denegado</h1>
        <p className="text-gray-600 mt-2">
          No tienes permiso para acceder a este módulo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gastos</h1>
          <p className="text-sm text-slate-600 mt-1">
            {totals.count} gasto{totals.count !== 1 ? "s" : ""} · Total:{" "}
            <span className="font-semibold">{fmt(totals.amount)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {canManageSuppliers && (
            <button
              onClick={() => setShowSupplierForm(true)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              + Proveedor
            </button>
          )}
          <button
            onClick={() => {
              resetExpenseForm();
              setShowExpenseForm(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            + Gasto
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) =>
                setFilters({ ...filters, fromDate: e.target.value })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Categoría
            </label>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            >
              <option value="ALL">Todas</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Proveedor
            </label>
            <select
              value={filters.supplier_id}
              onChange={(e) =>
                setFilters({ ...filters, supplier_id: e.target.value })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            >
              <option value="ALL">Todos</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {isLoading ? (
          <p className="text-center py-12 text-slate-500">Cargando gastos...</p>
        ) : filteredExpenses.length === 0 ? (
          <p className="text-center py-12 text-slate-400">No hay gastos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">
                    Fecha
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">
                    Descripción
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600 hidden md:table-cell">
                    Proveedor
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600 hidden sm:table-cell">
                    Categoría
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">
                    Monto
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-slate-600 w-20">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700 whitespace-nowrap">
                      {new Date(expense.expense_date).toLocaleDateString("es-NI")}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {expense.description}
                      {expense.is_recurring && (
                        <span className="ml-2 inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Recurrente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-700 hidden md:table-cell">
                      {expense.supplier?.name || "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-700 hidden sm:table-cell">
                      {expense.category || "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-900">
                      {fmt(expense.amount)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex gap-1 justify-center">
                        {(canEdit || expense.created_by === user?.id) && (
                          <button
                            onClick={() => handleEditExpense(expense)}
                            className="px-2 py-1 bg-blue-100 hover:bg-blue-600 text-blue-600 hover:text-white text-xs rounded transition-colors"
                          >
                            ✎
                          </button>
                        )}
                        {(canEdit || expense.created_by === user?.id) && (
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="px-2 py-1 bg-red-100 hover:bg-red-600 text-red-600 hover:text-white text-xs rounded transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold">
              {editingExpense ? "Editar Gasto" : "Registrar Gasto"}
            </h2>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Proveedor
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Monto *</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Categoría
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Selecciona categoría</option>
                <option value="Servicios">Servicios</option>
                <option value="Suministros">Suministros</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Fecha</label>
              <input
                type="date"
                value={formData.expense_date}
                onChange={(e) =>
                  setFormData({ ...formData, expense_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_recurring}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_recurring: e.target.checked,
                  })
                }
                className="rounded"
              />
              <label className="text-sm font-semibold">Gasto Recurrente</label>
            </div>

            {formData.is_recurring && (
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Día del mes
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.recurring_day_of_month}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurring_day_of_month: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-1">Notas</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  setShowExpenseForm(false);
                  resetExpenseForm();
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveExpense}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold">Crear Proveedor</h2>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={supplierForm.description}
                onChange={(e) =>
                  setSupplierForm({
                    ...supplierForm,
                    description: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Contacto
              </label>
              <input
                type="text"
                value={supplierForm.contact}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, contact: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  setShowSupplierForm(false);
                  setSupplierForm({ name: "", description: "", contact: "" });
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSupplier}
                className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
