"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useTenantId } from "@/lib/utils/tenant";
import { DEFAULT_ROLES } from "@/lib/types/roles";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role_id: string;
  salary: number;
  status: "ACTIVE" | "INACTIVE";
  hire_date: string | null;
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
  const [fichaPayForm, setFichaPayForm] = useState({ periodStart: "", periodEnd: "", hoursWorked: "", amount: "", notes: "" });
  const [fichaPaySaving, setFichaPaySaving] = useState(false);
  const [fichaPayDelConfirm, setFichaPayDelConfirm] = useState<string | null>(null);

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
    setFichaPayForm({ periodStart: "", periodEnd: "", hoursWorked: "", amount: "", notes: "" });
    setFichaPayDelConfirm(null);
    if (!tenantId) return;
    setFichaLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/employees/${emp.id}/payments`);
      setFichaPayments(await res.json());
    } finally {
      setFichaLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!tenantId || !fichaEmp) return;
    const { periodStart, periodEnd, hoursWorked, amount, notes } = fichaPayForm;
    if (!periodStart || !periodEnd || !amount) return;
    setFichaPaySaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/employees/${fichaEmp.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart, periodEnd,
          hoursWorked: parseFloat(hoursWorked) || 0,
          hourlyRate: fichaEmp.salary,
          amount: parseFloat(amount),
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const newPay = await res.json();
      setFichaPayments((prev) => [newPay, ...prev]);
      setFichaPayForm({ periodStart: "", periodEnd: "", hoursWorked: "", amount: "", notes: "" });
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

  // ── Nicaragua: 13th month (aguinaldo) ──────────────────────────────────────
  // Period: Dec 1 (prev year) → Nov 30 (current year)
  // Amount = sum of salaries paid in that cycle / 12 (pro-rated if hired later)
  const aguinaldoData = (() => {
    if (!fichaEmp) return null;
    const today = new Date();
    const cycleYear = today.getMonth() < 11 ? today.getFullYear() : today.getFullYear();
    const cycleStart = new Date(cycleYear - 1, 11, 1); // Dec 1 prev year
    const cycleEnd   = new Date(cycleYear, 10, 30);    // Nov 30 current year
    const hireDate   = fichaEmp.hire_date ? new Date(fichaEmp.hire_date) : null;
    const effectiveStart = hireDate && hireDate > cycleStart ? hireDate : cycleStart;

    const totalMonths = 12;
    const msPerMonth = (cycleEnd.getTime() - cycleStart.getTime()) / totalMonths;
    const monthsWorked = Math.max(0,
      Math.min(totalMonths, (Math.min(today.getTime(), cycleEnd.getTime()) - effectiveStart.getTime()) / msPerMonth)
    );

    // Sum payments within cycle
    const cyclePayments = fichaPayments.filter((p) => {
      const d = new Date(p.paid_at);
      return d >= cycleStart && d <= cycleEnd;
    });
    const totalPaid = cyclePayments.reduce((s, p) => s + p.amount, 0);
    const estimated = monthsWorked > 0 ? Math.round((totalPaid / monthsWorked) * monthsWorked / 12 * 100) / 100 : 0;
    const prorated  = Math.round(monthsWorked / 12 * 100) / 100;

    return { cycleStart, cycleEnd, monthsWorked, totalPaid, estimated: Math.round(totalPaid / 12 * 100) / 100, prorated };
  })();

  // ── Vacation accrual: 2.5 days/month from hire date ────────────────────────
  const vacationData = (() => {
    if (!fichaEmp?.hire_date) return null;
    const hire  = new Date(fichaEmp.hire_date);
    const today = new Date();
    const diffMs = today.getTime() - hire.getTime();
    const months = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 30.44));
    const daysAccrued = Math.floor(months * 2.5 * 100) / 100;
    const fullYears   = Math.floor(months / 12);
    return { daysAccrued, months: Math.floor(months), fullYears };
  })();

  const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-NI", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Empleados</h1>
          <p className="text-sm text-slate-600 mt-1">Gestiona el personal, roles y accesos.</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Empleado
        </button>
      </div>

      {(success || error) && (
        <div className={`mb-6 rounded border p-4 text-sm ${success ? "border-green-300 bg-green-50 text-green-900" : "border-red-300 bg-red-50 text-red-900"}`}>
          {success ?? error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar empleado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 text-left">Empleado</th>
                  <th className="px-4 py-2.5 text-left hidden md:table-cell">Email</th>
                  <th className="px-4 py-2.5 text-left hidden sm:table-cell">Rol</th>
                  <th className="px-4 py-2.5 text-right hidden lg:table-cell">Tarifa/h</th>
                  <th className="px-4 py-2.5 text-center">Estado</th>
                  <th className="px-4 py-2.5 text-center w-24"></th>
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
                        <span className="inline-block px-2 py-0.5 text-sm rounded-full bg-blue-100 text-blue-700 font-medium">
                          {role?.name ?? emp.role_id}
                        </span>
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
        )}

        {!loading && (
          <div className="px-4 py-2 border-t border-slate-100 text-sm text-slate-400 bg-slate-50">
            {displayed.length} empleado{displayed.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white rounded-t-xl">
              <h2 className="text-base font-semibold">{modalMode === "add" ? "Nuevo Empleado" : "Editar Empleado"}</h2>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tarifa por hora *</label>
                  <input type="number" min="0" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
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
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60">
                  {saving ? "Guardando..." : modalMode === "add" ? "Crear Empleado" : "Guardar Cambios"}
                </button>
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
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirmId)} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60">
                {saving ? "Eliminando..." : "Eliminar"}
              </button>
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
                <h2 className="text-base font-semibold">{fichaEmp.first_name} {fichaEmp.last_name}</h2>
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
                <div className="space-y-4">
                  {/* Add payment form */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-800">Registrar nuevo pago</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Periodo inicio *</label>
                        <input type="date" value={fichaPayForm.periodStart}
                          onChange={(e) => setFichaPayForm((f) => ({ ...f, periodStart: e.target.value }))}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Periodo fin *</label>
                        <input type="date" value={fichaPayForm.periodEnd}
                          onChange={(e) => setFichaPayForm((f) => ({ ...f, periodEnd: e.target.value }))}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Horas trabajadas</label>
                        <input type="number" min="0" step="0.5" value={fichaPayForm.hoursWorked}
                          onChange={(e) => {
                            const h = e.target.value;
                            const calc = h && fichaEmp.salary > 0 ? String(Math.round(parseFloat(h) * fichaEmp.salary * 100) / 100) : fichaPayForm.amount;
                            setFichaPayForm((f) => ({ ...f, hoursWorked: h, amount: calc }));
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Monto a pagar *</label>
                        <input type="number" min="0" step="0.01" value={fichaPayForm.amount}
                          onChange={(e) => setFichaPayForm((f) => ({ ...f, amount: e.target.value }))}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Notas (opcional)</label>
                      <input type="text" value={fichaPayForm.notes}
                        onChange={(e) => setFichaPayForm((f) => ({ ...f, notes: e.target.value }))}
                        placeholder="Semana del 14 al 20 de abril..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <button onClick={handleAddPayment} disabled={fichaPaySaving || !fichaPayForm.periodStart || !fichaPayForm.periodEnd || !fichaPayForm.amount}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors">
                      {fichaPaySaving ? "Guardando..." : "Registrar Pago"}
                    </button>
                  </div>

                  {/* Payments list */}
                  {fichaLoading ? (
                    <p className="text-sm text-slate-400 text-center py-6">Cargando...</p>
                  ) : fichaPayments.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Sin pagos registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {fichaPayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{fmt(p.amount)}</p>
                            <p className="text-xs text-slate-500">
                              {fmtDate(p.period_start)} – {fmtDate(p.period_end)}
                              {p.hours_worked > 0 && ` · ${p.hours_worked}h`}
                              {p.notes && ` · ${p.notes}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-400">Pagado {fmtDate(p.paid_at)}</p>
                            {fichaPayDelConfirm === p.id ? (
                              <span className="flex gap-1">
                                <button onClick={() => handleDeletePayment(p.id)} className="text-xs text-red-600 font-semibold hover:underline">Confirmar</button>
                                <button onClick={() => setFichaPayDelConfirm(null)} className="text-xs text-slate-400 hover:underline">Cancelar</button>
                              </span>
                            ) : (
                              <button onClick={() => setFichaPayDelConfirm(p.id)} className="text-xs text-slate-300 hover:text-red-500 transition-colors">x</button>
                            )}
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-slate-400 text-right pt-1">
                        Total pagado: <span className="font-bold text-slate-700">{fmt(fichaPayments.reduce((s, p) => s + p.amount, 0))}</span>
                      </p>
                    </div>
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
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-2">Ciclo actual</p>
                        <p className="text-sm text-slate-700">
                          {fmtDate(aguinaldoData.cycleStart.toISOString().split("T")[0])} – {fmtDate(aguinaldoData.cycleEnd.toISOString().split("T")[0])}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {Math.floor(aguinaldoData.monthsWorked)} mes{Math.floor(aguinaldoData.monthsWorked) !== 1 ? "es" : ""} trabajados en este ciclo
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                          <p className="text-xs text-slate-500 mb-1">Total salarios pagados (ciclo)</p>
                          <p className="text-2xl font-bold text-slate-900">{fmt(aguinaldoData.totalPaid)}</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                          <p className="text-xs text-emerald-700 mb-1">Aguinaldo estimado (1/12)</p>
                          <p className="text-2xl font-bold text-emerald-700">{fmt(aguinaldoData.estimated)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">
                        * Ley 185 Nicaragua: el aguinaldo equivale a un mes de salario ordinario por cada año trabajado,
                        calculado sobre el total de salarios del ciclo Dic–Nov dividido entre 12.
                        Si no ha completado el ciclo se paga proporcional a los meses trabajados.
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
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">Desde contratacion</p>
                        <p className="text-sm text-slate-700">
                          {fmtDate(fichaEmp.hire_date!)} – hoy
                          {" · "}{vacationData.months} mes{vacationData.months !== 1 ? "es" : ""}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                          <p className="text-xs text-slate-500 mb-1">Meses trabajados</p>
                          <p className="text-2xl font-bold text-slate-900">{vacationData.months}</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <p className="text-xs text-amber-700 mb-1">Días acumulados</p>
                          <p className="text-2xl font-bold text-amber-700">{vacationData.daysAccrued}</p>
                          <p className="text-xs text-amber-600">(2.5 días / mes)</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">
                        * Art. 76 Código Laboral Nicaragua: todo trabajador tiene derecho a 15 días de descanso
                        (vacaciones) por cada 6 meses de trabajo continuo = 2.5 días por mes.
                        Este cálculo muestra los días acumulados desde la contratación y no descuenta
                        vacaciones ya tomadas.
                      </p>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
