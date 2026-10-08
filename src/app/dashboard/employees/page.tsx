"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useTenantId } from "@/lib/utils/tenant";
import { useLanguage } from "@/context/LanguageContext";
import { toNicaraguaDateString } from "@/lib/utils/formatters";
import { DEFAULT_ROLES } from "@/lib/types/roles";
import { Button, Container, Section, Card } from "@/components/StripeUIComponents";
import { PageIcon, SearchInput, DashboardHeader, Dialog, DialogFooter, FlashMessage, useFlash } from "@/components";
import { PeriodInfo } from "@/lib/types";

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

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  roleId: "cashier",
  salary: "",
  salaryType: "hourly",
  hireDate: toNicaraguaDateString(new Date()),
  password: "",
  confirmPassword: "",
};

type ModalMode = "add" | "edit" | null;

export default function EmployeesPage() {
  const tenantId = useTenantId();
  const { fmt } = useCurrency();
  const { t } = useLanguage();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tenantRoles, setTenantRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { flash: flashState, showFlash, clearFlash } = useFlash();

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingIsSystemUser, setEditingIsSystemUser] = useState(false);
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
    
    // Load employees and tenant roles in parallel
    Promise.all([
      fetch(`/api/tenants/${tenantId}/employees`).then((r) => r.json()),
      fetch(`/api/tenants/${tenantId}/roles`).then((r) => r.json()),
    ])
      .then(([employees, roles]) => {
        setEmployees(Array.isArray(employees) ? employees : []);
        // Use tenant roles (already includes system roles)
        // If API returns empty, fallback to DEFAULT_ROLES
        const roleList = Array.isArray(roles) && roles.length > 0 ? roles : DEFAULT_ROLES;
        setTenantRoles(roleList);
      })
      .catch((e) => showFlash("error", e.message))
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
    showFlash(type, msg);
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setEditingIsSystemUser(false);
    setModalMode("add");
    setShowPassword(false);
  };

  const openEdit = (emp: Employee) => {
    // Resolve role_id to UUID: employees may store a slug ("cashier") or a UUID
    const matchedRole = tenantRoles.find((r) => r.id === emp.role_id || r.slug === emp.role_id);
    setForm({
      firstName: emp.first_name,
      lastName: emp.last_name,
      email: emp.email,
      phone: emp.phone ?? "",
      roleId: matchedRole ? matchedRole.id : emp.role_id,
      salary: emp.salary != null ? String(emp.salary) : "",
      salaryType: emp.salary_type || "hourly",
      hireDate: emp.hire_date ?? toNicaraguaDateString(new Date()),
      password: "",
      confirmPassword: "",
    });
    setEditingId(emp.id);
    setEditingIsSystemUser(emp.is_system_user === true);
    setModalMode("edit");
    setShowPassword(false);
  };

  const closeModal = () => { setModalMode(null); setEditingId(null); setEditingIsSystemUser(false); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    if (form.password && form.password !== form.confirmPassword) {
      flash(t("employees.flash.passwordMismatch"), "error");
      return;
    }
    if (form.password && form.password.length < 6) {
      flash(t("employees.flash.passwordTooShort"), "error");
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
      if (!response.ok) throw new Error(data.error || t("employees.flash.serverError"));

      if (modalMode === "add") {
        setEmployees((prev) => [...prev, data]);
        flash(t("employees.flash.created"), "success");
      } else {
        setEmployees((prev) => prev.map((emp) => (emp.id === editingId ? data : emp)));
        flash(t("employees.flash.updated"), "success");
      }
      closeModal();
    } catch (err) {
      flash(err instanceof Error ? err.message : t("employees.flash.error"), "error");
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
        throw new Error(data.error || t("employees.flash.deleteError"));
      }
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      flash(t("employees.flash.deleted"), "success");
    } catch (err) {
      flash(err instanceof Error ? err.message : t("employees.flash.error"), "error");
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
      flash(e instanceof Error ? e.message : t("employees.flash.error"), "error");
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
      flash(e instanceof Error ? e.message : t("employees.flash.error"), "error");
    }
  };

  // Save bonus payment
  const saveBonusPayment = async () => {
    if (!tenantId || !fichaEmp || !fichaAguinaldoData) return;
    if (!bonusPayForm.paidAmount) {
      flash(t("employees.flashExtra.enterAmount"), "error");
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
      flash(t("employees.flashExtra.bonusRegistered"), "success");
      await loadAguinaldoData();
    } catch (e) {
      flash(e instanceof Error ? e.message : t("employees.flash.error"), "error");
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
      flash(e instanceof Error ? e.message : t("employees.flash.error"), "error");
    }
  };

  // Save vacation payment
  const saveVacationPayment = async () => {
    if (!tenantId || !fichaEmp) return;
    if (!vacationPayForm.daysUsed || !vacationPayForm.startDate || !vacationPayForm.endDate) {
      flash(t("employees.flashExtra.fillRequired"), "error");
      return;
    }
    setVacationPaySaving(true);
    try {
      const daysUsed = parseFloat(vacationPayForm.daysUsed);
      if (!fichaVacationData || fichaVacationData.daysRemaining < daysUsed) {
        flash(t("employees.flashExtra.insufficientDays"), "error");
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
      flash(t("employees.flashExtra.vacationRegistered"), "success");
      await loadVacationData();
    } catch (e) {
      flash(e instanceof Error ? e.message : t("employees.flash.error"), "error");
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
      <DashboardHeader
        pageType="employees"
        title={t("employees.title")}
        subtitle={t("employees.subtitle")}
      >
        <Button variant="primary" onClick={openAdd}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("employees.addBtn")}
        </Button>
      </DashboardHeader>

      {flashState && <FlashMessage flash={flashState} onDismiss={clearFlash} />}

      <Card>
        <div className="flex flex-col sm:flex-row gap-2 px-6 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={(value) => setSearch(value)}
              placeholder={t("employees.search")}
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("employees.allRoles")}</option>
            {tenantRoles.map((r) => (
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
            {employees.length === 0 ? t("employees.empty") : t("employees.noResults")}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Desktop: Table view */}
            <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-800 text-white text-xs font-semibold uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left text-white">{t("employees.colEmployee")}</th>
                  <th className="px-4 py-2.5 text-left hidden md:table-cell text-white">{t("employees.colEmail")}</th>
                  <th className="px-4 py-2.5 text-left hidden sm:table-cell text-white">{t("employees.colRole")}</th>
                  <th className="px-4 py-2.5 text-right hidden lg:table-cell text-white">{t("employees.colRate")}</th>
                  <th className="px-4 py-2.5 text-center text-white">{t("employees.colStatus")}</th>
                  <th className="px-4 py-2.5 text-center w-24 text-white"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((emp) => {
                  const role = tenantRoles.find((r) => r.id === emp.role_id);
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
                          {emp.status === "ACTIVE" ? t("employees.active") : t("employees.inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openFicha(emp)} title={t("employees.fichaBtn")} className="p-1.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button onClick={() => openEdit(emp)} title={t("employees.editBtn")} className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => setDeleteConfirmId(emp.id)} title={t("employees.deleteBtn")} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
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
                const role = tenantRoles.find((r) => r.id === emp.role_id);
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
                        {emp.status === "ACTIVE" ? t("employees.active") : t("employees.inactive")}
                      </span>
                    </div>

                    {/* Row 2: Email */}
                    <div className="text-xs space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 flex-shrink-0 w-14">{t("employees.labelEmail")}</span>
                        <span className="text-slate-700 font-mono truncate flex-1">{emp.email}</span>
                      </div>
                    </div>

                    {/* Row 3: Role */}
                    <div className="text-xs space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 flex-shrink-0 w-14">{t("employees.labelRole")}</span>
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">
                          {role?.name ?? emp.role_id}
                        </span>
                      </div>
                    </div>

                    {/* Row 4: Phone + Salary */}
                    <div className="text-xs space-y-1 border-t border-slate-100 pt-2">
                      {emp.phone && (
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500 flex-shrink-0 w-14">{t("employees.labelPhone")}</span>
                          <span className="text-slate-700">{emp.phone}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 flex-shrink-0 w-14">{t("employees.labelRate")}</span>
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
                        {t("employees.fichaBtn")}
                      </button>
                      <button
                        onClick={() => openEdit(emp)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 rounded text-xs font-medium text-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {t("employees.editBtn")}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(emp.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 hover:bg-red-100 rounded text-xs font-medium text-red-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {t("employees.deleteBtn")}
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
            {t("employees.footer", { count: displayed.length })}
          </div>
        )}
      </Card>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white rounded-t-xl">
              <h2 className="text-base font-semibold text-white">{modalMode === "add" ? t("employees.modal.addTitle") : t("employees.modal.editTitle")}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {editingIsSystemUser && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
                  {t("employees.modal.adminWarning")}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("employees.modal.firstName")}</label>
                  <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("employees.modal.lastName")}</label>
                  <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("employees.modal.email")}</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={editingIsSystemUser} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500" />
              </div>

              {!editingIsSystemUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("employees.modal.phone")}</label>
                    <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t("employees.modal.role")}</label>
                      <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {tenantRoles.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t("employees.modal.salaryType")}</label>
                      <select value={form.salaryType} onChange={(e) => setForm({ ...form, salaryType: e.target.value as "hourly" | "monthly" })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="hourly">{t("employees.modal.hourly")}</option>
                        <option value="monthly">{t("employees.modal.monthly")}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{form.salaryType === "monthly" ? t("employees.modal.salaryMonthly") : t("employees.modal.salaryHourly")}</label>
                    <input type="number" min="0" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("employees.modal.hireDate")}</label>
                    <input type="date" value={form.hireDate} max={toNicaraguaDateString(new Date())} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}

              <div className="border-t border-slate-200 pt-4">
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {modalMode === "add" ? (showPassword ? t("employees.modal.toggleHideAccess") : t("employees.modal.toggleDefineAccess")) : (showPassword ? t("employees.modal.toggleHide") : t("employees.modal.toggleChangePassword"))}
                </button>

                {showPassword && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("employees.modal.passwordLabel")} {modalMode === "add" ? "" : t("employees.modal.passwordNew")}</label>
                        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t("employees.modal.passwordPlaceholder")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("employees.modal.passwordConfirm")}</label>
                        <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">{t("employees.modal.passwordNote")}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="secondary" onClick={closeModal}>{t("employees.modal.cancel")}</Button>
                <Button variant="primary" disabled={saving} onClick={handleSave}>
                  {saving ? t("employees.modal.saving") : modalMode === "add" ? t("employees.modal.create") : t("employees.modal.save")}
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
                <h3 className="font-semibold text-slate-900">{t("employees.deleteConfirm.title")}</h3>
                <p className="text-sm text-slate-500">{t("employees.deleteConfirm.message")}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>{t("employees.deleteConfirm.cancel")}</Button>
              <Button variant="danger" disabled={saving} onClick={() => handleDelete(deleteConfirmId)}>
                {saving ? t("employees.deleteConfirm.deleting") : t("employees.deleteConfirm.delete")}
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
                  {fichaEmp.hire_date ? t("employees.ficha.hiredOn", { date: fmtDate(fichaEmp.hire_date) }) : t("employees.ficha.noHireDate")}
                  {" · "}{fmt(fichaEmp.salary)}{t("employees.ficha.perHour")}
                </p>
              </div>
              <button onClick={() => setFichaEmp(null)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3 pb-0 bg-white border-b border-slate-200 shrink-0">
              {(["payments", "aguinaldo", "vacaciones"] as const).map((tab) => (
                <button key={tab} onClick={() => setFichaTab(tab)}
                  className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                    fichaTab === tab ? "bg-white border border-b-white border-slate-200 text-slate-900 -mb-px" : "text-slate-500 hover:text-slate-700"
                  }`}>
                  {tab === "payments" ? t("employees.ficha.tabPayments") : tab === "aguinaldo" ? t("employees.ficha.tabBonus") : t("employees.ficha.tabVacation")}
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
                      <p className="text-sm font-bold text-white">{t("employees.payments.confirmTitle", { period: fichaPayingPeriod.period.label })}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-blue-200 rounded-lg p-3 text-center">
                          <p className="text-xs text-slate-500 mb-0.5">{t("employees.payments.hoursWorked")}</p>
                          <p className="text-2xl font-bold text-slate-900">{fichaPayingPeriod.hoursWorked}</p>
                        </div>
                        <div className="bg-white border border-blue-200 rounded-lg p-3 text-center">
                          <p className="text-xs text-slate-500 mb-0.5">{t("employees.payments.amountToPay")}</p>
                          <p className="text-2xl font-bold text-blue-700">{fmt(fichaPayingPeriod.amount)}</p>
                          <p className="text-xs text-slate-400">{fichaPayingPeriod.hoursWorked}h × {fmt(fichaEmp!.salary)}/h</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">{t("employees.payments.adjustAmount")}</label>
                        <input type="number" min="0" step="0.01"
                          value={fichaPayingPeriod.amount}
                          onChange={(e) => setFichaPayingPeriod((p) => p ? { ...p, amount: parseFloat(e.target.value) || 0 } : p)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">{t("employees.payments.notes")}</label>
                        <input type="text" value={fichaPayingPeriod.notes}
                          onChange={(e) => setFichaPayingPeriod((p) => p ? { ...p, notes: e.target.value } : p)}
                          placeholder={t("employees.payments.notesPlaceholder")}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={confirmPay} disabled={fichaPaySaving}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors">
                          {fichaPaySaving ? t("employees.payments.saving") : t("employees.payments.confirmBtn")}
                        </button>
                        <button onClick={() => setFichaPayingPeriod(null)}
                          className="px-4 py-2 text-sm text-slate-600 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors">
                          {t("employees.payments.cancel")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Period list */}
                  {fichaLoading ? (
                    <p className="text-sm text-slate-400 text-center py-6">{t("employees.payments.loading")}</p>
                  ) : fichaPeriods.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">{t("employees.payments.noPeriods")}</p>
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
                                {period.isCurrent && <span className="ml-2 text-xs font-normal text-amber-600">{t("employees.payments.current")}</span>}
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
                                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{t("employees.payments.paid")}</span>
                                  {fichaPayDelConfirm === paid.id ? (
                                    <span className="flex gap-1">
                                      <button onClick={() => handleDeletePayment(paid.id)} className="text-xs text-red-600 font-semibold hover:underline">{t("employees.payments.annul")}</button>
                                      <button onClick={() => setFichaPayDelConfirm(null)} className="text-xs text-slate-400 hover:underline">{t("employees.payments.no")}</button>
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
                                  {fichaPayingLoading && isConfirming ? t("employees.payments.loading2") : t("employees.payments.pay")}
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
                      {t("employees.payments.totalPaid")} <span className="font-bold text-slate-700">{fmt(fichaPayments.reduce((s, p) => s + p.amount, 0))}</span>
                    </p>
                  )}
                </div>
              )}

              {/* ── Aguinaldo tab ── */}
              {fichaTab === "aguinaldo" && (
                <div className="space-y-4">
                  {!fichaEmp.hire_date ? (
                    <p className="text-sm text-amber-600">{t("employees.aguinaldo.noHireDate")}</p>
                  ) : aguinaldoData && (
                    <>
                      {avgHoursPerMonth === 0 && (
                        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          {t("employees.aguinaldo.noPayments")}
                        </p>
                      )}
                      
                      {/* Alert for approaching deadline */}
                      {fichaAguinaldoData && !fichaAguinaldoData.alreadyPaid && fichaAguinaldoData.cycleEnd && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                          <span className="text-lg">⏰</span>
                          <p className="text-sm text-red-700">
                            <span className="font-semibold">{t("employees.aguinaldo.deadlineAlert", { date: fmtDate(`${new Date(fichaAguinaldoData.cycleEnd).getFullYear()}-12-15`) })}</span>
                            {" · "}{t("employees.aguinaldo.accumulatedAlert", { amount: fmt(fichaAguinaldoData.calculatedBonus) })}
                          </p>
                        </div>
                      )}
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-xs text-white font-semibold uppercase tracking-wide mb-2">{t("employees.aguinaldo.currentCycle")}</p>
                        <p className="text-sm text-slate-700">
                          {fmtDate(fichaAguinaldoData?.cycleStart)} – {fmtDate(fichaAguinaldoData?.cycleEnd)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {t("employees.aguinaldo.monthsWorked", { n: Math.floor(fichaAguinaldoData?.monthsWorkedInCycle || 0) })}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                          <p className="text-xs text-slate-500 mb-1">{t("employees.aguinaldo.avgSalary")}</p>
                          <p className="text-2xl font-bold text-slate-900">{fmt(fichaAguinaldoData?.avgMonthlySalary || 0)}</p>
                          <p className="text-xs text-slate-400">{t("employees.aguinaldo.basedOnReal")}</p>
                        </div>
                        <div className={`rounded-xl p-4 border ${fichaAguinaldoData?.alreadyPaid ? "bg-green-50 border-green-200" : "bg-emerald-50 border-emerald-200"}`}>
                          <p className={`text-xs ${fichaAguinaldoData?.alreadyPaid ? "text-green-700" : "text-emerald-700"} mb-1`}>{t("employees.aguinaldo.accumulated")}</p>
                          <p className={`text-2xl font-bold ${fichaAguinaldoData?.alreadyPaid ? "text-green-700" : "text-emerald-700"}`}>{fmt(fichaAguinaldoData?.calculatedBonus || 0)}</p>
                          <p className={`text-xs ${fichaAguinaldoData?.alreadyPaid ? "text-green-600" : "text-emerald-600"}`}>{t("employees.aguinaldo.months", { n: Math.floor(aguinaldoData.monthsWorked) })}</p>
                        </div>
                      </div>
                      
                      {!fichaAguinaldoData?.alreadyPaid && (
                        <button onClick={() => setShowBonusPayModal(true)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition-colors">
                          {t("employees.aguinaldo.payBtn")}
                        </button>
                      )}
                      
                      {fichaAguinaldoHistory.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 font-semibold uppercase mb-2">{t("employees.aguinaldo.historyTitle")}</p>
                          <div className="space-y-2">
                            {fichaAguinaldoHistory.map((payment) => (
                              <div key={payment.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{t("employees.aguinaldo.cycle", { year: payment.cycle_year })}</p>
                                  <p className="text-xs text-slate-500">
                                    {payment.paid_at ? t("employees.aguinaldo.paidOn", { date: fmtDate(payment.paid_at.split("T")[0]) }) : t("employees.aguinaldo.pending")}
                                  </p>
                                </div>
                                <p className="text-sm font-bold text-slate-900">{fmt(payment.paid_amount || payment.calculated_amount)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs text-slate-400">
                        {t("employees.aguinaldo.legalNote")}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* ── Vacaciones tab ── */}
              {fichaTab === "vacaciones" && (
                <div className="space-y-4">
                  {!fichaEmp.hire_date ? (
                    <p className="text-sm text-amber-600">{t("employees.vacation.noHireDate")}</p>
                  ) : vacationData && (
                    <>
                      {vacationData.avgHoursPerMonth === 0 && (
                        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          {t("employees.vacation.noPayments")}
                        </p>
                      )}
                      
                      {/* Alert if vacation is due */}
                      {fichaVacationData && fichaVacationData.daysRemaining > 0 && fichaVacationData.monthsSinceHire >= 6 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                          <span className="text-lg">🏖️</span>
                          <p className="text-sm text-amber-700">
                            <span className="font-semibold">{t("employees.vacation.dueAlert", { n: fichaVacationData.daysRemaining })}</span>
                          </p>
                        </div>
                      )}
                      
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">{t("employees.vacation.sinceHire")}</p>
                        <p className="text-sm text-slate-700">
                          {fmtDate(fichaEmp.hire_date!)} – {t("employees.vacation.today")}
                          {" · "}{t("employees.vacation.months", { n: Math.floor(fichaVacationData?.monthsSinceHire || 0) })}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <p className="text-xs text-amber-700 mb-1">{t("employees.vacation.daysAccrued")}</p>
                          <p className="text-2xl font-bold text-amber-700">{fichaVacationData?.daysAccrued || 0}</p>
                          <p className="text-xs text-amber-600">{t("employees.vacation.perMonth", { n: Math.floor(fichaVacationData?.monthsSinceHire || 0) })}</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <p className="text-xs text-green-700 mb-1">{t("employees.vacation.daysAvailable")}</p>
                          <p className="text-2xl font-bold text-green-700">{fichaVacationData?.daysRemaining || 0}</p>
                        </div>
                      </div>
                      
                      {fichaVacationData && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <p className="text-xs text-slate-600 font-semibold">{t("employees.vacation.daysUsed")}</p>
                            <p className="text-2xl font-bold text-slate-900">{fichaVacationData.daysUsed}</p>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                            <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">{t("employees.vacation.monetaryValue")}</p>
                            <p className="text-xl font-bold text-emerald-700">{fmt(fichaVacationData.monetaryValue || 0)}</p>
                          </div>
                        </div>
                      )}
                      
                      {fichaVacationData && fichaVacationData.daysRemaining > 0 && (
                        <button onClick={() => setShowVacationPayModal(true)}
                          className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-lg transition-colors">
                          {t("employees.vacation.payBtn")}
                        </button>
                      )}
                      
                      {fichaVacationHistory.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 font-semibold uppercase mb-2">{t("employees.vacation.historyTitle")}</p>
                          <div className="space-y-2">
                            {fichaVacationHistory.map((vacation) => (
                              <div key={vacation.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-1">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {t("employees.vacation.historyItem", { days: vacation.days_used, from: fmtDate(vacation.start_date), to: fmtDate(vacation.end_date) })}
                                  </p>
                                  <p className="text-sm font-bold text-slate-900">{fmt(vacation.monetary_value)}</p>
                                </div>
                                {vacation.notes && <p className="text-xs text-slate-500">{t("employees.vacation.notes", { notes: vacation.notes })}</p>}
                                <p className="text-xs text-slate-400">
                                  {t("employees.vacation.registeredOn", { date: fmtDate(vacation.created_at.split("T")[0]) })}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs text-slate-400">
                        {t("employees.vacation.legalNote")}
                      </p>
                    </>
                  )}
                </div>
              )}

            </div>

            {/* ── Bonus Payment Modal ── */}
            <Dialog
              isOpen={showBonusPayModal && !!fichaAguinaldoData}
              title={t("employees.bonusModal.title")}
              onClose={() => setShowBonusPayModal(false)}
              maxWidth="sm"
              footer={
                <div className="flex justify-end">
                  <button
                    onClick={saveBonusPayment}
                    disabled={bonusPaySaving || !bonusPayForm.paidAmount}
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-white font-semibold whitespace-nowrap"
                  >
                    {bonusPaySaving ? t("employees.bonusModal.saving") : t("employees.bonusModal.confirm")}
                  </button>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-white font-semibold mb-1">{t("employees.bonusModal.amountLabel")}</p>
                  <p className="text-2xl font-bold text-white">{fichaAguinaldoData ? fmt(fichaAguinaldoData.calculatedBonus) : 0}</p>
                  <p className="text-xs text-white mt-1">{t("employees.bonusModal.cycle", { year: fichaAguinaldoData?.cycleYear })}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("employees.bonusModal.paidLabel")}</label>
                  <input
                    type="number"
                    value={bonusPayForm.paidAmount}
                    onChange={(e) => setBonusPayForm((f) => ({ ...f, paidAmount: e.target.value }))}
                    placeholder={fichaAguinaldoData ? String(fichaAguinaldoData.calculatedBonus) : "0"}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("employees.bonusModal.notesLabel")}</label>
                  <input
                    type="text"
                    value={bonusPayForm.notes}
                    onChange={(e) => setBonusPayForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder={t("employees.bonusModal.notesPlaceholder")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </Dialog>

            {/* ── Vacation Payment Modal ── */}
            <Dialog
              isOpen={showVacationPayModal && !!fichaVacationData}
              title={t("employees.vacationModal.title")}
              onClose={() => setShowVacationPayModal(false)}
              maxWidth="sm"
              footer={
                <div className="flex justify-end">
                  <button
                    onClick={saveVacationPayment}
                    disabled={vacationPaySaving || !vacationPayForm.daysUsed || !vacationPayForm.startDate || !vacationPayForm.endDate}
                    className="py-2 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg text-white font-semibold whitespace-nowrap"
                  >
                    {vacationPaySaving ? t("employees.vacationModal.saving") : t("employees.vacationModal.confirm")}
                  </button>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-600 font-semibold mb-1">{t("employees.vacationModal.availableDays")}</p>
                  <p className="text-2xl font-bold text-amber-900">{fichaVacationData ? fichaVacationData.daysRemaining : 0} {t("employees.vacation.daysAccrued").toLowerCase()}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("employees.vacationModal.daysLabel")}</label>
                    <input
                      type="number"
                      step="0.5"
                      value={vacationPayForm.daysUsed}
                      onChange={(e) => setVacationPayForm((f) => ({ ...f, daysUsed: e.target.value }))}
                      placeholder="0"
                      max={fichaVacationData?.daysRemaining}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("employees.vacationModal.fromLabel")}</label>
                    <input
                      type="date"
                      value={vacationPayForm.startDate}
                      onChange={(e) => setVacationPayForm((f) => ({ ...f, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("employees.vacationModal.toLabel")}</label>
                  <input
                    type="date"
                    value={vacationPayForm.endDate}
                    onChange={(e) => setVacationPayForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("employees.vacationModal.notesLabel")}</label>
                  <input
                    type="text"
                    value={vacationPayForm.notes}
                    onChange={(e) => setVacationPayForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder={t("employees.vacationModal.notesPlaceholder")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </Dialog>
          </div>
        </div>
      )}
      </Section>
    </Container>
  );
}
