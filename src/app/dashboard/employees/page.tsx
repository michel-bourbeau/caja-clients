"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useTenantId } from "@/lib/utils/tenant";
import { DEFAULT_ROLES } from "@/lib/types/roles";
import { Button, Container, Section, Alert, Card } from "@/components/StripeUIComponents";
import { PageIcon, SearchInput } from "@/components";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role_id: string;
  salary: number;
  salary_type?: "hourly" | "monthly";
  status: "ACTIVE" | "INACTIVE";
  hire_date: string | null;
  is_system_user?: boolean;
  is_principal_admin?: boolean;
}

interface SalaryPayment {
  id: string;
  period_start: string;
  period_end: string;
  hours_worked: number;
  hourly_rate: number;
  amount: number;
  notes: string | null;
  paid_at: string;
}

interface PeriodInfo {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
  isCurrent: boolean;
}

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  roleId: "cashier",
  salary: "",
  salaryType: "hourly",
  hireDate: new Date().toISOString().split("T")[0],
  password: "",
  confirmPassword: "",
};

type ModalMode = "add" | "edit" | null;

export default function EmployeesPage() {
  const tenantId = useTenantId();
  const { fmt } = useCurrency();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Ficha (employee detail)
  const [fichaEmp, setFichaEmp] = useState<Employee | null>(null);
  const [fichaTab, setFichaTab] = useState<"payments" | "aguinaldo" | "vacaciones">("payments");
  const [fichaPayments, setFichaPayments] = useState<SalaryPayment[]>([]);
  const [fichaLoading, setFichaLoading] = useState(false);
  const [fichaPeriods, setFichaPeriods] = useState<PeriodInfo[]>([]);
  const [fichaPayingPeriod, setFichaPayingPeriod] = useState<{ period: PeriodInfo; hoursWorked: number; amount: number; notes: string } | null>(null);
  const [fichaPayingLoading, setFichaPayingLoading] = useState(false);
  const [fichaPaySaving, setFichaPaySaving] = useState(false);
  const [fichaPayDelConfirm, setFichaPayDelConfirm] = useState<string | null>(null);

  // Bonus (Aguinaldo) payment modal
  const [fichaAguinaldoData, setFichaAguinaldoData] = useState<any>(null);
  const [fichaAguinaldoHistory, setFichaAguinaldoHistory] = useState<any[]>([]);
  const [showBonusPayModal, setShowBonusPayModal] = useState(false);
  const [bonusPayForm, setBonusPayForm] = useState({ paidAmount: "", notes: "" });
  const [bonusPaySaving, setBonusPaySaving] = useState(false);

  // Vacation payment modal
  const [fichaVacationData, setFichaVacationData] = useState<any>(null);
  const [fichaVacationHistory, setFichaVacationHistory] = useState<any[]>([]);
  const [showVacationPayModal, setShowVacationPayModal] = useState(false);
  const [vacationPayForm, setVacationPayForm] = useState({ daysUsed: "", startDate: "", endDate: "", notes: "" });
  const [vacationPaySaving, setVacationPaySaving] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    fetch(`/api/tenants/${tenantId}/employees`)
      .then((r) => r.json())
      .then((data) => setEmployees(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const displayed = useMemo(() => {
    let list = employees;
    if (filterRole) list = list.filter((e) => e.role_id === filterRole);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.first_name.toLowerCase().includes(q) ||
          e.last_name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [employees, search, filterRole]);

  const flash = (msg: string, type: "success" | "error") => {
    if (type === "success") setSuccess(msg);
    else setError(msg);
    setTimeout(() => { setSuccess(null); setError(null); }, 4000);
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setModalMode("add");
    setShowPassword(false);
  };

  const openEdit = (emp: Employee) => {
    setForm({
      firstName: emp.first_name,
      lastName: emp.last_name,
      email: emp.email,
      phone: emp.phone ?? "",
      roleId: emp.role_id,
      salary: String(emp.salary),
      salaryType: emp.salary_type || "hourly",
      hireDate: emp.hire_date ?? new Date().toISOString().split("T")[0],
      password: "",
      confirmPassword: "",
    });
    setEditingId(emp.id);
    setModalMode("edit");
    setShowPassword(false);
  };

  const closeModal = () => { setModalMode(null); setEditingId(null); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    if (form.password && form.password !== form.confirmPassword) {
      flash("Les mots de passe ne correspondent pas", "error");
      return;
    }
    if (form.password && form.password.length < 6) {
      flash("Le mot de passe doit contenir au moins 6 caracteres", "error");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        roleId: form.roleId,
        salary: form.salary,
        salaryType: form.salaryType,
        hireDate: form.hireDate,
      };
      if (form.password) payload.password = form.password;

      let response: Response;
      if (modalMode === "add") {
        response = await fetch(`/api/tenants/${tenantId}/employees`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`/api/tenants/${tenantId}/employees/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur serveur");

      if (modalMode === "add") {
        setEmployees((prev) => [...prev, data]);
        flash("Employe cree avec succes", "success");
      } else {
        setEmployees((prev) => prev.map((emp) => (emp.id === editingId ? data : emp)));
        flash("Employe mis a jour", "success");
      }
      closeModal();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/employees/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur suppression");
      }
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      flash("Employe supprime", "success");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setSaving(false);
      setDeleteConfirmId(null);
    }
  };

  const openFicha = async (emp: Employee) => {
    setFichaEmp(emp);
    setFichaTab("payments");
    setFichaPayments([]);
    setFichaPeriods([]);
    setFichaPayingPeriod(null);
    setFichaPayDelConfirm(null);
    setFichaAguinaldoData(null);
    setFichaVacationData(null);
    if (!tenantId) return;
    setFichaLoading(true);
    try {
      const [paymentsRes, payrollRes] = await Promise.all([
        fetch(`/api/tenants/${tenantId}/employees/${emp.id}/payments`),
        fetch(`/api/tenants/${tenantId}/payroll`),
      ]);
      const payments = await paymentsRes.json();
      const payroll = await payrollRes.json();
      setFichaPayments(Array.isArray(payments) ? payments : []);
      setFichaPeriods(Array.isArray(payroll.periods) ? payroll.periods : []);
      // Preload bonus and vacation data
      await Promise.all([
        fetch(`/api/tenants/${tenantId}/employees/${emp.id}/bonus`).then(r => r.json()).then(data => {
          setFichaAguinaldoData(data);
          setFichaAguinaldoHistory(data.history || []);
        }).catch(() => {}),
        fetch(`/api/tenants/${tenantId}/employees/${emp.id}/vacation`).then(r => r.json()).then(data => {
          setFichaVacationData(data);
          setFichaVacationHistory(data.history || []);
        }).catch(() => {}),
      ]);
    } finally {
      setFichaLoading(false);
    }
  };

  // Fetch hours for a period and open the confirmation panel
  const startPayPeriod = async (period: PeriodInfo) => {
    if (!tenantId || !fichaEmp) return;
    setFichaPayingLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/payroll?from=${period.startDate}&to=${period.endDate}`);
      const data = await res.json();
      const emp = (data.summary ?? []).find((s: { employeeId: string; hoursWorked: number; salaryDue: number }) => s.employeeId === fichaEmp.id);
      const hoursWorked = emp?.hoursWorked ?? 0;
      const amount = emp?.salaryDue ?? 0;
      setFichaPayingPeriod({ period, hoursWorked, amount, notes: "" });
    } finally {
      setFichaPayingLoading(false);
    }
  };

  const confirmPay = async () => {
    if (!tenantId || !fichaEmp || !fichaPayingPeriod) return;
    setFichaPaySaving(true);
    try {
      const { period, hoursWorked, amount, notes } = fichaPayingPeriod;
      const res = await fetch(`/api/tenants/${tenantId}/employees/${fichaEmp.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: period.startDate,
          periodEnd: period.endDate,
          hoursWorked,
          hourlyRate: fichaEmp.salary,
          amount,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const newPay = await res.json();
      setFichaPayments((prev) => [newPay, ...prev]);
      setFichaPayingPeriod(null);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setFichaPaySaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!tenantId || !fichaEmp) return;
    await fetch(`/api/tenants/${tenantId}/employees/${fichaEmp.id}/payments/${paymentId}`, { method: "DELETE" });
    setFichaPayments((prev) => prev.filter((p) => p.id !== paymentId));
    setFichaPayDelConfirm(null);
  };

  // Load bonus (aguinaldo) data and history
  const loadAguinaldoData = async () => {
    if (!tenantId || !fichaEmp) return;
    try {
      const res = await fetch(`/api/tenants/${tenantId}/employees/${fichaEmp.id}/bonus`);
      const data = await res.json();
      setFichaAguinaldoData(data);
      setFichaAguinaldoHistory(data.history || []);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", "error");
    }
  };

  // Save bonus payment
  const saveBonusPayment = async () => {
    if (!tenantId || !fichaEmp || !fichaAguinaldoData) return;
    if (!bonusPayForm.paidAmount) {
      flash("Ingresa el monto pagado", "error");
      return;
    }
    setBonusPaySaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/employees/${fichaEmp.id}/bonus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleYear: fichaAguinaldoData.cycleYear,
          paidAmount: parseFloat(bonusPayForm.paidAmount),
          notes: bonusPayForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const newPayment = await res.json();
      setFichaAguinaldoHistory((prev) => [newPayment, ...prev]);
      setShowBonusPayModal(false);
      setBonusPayForm({ paidAmount: "", notes: "" });
      flash("Pago de aguinaldo registrado", "success");
      await loadAguinaldoData();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setBonusPaySaving(false);
    }
  };

  // Load vacation data and history
  const loadVacationData = async () => {
    if (!tenantId || !fichaEmp) return;
    try {
      const res = await fetch(`/api/tenants/${tenantId}/employees/${fichaEmp.id}/vacation`);
      const data = await res.json();
      setFichaVacationData(data);
      setFichaVacationHistory(data.history || []);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", "error");
    }
  };

  // Save vacation payment
  const saveVacationPayment = async () => {
    if (!tenantId || !fichaEmp) return;
    if (!vacationPayForm.daysUsed || !vacationPayForm.startDate || !vacationPayForm.endDate) {
      flash("Completa todos los campos requeridos", "error");
      return;
    }
    setVacationPaySaving(true);
    try {
      const daysUsed = parseFloat(vacationPayForm.daysUsed);
      if (!fichaVacationData || fichaVacationData.daysRemaining < daysUsed) {
        flash("Días de vacaciones insuficientes", "error");
        return;
      }
      const monetaryValue = daysUsed * fichaVacationData.dailyRate;
      const res = await fetch(`/api/tenants/${tenantId}/employees/${fichaEmp.id}/vacation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daysUsed,
          startDate: vacationPayForm.startDate,
          endDate: vacationPayForm.endDate,
          monetaryValue: Math.round(monetaryValue * 100) / 100,
          notes: vacationPayForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const newPayment = await res.json();
      setFichaVacationHistory((prev) => [newPayment, ...prev]);
      setShowVacationPayModal(false);
      setVacationPayForm({ daysUsed: "", startDate: "", endDate: "", notes: "" });
      flash("Período de vacaciones registrado", "success");
      await loadVacationData();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setVacationPaySaving(false);
    }
  };

  // ── Average hours per calendar month (from all recorded payments) ──────────
  const avgHoursPerMonth = (() => {
    if (fichaPayments.length === 0) return 0;
    // Sum hours per calendar month (keyed by "YYYY-MM" of period_start)
    const byMonth: Record<string, number> = {};
    fichaPayments.forEach((p) => {
      const key = p.period_start.substring(0, 7);
      byMonth[key] = (byMonth[key] || 0) + p.hours_worked;
    });
    const months = Object.values(byMonth);
    return months.reduce((s, h) => s + h, 0) / months.length;
  })();

  // ── Nicaragua: 13th month (aguinaldo) ──────────────────────────────────────
  // Method: average monthly hours × hourly rate = average monthly salary
  // Aguinaldo = average monthly salary × (months worked in cycle / 12)
  const aguinaldoData = (() => {
    if (!fichaEmp) return null;
    const today = new Date();
    const cycleStart = new Date(today.getFullYear() - 1, 11, 1); // Dec 1 prev year
    const cycleEnd   = new Date(today.getFullYear(), 10, 30);    // Nov 30 current year
    const hireDate   = fichaEmp.hire_date ? new Date(fichaEmp.hire_date) : null;
    const effectiveStart = hireDate && hireDate > cycleStart ? hireDate : cycleStart;

    const msPerMonth = (cycleEnd.getTime() - cycleStart.getTime()) / 12;
    const monthsWorked = Math.max(0,
      Math.min(12, (Math.min(today.getTime(), cycleEnd.getTime()) - effectiveStart.getTime()) / msPerMonth)
    );

    // Average monthly salary from payment history
    const avgMonthlySalary = Math.round(avgHoursPerMonth * fichaEmp.salary * 100) / 100;
    // Aguinaldo = 1 month of avg salary, pro-rated to months worked in cycle
    const aguinaldo = Math.round(avgMonthlySalary * (monthsWorked / 12) * 100) / 100;

    // Also show total paid in cycle for reference
    const cyclePayments = fichaPayments.filter((p) => {
      const d = new Date(p.paid_at);
      return d >= cycleStart && d <= cycleEnd;
    });
    const totalPaid = cyclePayments.reduce((s, p) => s + p.amount, 0);

    return { cycleStart, cycleEnd, monthsWorked, avgHoursPerMonth, avgMonthlySalary, aguinaldo, totalPaid };
  })();

  // ── Vacation accrual: 2.5 days/month from hire date ────────────────────────
  // Monetary value = accrued days × avg daily hours (avg_h/month ÷ 30) × hourly rate
  const vacationData = (() => {
    if (!fichaEmp?.hire_date) return null;
    const hire  = new Date(fichaEmp.hire_date);
    const today = new Date();
    const months = Math.max(0, (today.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    const daysAccrued = Math.floor(months * 2.5 * 100) / 100;
    const avgDailyHours = avgHoursPerMonth / 30;
    const monetaryValue = avgDailyHours > 0
      ? Math.round(daysAccrued * avgDailyHours * fichaEmp.salary * 100) / 100
      : 0;
    return { daysAccrued, months: Math.floor(months), avgHoursPerMonth, avgDailyHours, monetaryValue };
  })();

  const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-NI", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <Container>
      <Section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <PageIcon type="employees" size="lg" displayType="lucide" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Empleados</h1>
            <p className="text-sm text-slate-600 mt-1">Gestiona el personal, roles y accesos.</p>
          </div>
        </div>
        <Button variant="primary" onClick={openAdd}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Empleado
        </Button>
      </div>

      {success && <Alert variant="success" title="Éxito">{success}</Alert>}
      {error && <Alert variant="error" title="Error">{error}</Alert>}

      <Card>
        <div className="flex flex-col sm:flex-row gap-2 px-6 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={(value) => setSearch(value)}
              placeholder="Buscar empleado..."
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los roles</option>
            {DEFAULT_ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-40 mb-1" /><div className="h-3 bg-slate-100 rounded w-32" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-slate-200 rounded w-48" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><div className="h-5 bg-slate-200 rounded-full w-20" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-slate-200 rounded w-24 ml-auto" /></td>
                  <td className="px-4 py-3"><div className="h-5 bg-slate-200 rounded-full w-16" /></td>
                  <td className="px-4 py-3"><div className="h-6 bg-slate-200 rounded w-14 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : displayed.length === 0 ? (
          <p className="text-slate-500 text-center py-12 text-sm">
            {employees.length === 0 ? "No hay empleados registrados." : "Sin resultados."}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Desktop: Table view */}
            <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-800 text-white text-xs font-semibold uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left text-white">Empleado</th>
                  <th className="px-4 py-2.5 text-left hidden md:table-cell text-white">Email</th>
                  <th className="px-4 py-2.5 text-left hidden sm:table-cell text-white">Rol</th>
                  <th className="px-4 py-2.5 text-right hidden lg:table-cell text-white">Tarifa/h</th>
                  <th className="px-4 py-2.5 text-center text-white">Estado</th>
                  <th className="px-4 py-2.5 text-center w-24 text-white"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((emp) => {
                  const role = DEFAULT_ROLES.find((r) => r.id === emp.role_id);
                  return (
                    <tr key={emp.id} className="group hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{emp.first_name} {emp.last_name}</p>
                        {emp.phone && <p className="text-sm text-slate-500">{emp.phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{emp.email}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {emp.is_principal_admin || (emp.is_system_user && emp.role_id === "admin") ? (
                          <span className="inline-block px-2 py-0.5 text-sm rounded-full font-medium bg-amber-100 text-amber-700">
                            👑 Admin
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-sm rounded-full bg-blue-100 text-blue-700 font-medium">
                            {role?.name ?? emp.role_id}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700 hidden lg:table-cell">
                        {fmt(emp.salary)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 text-sm rounded-full font-semibold ${emp.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {emp.status === "ACTIVE" ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openFicha(emp)} title="Ficha" className="p-1.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button onClick={() => openEdit(emp)} title="Editar" className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => setDeleteConfirmId(emp.id)} title="Eliminar" className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>

            {/* Mobile: Card view */}
            <div className="sm:hidden space-y-3 px-2">
              {displayed.map((emp) => {
                const role = DEFAULT_ROLES.find((r) => r.id === emp.role_id);
                return (
                  <div key={emp.id} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                    {/* Row 1: Name + Status */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{emp.first_name} {emp.last_name}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0 ${
                        emp.status === "ACTIVE" 
                          ? "bg-green-100 text-green-700" 
                          : "bg-red-100 text-red-700"
                      }`}>
                        {emp.status === "ACTIVE" ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    {/* Row 2: Email */}
                    <div className="text-xs space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 flex-shrink-0 w-14">Email:</span>
                        <span className="text-slate-700 font-mono truncate flex-1">{emp.email}</span>
                      </div>
                    </div>

                    {/* Row 3: Role */}
                    <div className="text-xs space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 flex-shrink-0 w-14">Rol:</span>
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">
                          {role?.name ?? emp.role_id}
                        </span>
                      </div>
                    </div>

                    {/* Row 4: Phone + Salary */}
                    <div className="text-xs space-y-1 border-t border-slate-100 pt-2">
                      {emp.phone && (
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500 flex-shrink-0 w-14">Tel:</span>
                          <span className="text-slate-700">{emp.phone}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 flex-shrink-0 w-14">Tarifa:</span>
                        <span className="text-slate-900 font-semibold">{fmt(emp.salary)}</span>
                      </div>
                    </div>

                    {/* Row 5: Actions */}
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => openFicha(emp)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 rounded text-xs font-medium text-emerald-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Ficha
                      </button>
                      <button
                        onClick={() => openEdit(emp)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 rounded text-xs font-medium text-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(emp.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 hover:bg-red-100 rounded text-xs font-medium text-red-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && (
          <div className="px-4 py-2 border-t border-slate-100 text-sm text-slate-400 bg-slate-50">
            {displayed.length} empleado{displayed.length !== 1 ? "s" : ""}
          </div>
        )}
      </Card>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white rounded-t-xl">
              <h2 className="text-base font-semibold text-white">{modalMode === "add" ? "Nuevo Empleado" : "Editar Empleado"}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                  <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Apellido *</label>
                  <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (login) *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefono</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rol *</label>
                  <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {DEFAULT_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Salario *</label>
                  <select value={form.salaryType} onChange={(e) => setForm({ ...form, salaryType: e.target.value as "hourly" | "monthly" })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="hourly">Tarifa por hora</option>
                    <option value="monthly">Salario mensual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{form.salaryType === "monthly" ? "Salario mensual" : "Tarifa por hora"} *</label>
                <input type="number" min="0" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de contratacion *</label>
                <input type="date" value={form.hireDate} max={new Date().toISOString().split("T")[0]} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="border-t border-slate-200 pt-4">
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {modalMode === "add" ? (showPassword ? "Ocultar acceso" : "Definir acceso (login/contrasena)") : (showPassword ? "Ocultar" : "Cambiar contrasena")}
                </button>

                {showPassword && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contrasena {modalMode === "add" ? "" : "nueva"}</label>
                        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 caracteres" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar</label>
                        <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">L email sert de login. Le mot de passe cree un compte Supabase Auth pour cet employe.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
                <Button variant="primary" disabled={saving} onClick={handleSave}>
                  {saving ? "Guardando..." : modalMode === "add" ? "Crear Empleado" : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Eliminar empleado</h3>
                <p className="text-sm text-slate-500">Esta accion no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
              <Button variant="danger" disabled={saving} onClick={() => handleDelete(deleteConfirmId)}>
                {saving ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ficha Modal ──────────────────────────────────────────────────────── */}
      {fichaEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setFichaEmp(null)} />
          <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white rounded-t-xl shrink-0">
              <div>
                <h2 className="text-base font-semibold text-white">{fichaEmp.first_name} {fichaEmp.last_name}</h2>
                <p className="text-xs text-slate-300">
                  {fichaEmp.hire_date ? `Contratado el ${fmtDate(fichaEmp.hire_date)}` : "Sin fecha de contratacion"}
                  {" · "}{fmt(fichaEmp.salary)}/h
                </p>
              </div>
              <button onClick={() => setFichaEmp(null)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3 pb-0 bg-white border-b border-slate-200 shrink-0">
              {(["payments", "aguinaldo", "vacaciones"] as const).map((t) => (
                <button key={t} onClick={() => setFichaTab(t)}
                  className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                    fichaTab === t ? "bg-white border border-b-white border-slate-200 text-slate-900 -mb-px" : "text-slate-500 hover:text-slate-700"
                  }`}>
                  {t === "payments" ? "Historial de Pagos" : t === "aguinaldo" ? "13° Mes" : "Vacaciones"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">

              {/* ── Payments tab ── */}
              {fichaTab === "payments" && (
                <div className="space-y-3">

                  {/* Confirmation panel when paying a period */}
                  {fichaPayingPeriod && (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-bold text-white">Confirmar pago — {fichaPayingPeriod.period.label}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-blue-200 rounded-lg p-3 text-center">
                          <p className="text-xs text-slate-500 mb-0.5">Horas trabajadas</p>
                          <p className="text-2xl font-bold text-slate-900">{fichaPayingPeriod.hoursWorked}</p>
                        </div>
                        <div className="bg-white border border-blue-200 rounded-lg p-3 text-center">
                          <p className="text-xs text-slate-500 mb-0.5">Monto a pagar</p>
                          <p className="text-2xl font-bold text-blue-700">{fmt(fichaPayingPeriod.amount)}</p>
                          <p className="text-xs text-slate-400">{fichaPayingPeriod.hoursWorked}h × {fmt(fichaEmp!.salary)}/h</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Ajuster le monto (optionnel)</label>
                        <input type="number" min="0" step="0.01"
                          value={fichaPayingPeriod.amount}
                          onChange={(e) => setFichaPayingPeriod((p) => p ? { ...p, amount: parseFloat(e.target.value) || 0 } : p)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Notas (optionnel)</label>
                        <input type="text" value={fichaPayingPeriod.notes}
                          onChange={(e) => setFichaPayingPeriod((p) => p ? { ...p, notes: e.target.value } : p)}
                          placeholder="Bono, descuento..."
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={confirmPay} disabled={fichaPaySaving}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors">
                          {fichaPaySaving ? "Guardando..." : "✓ Confirmar Pago"}
                        </button>
                        <button onClick={() => setFichaPayingPeriod(null)}
                          className="px-4 py-2 text-sm text-slate-600 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Period list */}
                  {fichaLoading ? (
                    <p className="text-sm text-slate-400 text-center py-6">Cargando periodos...</p>
                  ) : fichaPeriods.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Sin periodos de pago configurados.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {fichaPeriods.map((period) => {
                        const paid = fichaPayments.find((p) => p.period_start === period.startDate);
                        const isConfirming = fichaPayingPeriod?.period.id === period.id;
                        return (
                          <div key={period.id}
                            className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                              isConfirming ? "border-blue-300 bg-blue-50" :
                              paid ? "border-emerald-200 bg-emerald-50" :
                              period.isCurrent ? "border-amber-200 bg-amber-50" :
                              "border-slate-200 bg-white"
                            }`}>
                            <div>
                              <p className={`text-sm font-semibold ${paid ? "text-emerald-800" : "text-slate-800"}`}>
                                {period.label}
                                {period.isCurrent && <span className="ml-2 text-xs font-normal text-amber-600">actual</span>}
                              </p>
                              {paid && (
                                <p className="text-xs text-emerald-600">
                                  {paid.hours_worked > 0 && `${paid.hours_worked}h · `}{fmt(paid.amount)}
                                  {paid.notes && ` · ${paid.notes}`}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              {paid ? (
                                <>
                                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Pagado</span>
                                  {fichaPayDelConfirm === paid.id ? (
                                    <span className="flex gap-1">
                                      <button onClick={() => handleDeletePayment(paid.id)} className="text-xs text-red-600 font-semibold hover:underline">Anular</button>
                                      <button onClick={() => setFichaPayDelConfirm(null)} className="text-xs text-slate-400 hover:underline">No</button>
                                    </span>
                                  ) : (
                                    <button onClick={() => setFichaPayDelConfirm(paid.id)} className="text-xs text-slate-300 hover:text-red-400 transition-colors" title="Anular pago">↩</button>
                                  )}
                                </>
                              ) : (
                                <button
                                  onClick={() => !fichaPayingLoading && startPayPeriod(period)}
                                  disabled={fichaPayingLoading && !isConfirming}
                                  className="text-xs font-bold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                                  {fichaPayingLoading && isConfirming ? "..." : "Pagar"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {fichaPayments.length > 0 && (
                    <p className="text-xs text-slate-400 text-right pt-1 border-t border-slate-100">
                      Total pagado: <span className="font-bold text-slate-700">{fmt(fichaPayments.reduce((s, p) => s + p.amount, 0))}</span>
                    </p>
                  )}
                </div>
              )}

              {/* ── Aguinaldo tab ── */}
              {fichaTab === "aguinaldo" && (
                <div className="space-y-4">
                  {!fichaEmp.hire_date ? (
                    <p className="text-sm text-amber-600">Agrega la fecha de contratacion para calcular el aguinaldo.</p>
                  ) : aguinaldoData && (
                    <>
                      {avgHoursPerMonth === 0 && (
                        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          Registra pagos con horas trabajadas para calcular el aguinaldo basado en el promedio mensual.
                        </p>
                      )}
                      
                      {/* Alert for approaching deadline */}
                      {fichaAguinaldoData && !fichaAguinaldoData.alreadyPaid && fichaAguinaldoData.cycleEnd && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                          <span className="text-lg">⏰</span>
                          <p className="text-sm text-red-700">
                            <span className="font-semibold">Pago vence el {fmtDate(new Date(new Date(fichaAguinaldoData.cycleEnd).getFullYear(), 11, 15).toISOString().split("T")[0])}</span>
                            {" · Aguinaldo acumulado: "}<span className="font-bold">{fmt(fichaAguinaldoData.calculatedBonus)}</span>
                          </p>
                        </div>
                      )}
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-xs text-white font-semibold uppercase tracking-wide mb-2">Ciclo actual</p>
                        <p className="text-sm text-slate-700">
                          {fmtDate(fichaAguinaldoData?.cycleStart)} – {fmtDate(fichaAguinaldoData?.cycleEnd)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {Math.floor(fichaAguinaldoData?.monthsWorkedInCycle || 0)} mes{Math.floor(fichaAguinaldoData?.monthsWorkedInCycle || 0) !== 1 ? "es" : ""} trabajados en este ciclo
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                          <p className="text-xs text-slate-500 mb-1">Salario mensual prom.</p>
                          <p className="text-2xl font-bold text-slate-900">{fmt(fichaAguinaldoData?.avgMonthlySalary || 0)}</p>
                          <p className="text-xs text-slate-400">Basado en ingresos reales</p>
                        </div>
                        <div className={`rounded-xl p-4 border ${fichaAguinaldoData?.alreadyPaid ? "bg-green-50 border-green-200" : "bg-emerald-50 border-emerald-200"}`}>
                          <p className={`text-xs ${fichaAguinaldoData?.alreadyPaid ? "text-green-700" : "text-emerald-700"} mb-1`}>Aguinaldo acumulado</p>
                          <p className={`text-2xl font-bold ${fichaAguinaldoData?.alreadyPaid ? "text-green-700" : "text-emerald-700"}`}>{fmt(fichaAguinaldoData?.calculatedBonus || 0)}</p>
                          <p className={`text-xs ${fichaAguinaldoData?.alreadyPaid ? "text-green-600" : "text-emerald-600"}`}>{Math.floor(aguinaldoData.monthsWorked)}/12 meses</p>
                        </div>
                      </div>
                      
                      {!fichaAguinaldoData?.alreadyPaid && (
                        <button onClick={() => setShowBonusPayModal(true)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition-colors">
                          💰 Registrar Pago de Aguinaldo
                        </button>
                      )}
                      
                      {fichaAguinaldoHistory.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 font-semibold uppercase mb-2">Historial de Pagos</p>
                          <div className="space-y-2">
                            {fichaAguinaldoHistory.map((payment) => (
                              <div key={payment.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">Ciclo {payment.cycle_year}</p>
                                  <p className="text-xs text-slate-500">
                                    Pagado el {payment.paid_at ? fmtDate(payment.paid_at.split("T")[0]) : "Pendiente"}
                                  </p>
                                </div>
                                <p className="text-sm font-bold text-slate-900">{fmt(payment.paid_amount || payment.calculated_amount)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs text-slate-400">
                        * Ley 185 Nicaragua: aguinaldo = 1 mes de salario ordinario por año trabajado.
                        Calculado como promedio de horas/mes × tarifa/h, pro-rateado a los meses trabajados en el ciclo Dic–Nov.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* ── Vacaciones tab ── */}
              {fichaTab === "vacaciones" && (
                <div className="space-y-4">
                  {!fichaEmp.hire_date ? (
                    <p className="text-sm text-amber-600">Agrega la fecha de contratacion para calcular las vacaciones.</p>
                  ) : vacationData && (
                    <>
                      {vacationData.avgHoursPerMonth === 0 && (
                        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          Registra pagos con horas trabajadas para calcular el valor monetario de las vacaciones.
                        </p>
                      )}
                      
                      {/* Alert if vacation is due */}
                      {fichaVacationData && fichaVacationData.daysRemaining > 0 && fichaVacationData.monthsSinceHire >= 6 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                          <span className="text-lg">🏖️</span>
                          <p className="text-sm text-amber-700">
                            <span className="font-semibold">El empleado tiene derecho a vacaciones</span> ({fichaVacationData.daysRemaining} días acumulados)
                          </p>
                        </div>
                      )}
                      
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">Desde contratacion</p>
                        <p className="text-sm text-slate-700">
                          {fmtDate(fichaEmp.hire_date!)} – hoy
                          {" · "}{Math.floor(fichaVacationData?.monthsSinceHire || 0)} mes{Math.floor(fichaVacationData?.monthsSinceHire || 0) !== 1 ? "es" : ""}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <p className="text-xs text-amber-700 mb-1">Días acumulados</p>
                          <p className="text-2xl font-bold text-amber-700">{fichaVacationData?.daysAccrued || 0}</p>
                          <p className="text-xs text-amber-600">2.5 días × {Math.floor(fichaVacationData?.monthsSinceHire || 0)} mes{Math.floor(fichaVacationData?.monthsSinceHire || 0) !== 1 ? "es" : ""}</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <p className="text-xs text-green-700 mb-1">Días disponibles</p>
                          <p className="text-2xl font-bold text-green-700">{fichaVacationData?.daysRemaining || 0}</p>
                        </div>
                      </div>
                      
                      {fichaVacationData && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <p className="text-xs text-slate-600 font-semibold">Días utilizados</p>
                            <p className="text-2xl font-bold text-slate-900">{fichaVacationData.daysUsed}</p>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                            <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Valor monetario</p>
                            <p className="text-xl font-bold text-emerald-700">{fmt(fichaVacationData.monetaryValue || 0)}</p>
                          </div>
                        </div>
                      )}
                      
                      {fichaVacationData && fichaVacationData.daysRemaining > 0 && (
                        <button onClick={() => setShowVacationPayModal(true)}
                          className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-lg transition-colors">
                          🏖️ Registrar Vacaciones
                        </button>
                      )}
                      
                      {fichaVacationHistory.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 font-semibold uppercase mb-2">Historial de Vacaciones</p>
                          <div className="space-y-2">
                            {fichaVacationHistory.map((vacation) => (
                              <div key={vacation.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-1">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {vacation.days_used} días ({fmtDate(vacation.start_date)} a {fmtDate(vacation.end_date)})
                                  </p>
                                  <p className="text-sm font-bold text-slate-900">{fmt(vacation.monetary_value)}</p>
                                </div>
                                {vacation.notes && <p className="text-xs text-slate-500">Notas: {vacation.notes}</p>}
                                <p className="text-xs text-slate-400">
                                  Registrado el {fmtDate(vacation.created_at.split("T")[0])}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs text-slate-400">
                        * Art. 76 Código Laboral Nicaragua: 15 días por cada 6 meses = 2.5 días/mes.
                        Valor monetario = días acumulados × horas promedio por día (promedio mensual ÷ 30) × tarifa/h.
                      </p>
                    </>
                  )}
                </div>
              )}

            </div>

            {/* ── Bonus Payment Modal ── */}
            {showBonusPayModal && fichaAguinaldoData && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Pagar Aguinaldo</h3>
                    <button onClick={() => setShowBonusPayModal(false)} className="text-slate-400 hover:text-slate-600">
                      ✕
                    </button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-white font-semibold mb-1">Monto a pagar</p>
                    <p className="text-2xl font-bold text-white">{fmt(fichaAguinaldoData.calculatedBonus)}</p>
                    <p className="text-xs text-white mt-1">Ciclo {fichaAguinaldoData.cycleYear}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monto pagado</label>
                    <input
                      type="number"
                      value={bonusPayForm.paidAmount}
                      onChange={(e) => setBonusPayForm((f) => ({ ...f, paidAmount: e.target.value }))}
                      placeholder={String(fichaAguinaldoData.calculatedBonus)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notas (opcional)</label>
                    <input
                      type="text"
                      value={bonusPayForm.notes}
                      onChange={(e) => setBonusPayForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Ej: Transferencia bancaria"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowBonusPayModal(false)}
                      className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveBonusPayment}
                      disabled={bonusPaySaving || !bonusPayForm.paidAmount}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-white font-semibold"
                    >
                      {bonusPaySaving ? "Guardando..." : "✓ Confirmar"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Vacation Payment Modal ── */}
            {showVacationPayModal && fichaVacationData && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Registrar Vacaciones</h3>
                    <button onClick={() => setShowVacationPayModal(false)} className="text-slate-400 hover:text-slate-600">
                      ✕
                    </button>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-600 font-semibold mb-1">Días disponibles</p>
                    <p className="text-2xl font-bold text-amber-900">{fichaVacationData.daysRemaining} días</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Días</label>
                      <input
                        type="number"
                        step="0.5"
                        value={vacationPayForm.daysUsed}
                        onChange={(e) => setVacationPayForm((f) => ({ ...f, daysUsed: e.target.value }))}
                        placeholder="0"
                        max={fichaVacationData.daysRemaining}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Desde</label>
                      <input
                        type="date"
                        value={vacationPayForm.startDate}
                        onChange={(e) => setVacationPayForm((f) => ({ ...f, startDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hasta</label>
                    <input
                      type="date"
                      value={vacationPayForm.endDate}
                      onChange={(e) => setVacationPayForm((f) => ({ ...f, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notas (opcional)</label>
                    <input
                      type="text"
                      value={vacationPayForm.notes}
                      onChange={(e) => setVacationPayForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Ej: Aprobado por gerente"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowVacationPayModal(false)}
                      className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveVacationPayment}
                      disabled={vacationPaySaving || !vacationPayForm.daysUsed || !vacationPayForm.startDate || !vacationPayForm.endDate}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg text-white font-semibold"
                    >
                      {vacationPaySaving ? "Guardando..." : "✓ Guardar"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </Section>
    </Container>
  );
}
