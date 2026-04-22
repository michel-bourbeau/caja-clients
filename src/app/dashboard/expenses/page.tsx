"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { Expense, Supplier, ExpenseCategory } from "@/lib/types";

export default function ExpensesPage() {
  const { user, hasPermission } = useAuth();
  const tenantId = useTenantId();
  const { fmt } = useCurrency();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form states
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);

  const [formData, setFormData] = useState({
    supplier_id: "",
    amount: 0,
    description: "",
    category: "",
    expense_date: new Date().toISOString().split("T")[0],
    is_recurring: false,
    recurring_frequency: "" as "weekly" | "biweekly" | "monthly" | "",
    recurring_day_of_month: new Date().getDate(),
    notes: "",
  });

  const [supplierForm, setSupplierForm] = useState({
    name: "",
    description: "",
    contact: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
  });

  const [filters, setFilters] = useState({
    category: "ALL",
    supplier_id: "ALL",
  });

  const [viewMode, setViewMode] = useState<"week" | "month" | "year">("month");

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
      const [expensesRes, suppliersRes, categoriesRes] = await Promise.all([
        fetch(`/api/tenants/${tenantId}/expenses`, { headers }),
        fetch(`/api/tenants/${tenantId}/suppliers`),
        fetch(`/api/tenants/${tenantId}/expense-categories`),
      ]);

      if (!expensesRes.ok || !suppliersRes.ok || !categoriesRes.ok) throw new Error("Failed to load data");

      const expensesData = await expensesRes.json();
      const suppliersData = await suppliersRes.json();
      const categoriesData = await categoriesRes.json();

      setExpenses(
        expensesData.map((e: any) => ({
          ...e,
          expense_date: new Date(e.expense_date),
          created_at: new Date(e.created_at),
          updated_at: new Date(e.updated_at),
        }))
      );
      setSuppliers(suppliersData);
      setCategories(categoriesData);
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
          recurring_frequency: formData.is_recurring ? formData.recurring_frequency : null,
          recurring_day_of_month: formData.is_recurring && formData.recurring_frequency === "monthly"
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
      recurring_frequency: expense.recurring_frequency || ("" as "weekly" | "biweekly" | "monthly" | ""),
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
      recurring_frequency: "",
      recurring_day_of_month: new Date().getDate(),
      notes: "",
    });
    setEditingExpense(null);
  };

  // Handle manage categories
  const handleSaveCategory = async () => {
    if (!tenantId || !categoryForm.name.trim()) {
      setError("El nombre de la categoría es requerido");
      return;
    }

    try {
      setError(null);
      const method = editingCategory ? "PUT" : "POST";
      const url = editingCategory
        ? `/api/tenants/${tenantId}/expense-categories/${editingCategory.id}`
        : `/api/tenants/${tenantId}/expense-categories`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          description: categoryForm.description || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to save category");

      setMessage(editingCategory ? "Categoría actualizada" : "Categoría creada");
      setShowCategoryForm(false);
      setEditingCategory(null);
      setCategoryForm({ name: "", description: "" });
      await loadData();

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving category");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm("¿Eliminar esta categoría?")) return;

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/expense-categories/${categoryId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete");

      setMessage("Categoría eliminada");
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting category");
    }
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, description: category.description || "" });
    setShowCategoryForm(true);
  };

  // Filtering
  // Helper functions for grouping by period
  const getWeekKey = (date: Date | string) => {
    const d = new Date(date);
    const weekStart = new Date(d.setDate(d.getDate() - d.getDay()));
    return weekStart.toISOString().split("T")[0];
  };

  const getMonthKey = (date: Date | string) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const getYearKey = (date: Date | string) => {
    const d = new Date(date);
    return d.getFullYear().toString();
  };

  const getPeriodLabel = (key: string, mode: "week" | "month" | "year") => {
    if (mode === "week") {
      const date = new Date(key);
      const weekEnd = new Date(date.getTime() + 6 * 24 * 60 * 60 * 1000);
      return `Semana ${date.toLocaleDateString("es-NI", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("es-NI", { month: "short", day: "numeric" })}`;
    } else if (mode === "month") {
      const [year, month] = key.split("-");
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("es-NI", {
        year: "numeric",
        month: "long",
      });
    } else {
      return key;
    }
  };

  const filteredExpenses = useMemo(() => {
    let list = [...expenses];

    if (!canViewAll) {
      list = list.filter((e) => e.created_by === user?.id);
    }

    if (filters.category !== "ALL") {
      list = list.filter((e) => e.category === filters.category);
    }

    if (filters.supplier_id !== "ALL") {
      list = list.filter((e) => e.supplier_id === filters.supplier_id);
    }

    // Group by period
    const grouped: Record<string, Expense[]> = {};
    list.forEach((exp) => {
      let key: string;
      if (viewMode === "week") {
        key = getWeekKey(exp.expense_date);
      } else if (viewMode === "month") {
        key = getMonthKey(exp.expense_date);
      } else {
        key = getYearKey(exp.expense_date);
      }
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(exp);
    });

    // Sort groups and expenses within groups
    const sorted = Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, exps]) => ({
        key,
        label: getPeriodLabel(key, viewMode),
        expenses: exps.sort(
          (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
        ),
        total: exps.reduce((sum, e) => sum + e.amount, 0),
      }));

    return sorted;
  }, [expenses, filters, canViewAll, user?.id, viewMode]);

  const totals = useMemo(() => {
    const allExpenses = filteredExpenses.flatMap((group) => group.expenses);
    return {
      count: allExpenses.length,
      amount: allExpenses.reduce((sum, e) => sum + e.amount, 0),
    };
  }, [filteredExpenses]);

  // Extract category names from loaded categories for filter display
  const categoryOptions = useMemo(
    () => categories.map((c) => c.name),
    [categories]
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
          <p className="text-sm text-gray-700 mt-1">
            {totals.count} gasto{totals.count !== 1 ? "s" : ""} · Total:{" "}
            <span className="font-semibold">{fmt(totals.amount)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {canManageSuppliers && (
            <>
              <button
                onClick={() => setShowSupplierForm(true)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                + Proveedor
              </button>
              <button
                onClick={() => {
                  setCategoryForm({ name: "", description: "" });
                  setEditingCategory(null);
                  setShowCategoryForm(true);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                ⚙️ Categorías
              </button>
            </>
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

      {/* View Mode Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("week")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            viewMode === "week"
              ? "bg-blue-600 text-white"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          Por Semana
        </button>
        <button
          onClick={() => setViewMode("month")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            viewMode === "month"
              ? "bg-blue-600 text-white"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          Por Mes
        </button>
        <button
          onClick={() => setViewMode("year")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            viewMode === "year"
              ? "bg-blue-600 text-white"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          Por Año
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-gray-900"
            >
              <option value="ALL">Todas</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Proveedor
            </label>
            <select
              value={filters.supplier_id}
              onChange={(e) =>
                setFilters({ ...filters, supplier_id: e.target.value })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-gray-900"
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
          <p className="text-center py-12 text-gray-700">Cargando gastos...</p>
        ) : filteredExpenses.length === 0 ? (
          <p className="text-center py-12 text-gray-700">No hay gastos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Fecha
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Descripción
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 hidden md:table-cell">
                    Proveedor
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 hidden sm:table-cell">
                    Categoría
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Monto
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700 w-20">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((group) => (
                  <React.Fragment key={group.key}>
                    {/* Period header row */}
                    <tr className="bg-slate-100">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-800">{group.label}</span>
                          <span className="text-gray-800 font-semibold">{fmt(group.total)}</span>
                        </div>
                      </td>
                    </tr>
                    {/* Expenses in this period */}
                    {group.expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                          {new Date(expense.expense_date).toLocaleDateString("es-NI")}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {expense.description}
                          {expense.is_recurring && (
                            <span className="ml-2 inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              Recurrente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-700 hidden md:table-cell">
                          {expense.supplier?.name || "—"}
                        </td>
                        <td className="px-4 py-2 text-gray-700 hidden sm:table-cell">
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
                  </React.Fragment>
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
            <h2 className="text-xl font-bold text-gray-900">
              {editingExpense ? "Editar Gasto" : "Registrar Gasto"}
            </h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Proveedor
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">Monto *</label>
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Categoría
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
                >
                  <option value="">Selecciona categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryForm({ name: "", description: "" });
                    setEditingCategory(null);
                    setShowCategoryForm(true);
                  }}
                  className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  title="Gestionar categorías"
                >
                  ⚙️
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={formData.expense_date}
                onChange={(e) =>
                  setFormData({ ...formData, expense_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Frecuencia de Recurrencia
              </label>
              <select
                value={formData.recurring_frequency}
                onChange={(e) => {
                  const frequency = e.target.value as "weekly" | "biweekly" | "monthly" | "";
                  setFormData({
                    ...formData,
                    recurring_frequency: frequency,
                    is_recurring: frequency !== "",
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
              >
                <option value="">No recurrente</option>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Cada dos semanas</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>

            {formData.recurring_frequency === "monthly" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Día del mes para repetir
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
                />
              </div>
            )}

            {editingExpense?.is_recurring && (
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    is_recurring: false,
                    recurring_frequency: "",
                    recurring_day_of_month: new Date().getDate(),
                  })
                }
                className="w-full px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold rounded-lg transition-colors"
              >
                Detener Recurrencia
              </button>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Notas</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  setShowExpenseForm(false);
                  resetExpenseForm();
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-gray-700 font-semibold hover:bg-slate-50"
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
            <h2 className="text-xl font-bold text-gray-900">Crear Proveedor</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Contacto
              </label>
              <input
                type="text"
                value={supplierForm.contact}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, contact: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  setShowSupplierForm(false);
                  setSupplierForm({ name: "", description: "", contact: "" });
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-gray-700 font-semibold hover:bg-slate-50"
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

      {/* Category Management Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900">
              {editingCategory ? "Editar Categoría" : "Crear Categoría"}
            </h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  setShowCategoryForm(false);
                  setEditingCategory(null);
                  setCategoryForm({ name: "", description: "" });
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-gray-700 font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCategory}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
              >
                {editingCategory ? "Actualizar" : "Crear"}
              </button>
            </div>

            {/* Categories List */}
            {!editingCategory && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Categorías Existentes</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {categories.length === 0 ? (
                    <p className="text-gray-700">No hay categorías creadas</p>
                  ) : (
                    categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{cat.name}</p>
                          {cat.description && (
                            <p className="text-sm text-gray-700">{cat.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditCategory(cat)}
                            className="px-2 py-1 bg-blue-100 hover:bg-blue-600 text-blue-600 hover:text-white text-xs rounded transition-colors"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="px-2 py-1 bg-red-100 hover:bg-red-600 text-red-600 hover:text-white text-xs rounded transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
