"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useLanguage } from "@/context/LanguageContext";
import { toNicaraguaDateString } from "@/lib/utils/formatters";
import { Expense, Supplier, ExpenseCategory, FixedExpense } from "@/lib/types";
import { Dialog, DialogFooter, FlashMessage, useFlash, EmptyState, DeleteConfirmDialog } from "@/components";

export default function ExpensesPage() {
  const { user, hasPermission } = useAuth();
  const tenantId = useTenantId();
  const { fmt } = useCurrency();
  const { t } = useLanguage();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { flash, showFlash, clearFlash } = useFlash();
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [deletingFixedId, setDeletingFixedId] = useState<string | null>(null);

  // Fixed expenses panel state
  const [showFixedPanel, setShowFixedPanel] = useState(false);
  const [showFixedForm, setShowFixedForm] = useState(false);
  const [editingFixed, setEditingFixed] = useState<FixedExpense | null>(null);
  const [applyingFixed, setApplyingFixed] = useState(false);
  const [fixedForm, setFixedForm] = useState({
    name: "",
    amount: 0,
    category: "",
    supplier_id: "",
    day_of_month: 1,
    notes: "",
  });

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
    expense_date: toNicaraguaDateString(new Date()),
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
  const [currentDate, setCurrentDate] = useState(new Date());

  const canViewAll = hasPermission("expenses.view_all");
  const canCreate = hasPermission("expenses.create");
  const canEdit = hasPermission("expenses.edit");
  const canManageSuppliers = hasPermission("expenses.manage_suppliers");

  // Navigation functions
  const goToPreviousPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNextPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Load data
  const loadData = useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);

      const headers = { "x-user-id": user?.id || "" };
      const [expensesRes, suppliersRes, categoriesRes, fixedRes] = await Promise.all([
        fetch(`/api/tenants/${tenantId}/expenses`, { headers }),
        fetch(`/api/tenants/${tenantId}/suppliers`),
        fetch(`/api/tenants/${tenantId}/expense-categories`),
        fetch(`/api/tenants/${tenantId}/fixed-expenses`, { headers }),
      ]);

      if (!expensesRes.ok || !suppliersRes.ok || !categoriesRes.ok) throw new Error("Failed to load data");

      const expensesData = await expensesRes.json();
      const suppliersData = await suppliersRes.json();
      const categoriesData = await categoriesRes.json();
      const fixedData = fixedRes.ok ? await fixedRes.json() : [];

      setExpenses(
        expensesData.map((e: any) => ({
          ...e,
          expense_date: new Date(typeof e.expense_date === 'string' && e.expense_date.length === 10 ? e.expense_date + 'T12:00:00' : e.expense_date),
          created_at: new Date(e.created_at),
          updated_at: new Date(e.updated_at),
        }))
      );
      setSuppliers(suppliersData);
      setCategories(categoriesData);
      setFixedExpenses(fixedData);
    } catch (err) {
      showFlash("error", err instanceof Error ? err.message : "Error loading data");
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fetch salary payments for the current period
  const loadSalaryPayments = useCallback(async () => {
    if (!tenantId) return;
    try {
      const periodStart = new Date(currentDate);
      const periodEnd   = new Date(currentDate);

      if (viewMode === "week") {
        const day = periodStart.getDay();
        periodStart.setDate(periodStart.getDate() - day);
        periodEnd.setDate(periodStart.getDate() + 6);
      } else if (viewMode === "month") {
        periodStart.setDate(1);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(0);
      } else {
        periodStart.setMonth(0); periodStart.setDate(1);
        periodEnd.setMonth(11); periodEnd.setDate(31);
      }

      const paidFrom = toNicaraguaDateString(periodStart);
      const paidTo   = toNicaraguaDateString(periodEnd);

      const res = await fetch(
        `/api/tenants/${tenantId}/payroll/payments?paidFrom=${paidFrom}&paidTo=${paidTo}`
      );
      if (res.ok) {
        const data = await res.json();
        setSalaryPayments(Array.isArray(data) ? data : []);
      }
    } catch {
      // Non-blocking: salary data is complementary
    }
  }, [tenantId, currentDate, viewMode]);

  useEffect(() => {
    loadSalaryPayments();
  }, [loadSalaryPayments]);

  // Auto-apply active fixed expenses silently whenever the viewed month changes
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const activeFixedCount = fixedExpenses.filter((f) => f.is_active).length;

  useEffect(() => {
    if (!tenantId || viewMode !== "month" || activeFixedCount === 0) return;

    const autoApply = async () => {
      try {
        const res = await fetch(`/api/tenants/${tenantId}/fixed-expenses/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": user?.id || "" },
          body: JSON.stringify({ year: currentYear, month: currentMonth }),
        });
        if (!res.ok) return;
        const result = await res.json();
        if (result.created > 0) {
          // New fixed expense entries were created — refresh the expense list silently
          const expRes = await fetch(`/api/tenants/${tenantId}/expenses`, {
            headers: { "x-user-id": user?.id || "" },
          });
          if (expRes.ok) {
            const data = await expRes.json();
            setExpenses(
              data.map((e: any) => ({
                ...e,
                expense_date: new Date(typeof e.expense_date === 'string' && e.expense_date.length === 10 ? e.expense_date + 'T12:00:00' : e.expense_date),
                created_at: new Date(e.created_at),
                updated_at: new Date(e.updated_at),
              }))
            );
          }
        }
      } catch {
        // Silent failure — never disrupt the user
      }
    };

    autoApply();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, viewMode, currentYear, currentMonth, activeFixedCount, user?.id]);

  // Handle create/edit expense
  const handleSaveExpense = async () => {
    if (!tenantId || formData.amount <= 0) {
      showFlash("error", t("expenses.flashAmountMin"));
      return;
    }

    try {
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = errorData.error || `Failed to save expense (${response.status})`;
        console.error("API Error:", errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const result = await response.json();


      showFlash("success", editingExpense ? t("expenses.flashExpenseUpdated") : t("expenses.flashExpenseSaved"));
      setShowExpenseForm(false);
      setEditingExpense(null);
      resetExpenseForm();
      await loadData();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error saving expense";
      console.error("Exception in handleSaveExpense:", errorMsg);
      showFlash("error", errorMsg);
    }
  };

  const handleCreateSupplier = async () => {
    if (!tenantId || !supplierForm.name.trim()) {
      showFlash("error", t("expenses.flashSupplierRequired"));
      return;
    }

    try {
      const response = await fetch(`/api/tenants/${tenantId}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierForm),
      });

      if (!response.ok) throw new Error("Failed to create supplier");

      showFlash("success", t("expenses.flashSupplierCreated"));
      setShowSupplierForm(false);
      setSupplierForm({ name: "", description: "", contact: "" });
      await loadData();
    } catch (err) {
      showFlash("error", err instanceof Error ? err.message : "Error creating supplier");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    setDeletingExpenseId(expenseId);
  };

  const executeDeleteExpense = async () => {
    if (!deletingExpenseId) return;
    const expenseId = deletingExpenseId;
    setDeletingExpenseId(null);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/expenses/${expenseId}`,
        {
          method: "DELETE",
          headers: { "x-user-id": user?.id || "" },
        }
      );

      if (!response.ok) throw new Error("Failed to delete");

      showFlash("success", t("expenses.flashExpenseDeleted"));
      await loadData();
    } catch (err) {
      showFlash("error", err instanceof Error ? err.message : "Error deleting expense");
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

  // ── Fixed Expenses CRUD ──────────────────────────────────────────────────

  const resetFixedForm = () => {
    setFixedForm({ name: "", amount: 0, category: "", supplier_id: "", day_of_month: 1, notes: "" });
    setEditingFixed(null);
  };

  const handleSaveFixed = async () => {
    if (!tenantId || !fixedForm.name.trim()) {
      showFlash("error", t("expenses.flashFixedNameRequired"));
      return;
    }
    if (fixedForm.amount <= 0) {
      showFlash("error", t("expenses.flashFixedAmountMin"));
      return;
    }
    try {
      const method = editingFixed ? "PUT" : "POST";
      const url = editingFixed
        ? `/api/tenants/${tenantId}/fixed-expenses/${editingFixed.id}`
        : `/api/tenants/${tenantId}/fixed-expenses`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-user-id": user?.id || "" },
        body: JSON.stringify({
          name: fixedForm.name.trim(),
          amount: parseFloat(fixedForm.amount.toString()),
          category: fixedForm.category || null,
          supplier_id: fixedForm.supplier_id || null,
          day_of_month: parseInt(fixedForm.day_of_month.toString()),
          notes: fixedForm.notes || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to save");
      }

      showFlash("success", editingFixed ? t("expenses.flashFixedUpdated") : t("expenses.flashFixedCreated"));
      setShowFixedForm(false);
      resetFixedForm();
      await loadData();
    } catch (err) {
      showFlash("error", err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const handleEditFixed = (fe: FixedExpense) => {
    setEditingFixed(fe);
    setFixedForm({
      name: fe.name,
      amount: fe.amount,
      category: fe.category || "",
      supplier_id: fe.supplier_id || "",
      day_of_month: fe.day_of_month,
      notes: fe.notes || "",
    });
    setShowFixedForm(true);
  };

  const executeDeleteFixed = async () => {
    if (!deletingFixedId) return;
    const id = deletingFixedId;
    setDeletingFixedId(null);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/fixed-expenses/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": user?.id || "" },
      });
      if (!response.ok) throw new Error("Failed to delete");
      showFlash("success", t("expenses.flashFixedDeleted"));
      await loadData();
    } catch (err) {
      showFlash("error", err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const handleApplyFixed = async () => {
    if (!tenantId) return;
    setApplyingFixed(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/fixed-expenses/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user?.id || "" },
        body: JSON.stringify({ year: currentDate.getFullYear(), month: currentDate.getMonth() + 1 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to apply");
      if (result.created > 0) {
        showFlash("success", t("expenses.flashFixedGenerated", { count: result.created, skipped: result.skipped }));
      } else {
        showFlash("info" as any, result.message || t("expenses.flashFixedAllApplied"));
      }
      await loadData();
    } catch (err) {
      showFlash("error", err instanceof Error ? err.message : "Error al aplicar");
    } finally {
      setApplyingFixed(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  const resetExpenseForm = () => {    setFormData({
      supplier_id: "",
      amount: 0,
      description: "",
      category: "",
      expense_date: toNicaraguaDateString(new Date()),
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
      showFlash("error", "El nombre de la categoría es requerido");
      return;
    }

    try {
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

      showFlash("success", editingCategory ? t("expenses.flashCatUpdated") : t("expenses.flashCatCreated"));
      setShowCategoryForm(false);
      setEditingCategory(null);
      setCategoryForm({ name: "", description: "" });
      await loadData();
    } catch (err) {
      showFlash("error", err instanceof Error ? err.message : "Error saving category");
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    setDeletingCategoryId(categoryId);
  };

  const executeDeleteCategory = async () => {
    if (!deletingCategoryId) return;
    const categoryId = deletingCategoryId;
    setDeletingCategoryId(null);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/expense-categories/${categoryId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete");

      showFlash("success", "Categoría eliminada");
      await loadData();
    } catch (err) {
      showFlash("error", err instanceof Error ? err.message : "Error deleting category");
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
      return `${t("expenses.periodWeekGroup")} ${date.toLocaleDateString("es-NI", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("es-NI", { month: "short", day: "numeric" })}`;
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

    // NOTE: server-side API already filters by created_by when user doesn't have view_all.
    // No client-side ownership filter needed — avoids false-negatives when roleId is a UUID.

    if (filters.category !== "ALL") {
      list = list.filter((e) => e.category === filters.category);
    }

    if (filters.supplier_id !== "ALL") {
      list = list.filter((e) => e.supplier_id === filters.supplier_id);
    }

    // Filter by current period
    const periodStart = new Date(currentDate);
    const periodEnd = new Date(currentDate);

    if (viewMode === "week") {
      // Get start of week (Sunday)
      const day = periodStart.getDay();
      periodStart.setDate(periodStart.getDate() - day);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setDate(periodStart.getDate() + 6);
      periodEnd.setHours(23, 59, 59, 999);
    } else if (viewMode === "month") {
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0);
      periodEnd.setHours(23, 59, 59, 999);
    } else {
      // Year
      periodStart.setMonth(0);
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setMonth(11);
      periodEnd.setDate(31);
      periodEnd.setHours(23, 59, 59, 999);
    }

    list = list.filter((e) => {
      const expenseDate = new Date(e.expense_date);
      return expenseDate >= periodStart && expenseDate <= periodEnd;
    });

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
  }, [expenses, filters, canViewAll, user?.id, viewMode, currentDate, t]);

  const totals = useMemo(() => {
    const allExpenses = filteredExpenses.flatMap((group) => group.expenses);
    const expensesAmount = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const salariesAmount = salaryPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    return {
      count: allExpenses.length,
      amount: expensesAmount,
      salaries: salariesAmount,
      grand: expensesAmount + salariesAmount,
    };
  }, [filteredExpenses, salaryPayments]);

  // Extract category names from loaded categories for filter display
  const categoryOptions = useMemo(
    () => categories.map((c) => c.name),
    [categories]
  );

  if (!canCreate) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t("expenses.accessDenied")}</h1>
        <p className="text-gray-600 mt-2">
          {t("expenses.noPermission")}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("expenses.title")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageSuppliers && (
            <>
              <button
                onClick={() => setShowSupplierForm(true)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {t("expenses.btnSupplier")}
              </button>
              <button
                onClick={() => {
                  setCategoryForm({ name: "", description: "" });
                  setEditingCategory(null);
                  setShowCategoryForm(true);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {t("expenses.btnCategories")}
              </button>
            </>
          )}
          {canCreate && (
            <button
              onClick={() => setShowFixedPanel(true)}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {t("expenses.btnFixed")}
            </button>
          )}
          <button
            onClick={() => {
              resetExpenseForm();
              setShowExpenseForm(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {t("expenses.btnAdd")}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{t("expenses.expenseWord")}s</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{totals.count}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{t("expenses.subtitleExpenses")}</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{fmt(totals.amount)}</p>
        </div>
        {totals.salaries > 0 && (
          <>
            <div className="bg-white rounded-lg border border-purple-200 px-4 py-3">
              <p className="text-xs text-purple-500 font-medium uppercase tracking-wide">{t("expenses.subtitleSalaries")}</p>
              <p className="text-xl font-bold text-purple-700 mt-0.5">{fmt(totals.salaries)}</p>
            </div>
            <div className="bg-white rounded-lg border border-red-200 px-4 py-3">
              <p className="text-xs text-red-500 font-medium uppercase tracking-wide">{t("expenses.subtitleTotal")}</p>
              <p className="text-xl font-bold text-red-700 mt-0.5">{fmt(totals.grand)}</p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <FlashMessage flash={flash} onDismiss={clearFlash} />

      {/* View Mode Selector with Navigation */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2">
        {/* View mode group */}
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setViewMode("week")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              viewMode === "week"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t("expenses.viewWeek")}
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              viewMode === "month"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t("expenses.viewMonth")}
          </button>
          <button
            onClick={() => setViewMode("year")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              viewMode === "year"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t("expenses.viewYear")}
          </button>
        </div>

        {/* Separator */}
        <div className="hidden sm:block w-px h-6 bg-slate-200 shrink-0" />

        {/* Period navigation group */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            onClick={goToPreviousPeriod}
            className="px-3 py-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold"
          >
            {t("expenses.navPrev")}
          </button>

          <span className="text-sm font-semibold text-gray-700 min-w-[120px] text-center">
            {viewMode === "week"
              ? `${t("expenses.periodWeekOf")} ${new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay()).toLocaleDateString("es-ES")}`
              : viewMode === "month"
              ? currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
              : `${t("expenses.periodYear")} ${currentDate.getFullYear()}`}
          </span>

          <button
            onClick={goToNextPeriod}
            className="px-3 py-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold"
          >
            {t("expenses.navNext")}
          </button>

          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold"
          >
            {t("expenses.navToday")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t("expenses.filterCategory")}
            </label>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-gray-900"
            >
              <option value="ALL">{t("expenses.filterAll")}</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t("expenses.filterSupplier")}
            </label>
            <select
              value={filters.supplier_id}
              onChange={(e) =>
                setFilters({ ...filters, supplier_id: e.target.value })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-gray-900"
            >
              <option value="ALL">{t("expenses.filterAllSuppliers")}</option>
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
          <EmptyState state="loading" message={t("expenses.loading")} />
        ) : filteredExpenses.length === 0 ? (
          <EmptyState state="empty" message={t("expenses.empty")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    {t("expenses.colDate")}
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    {t("expenses.colDesc")}
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 hidden md:table-cell">
                    {t("expenses.colSupplier")}
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 hidden sm:table-cell">
                    {t("expenses.colCategory")}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    {t("expenses.colAmount")}
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700 w-20">
                    {t("expenses.colActions")}
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
                              {t("expenses.badgeRecurring")}
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
      <Dialog
        isOpen={showExpenseForm}
        title={editingExpense ? t("expenses.formEditTitle") : t("expenses.formAddTitle")}
        onClose={() => {
          setShowExpenseForm(false);
          setEditingExpense(null);
          resetExpenseForm();
        }}
        maxWidth="md"
        footer={
          <DialogFooter
            onSave={handleSaveExpense}
            saveLabel={t("expenses.saveBtn")}
          />
        }
      >
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t("expenses.labelSupplier")}
          </label>
          <select
            value={formData.supplier_id}
            onChange={(e) =>
              setFormData({ ...formData, supplier_id: e.target.value })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
          >
            <option value="">{t("expenses.noSupplier")}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{t("expenses.labelAmount")}</label>
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
                {t("expenses.labelDesc")}
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
                {t("expenses.labelCategory")}
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
                >
                  <option value="">{t("expenses.selectCategory")}</option>
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("expenses.labelDate")}</label>
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
                {t("expenses.labelFrequency")}
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
                <option value="">{t("expenses.freqNone")}</option>
                <option value="weekly">{t("expenses.freqWeekly")}</option>
                <option value="biweekly">{t("expenses.freqBiweekly")}</option>
                <option value="monthly">{t("expenses.freqMonthly")}</option>
              </select>
            </div>

            {formData.recurring_frequency === "monthly" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t("expenses.labelRepeatDay")}
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
                {t("expenses.stopRecurring")}
              </button>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("expenses.labelNotes")}</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
                rows={2}
              />
            </div>
      </Dialog>

      {/* Supplier Form Modal */}
      <Dialog
        isOpen={showSupplierForm}
        title={t("expenses.supplierFormTitle")}
        onClose={() => {
          setShowSupplierForm(false);
          setSupplierForm({ name: "", description: "", contact: "" });
        }}
        maxWidth="md"
        footer={
          <DialogFooter
            onSave={handleCreateSupplier}
            saveLabel={t("expenses.createBtn")}
          />
        }
      >
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t("expenses.labelName")}
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
            {t("expenses.labelDescription")}
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
            {t("expenses.labelContact")}
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
      </Dialog>

      {/* Category Management Modal */}
      <Dialog
        isOpen={showCategoryForm}
        title={editingCategory ? t("expenses.catFormEditTitle") : t("expenses.catFormAddTitle")}
        onClose={() => {
          setShowCategoryForm(false);
          setEditingCategory(null);
          setCategoryForm({ name: "", description: "" });
        }}
        maxWidth="md"
        footer={
          <DialogFooter
            onSave={handleSaveCategory}
            saveLabel={editingCategory ? t("expenses.updateBtn") : t("expenses.createBtn")}
          />
        }
      >
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t("expenses.labelName")}
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
            {t("expenses.labelDescription")}
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

        {/* Categories List */}
        {!editingCategory && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("expenses.catListTitle")}</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-gray-700">{t("expenses.catEmpty")}</p>
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
      </Dialog>

      {/* Delete Expense Confirmation */}
      <DeleteConfirmDialog
        isOpen={!!deletingExpenseId}
        message={t("expenses.deleteExpenseMsg")}
        onConfirm={executeDeleteExpense}
        onCancel={() => setDeletingExpenseId(null)}
      />

      {/* Delete Category Confirmation */}
      <DeleteConfirmDialog
        isOpen={!!deletingCategoryId}
        message={t("expenses.deleteCatMsg")}
        onConfirm={executeDeleteCategory}
        onCancel={() => setDeletingCategoryId(null)}
      />

      {/* ── Fixed Expenses Panel ─────────────────────────────────────── */}
      <Dialog
        isOpen={showFixedPanel}
        title={t("expenses.fixedTitle")}
        onClose={() => setShowFixedPanel(false)}
        maxWidth="lg"
        scrollable
        footer={
          <div className="flex justify-end items-center w-full">
            <button
              onClick={() => {
                resetFixedForm();
                setShowFixedForm(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {t("expenses.fixedAddBtn")}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-500 mb-4">
          {t("expenses.fixedDesc")}
        </p>

        {fixedExpenses.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <p className="text-4xl mb-2">📋</p>
            <p className="text-sm">{t("expenses.fixedEmpty")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fixedExpenses.map((fe) => (
              <div
                key={fe.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  fe.is_active ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-60"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 truncate">{fe.name}</span>
                    {!fe.is_active && (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded-full">{t("expenses.fixedInactive")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{fmt(fe.amount)}</span>
                    {fe.category && <span>· {fe.category}</span>}
                    {fe.supplier?.name && <span>· {fe.supplier.name}</span>}
                    <span>· {t("expenses.fixedDayLabel", { day: fe.day_of_month })}</span>
                  </div>
                </div>
                <div className="flex gap-1 ml-3 shrink-0">
                  <button
                    onClick={() => handleEditFixed(fe)}
                    className="px-2 py-1 bg-blue-100 hover:bg-blue-600 text-blue-600 hover:text-white text-xs rounded transition-colors"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => setDeletingFixedId(fe.id)}
                    className="px-2 py-1 bg-red-100 hover:bg-red-600 text-red-600 hover:text-white text-xs rounded transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Dialog>

      {/* Fixed Expense Add/Edit Form */}
      <Dialog
        isOpen={showFixedForm}
        title={editingFixed ? t("expenses.fixedFormEditTitle") : t("expenses.fixedFormAddTitle")}
        onClose={() => {
          setShowFixedForm(false);
          resetFixedForm();
        }}
        maxWidth="md"
        footer={
          <DialogFooter onSave={handleSaveFixed} saveLabel={editingFixed ? t("expenses.updateBtn") : t("expenses.createBtn")} />
        }
      >
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{t("expenses.labelName")}</label>
          <input
            type="text"
            value={fixedForm.name}
            onChange={(e) => setFixedForm({ ...fixedForm, name: e.target.value })}
            placeholder={t("expenses.fixedNamePlaceholder")}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{t("expenses.labelAmount")}</label>
          <input
            type="number"
            step="0.01"
            value={fixedForm.amount}
            onChange={(e) => setFixedForm({ ...fixedForm, amount: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{t("expenses.labelCategory")}</label>
          <select
            value={fixedForm.category}
            onChange={(e) => setFixedForm({ ...fixedForm, category: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
          >
            <option value="">{t("expenses.noCategory")}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{t("expenses.labelSupplier")}</label>
          <select
            value={fixedForm.supplier_id}
            onChange={(e) => setFixedForm({ ...fixedForm, supplier_id: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
          >
            <option value="">{t("expenses.noSupplier")}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t("expenses.fixedLabelMonthDay")}
          </label>
          <input
            type="number"
            min="1"
            max="28"
            value={fixedForm.day_of_month}
            onChange={(e) =>
              setFixedForm({ ...fixedForm, day_of_month: parseInt(e.target.value) || 1 })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
          />
          <p className="text-xs text-slate-400 mt-1">
            {t("expenses.fixedMonthDayHelp")}
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{t("expenses.labelNotes")}</label>
          <textarea
            value={fixedForm.notes}
            onChange={(e) => setFixedForm({ ...fixedForm, notes: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900"
            rows={2}
          />
        </div>

        {editingFixed && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="fixed-active"
              checked={fixedExpenses.find((f) => f.id === editingFixed.id)?.is_active ?? true}
              onChange={async (e) => {
                try {
                  await fetch(`/api/tenants/${tenantId}/fixed-expenses/${editingFixed.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ is_active: e.target.checked }),
                  });
                  await loadData();
                } catch {}
              }}
              className="rounded"
            />
            <label htmlFor="fixed-active" className="text-sm text-gray-700">{t("expenses.fixedActiveLabel")}</label>
          </div>
        )}
      </Dialog>

      {/* Delete Fixed Expense Confirmation */}
      <DeleteConfirmDialog
        isOpen={!!deletingFixedId}
        message={t("expenses.deleteFixedMsg")}
        onConfirm={executeDeleteFixed}
        onCancel={() => setDeletingFixedId(null)}
      />
    </div>
  );
}
