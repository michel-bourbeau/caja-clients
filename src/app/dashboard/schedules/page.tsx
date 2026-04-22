"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTenantId } from "@/lib/utils/tenant";
import { toNicaraguaDateString } from "@/lib/utils/formatters";
import { useAuth } from "@/context/AuthContext";

const TZ = "America/Managua";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  status: "ACTIVE" | "INACTIVE";
}

interface TimeEntry {
  id: string;
  employee_id: string;
  employee_first_name?: string | null;
  employee_last_name?: string | null;
  check_in: string;
  check_out: string | null;
  notes: string | null;
}

function minutesDiff(from: string, to?: string | null): number {
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / 60000));
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("es-NI", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  }).format(new Date(iso));
}

function fmtDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString("es-NI", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Convert Nicaragua local date + time string to UTC ISO string (Nicaragua = UTC-6, no DST) */
function toUTC(date: string, time: string): string {
  return new Date(`${date}T${time}:00-06:00`).toISOString();
}

/** Get the start of the week for a given date, based on weekStartDay (0=Sun, 1=Mon, etc.) */
function getWeekStart(dateStr: string, weekStartDay: number = 0): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const currentDay = date.getDay();
  const daysBack = (currentDay - weekStartDay + 7) % 7;
  const weekStart = new Date(y, m - 1, d - daysBack);
  return toNicaraguaDateString(weekStart);
}

/** Get dates for the week (7 days starting from the specified day) */
function getWeekDates(weekStart: string, weekStartDay: number = 0): string[] {
  const [y, m, d] = weekStart.split("-").map(Number);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(y, m - 1, d + i);
    dates.push(toNicaraguaDateString(date));
  }
  return dates;
}

/** Format week range (e.g., "19 - 25 de abril") */
function fmtWeekRange(weekStart: string, weekStartDay: number = 0): string {
  const dates = getWeekDates(weekStart, weekStartDay);
  const first = dates[0];
  const last = dates[6];
  const [y1, m1, d1] = first.split("-").map(Number);
  const [y2, m2, d2] = last.split("-").map(Number);
  const monthName = new Date(y1, m1 - 1).toLocaleDateString("es-NI", { month: "long" });
  return `${d1} - ${d2} de ${monthName}`;
}

const EMPTY_MANUAL = {
  employeeId: "",
  date: toNicaraguaDateString(new Date()),
  checkInTime: "",
  checkOutTime: "",
  notes: "",
};

export default function AttendancePage() {
  const tenantId = useTenantId();
  const { user } = useAuth();
  const [tab, setTab] = useState<"manual" | "punch" | "history">("manual");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [historyEntries, setHistoryEntries] = useState<TimeEntry[]>([]);
  const [historyDate, setHistoryDate] = useState(toNicaraguaDateString(new Date()));
  const [historyWeekStart, setHistoryWeekStart] = useState(toNicaraguaDateString(new Date()));
  const [historyFilterEmployeeId, setHistoryFilterEmployeeId] = useState<string | null>(null);
  const [weekStartDay, setWeekStartDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [tick, setTick] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);

  // Manual entry form
  const [manualForm, setManualForm] = useState({ ...EMPTY_MANUAL });
  const [manualSaving, setManualSaving] = useState(false);

  // Edit entry modal
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editForm, setEditForm] = useState({ checkInTime: "", checkOutTime: "", notes: "", date: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Check if user is admin
  const isAdmin = user?.roleId === "admin";

  const openEdit = (entry: TimeEntry) => {
    const dateStr = toNicaraguaDateString(new Date(entry.check_in));
    const toTime = (iso: string) => {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("es-NI", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(d);
    };
    setEditForm({
      date: dateStr,
      checkInTime: toTime(entry.check_in),
      checkOutTime: entry.check_out ? toTime(entry.check_out) : "",
      notes: entry.notes ?? "",
    });
    setEditEntry(entry);
  };

  const handleEditSave = async () => {
    if (!tenantId || !editEntry) return;
    if (!editForm.checkInTime) return showMsg(false, "Ingresa la hora de entrada");
    if (editForm.checkOutTime && editForm.checkOutTime <= editForm.checkInTime) {
      return showMsg(false, "La hora de salida debe ser posterior a la entrada");
    }
    setEditSaving(true);
    try {
      const body: Record<string, string | null> = {
        checkIn: toUTC(editForm.date, editForm.checkInTime),
      };
      if (editForm.checkOutTime) body.checkOut = toUTC(editForm.date, editForm.checkOutTime);
      else body.checkOut = null;
      body.notes = editForm.notes.trim() || null;

      const res = await fetch(`/api/tenants/${tenantId}/attendance/${editEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      setEditEntry(null);
      showMsg(true, "Registro actualizado");
      // Always refresh today (drives Tiempo Real tab), plus history if currently viewing it
      await loadToday();
      if (tab === "history") await loadHistory();
    } catch (e) {
      showMsg(false, e instanceof Error ? e.message : "Error");
    } finally {
      setEditSaving(false);
    }
  };

  const showMsg = (ok: boolean, text: string) => {
    setMessage({ ok, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const loadToday = useCallback(async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const today = toNicaraguaDateString(new Date());
      const [empRes, entRes, settingsRes] = await Promise.all([
        fetch(`/api/tenants/${tenantId}/employees`),
        fetch(`/api/tenants/${tenantId}/attendance?fromDate=${today}&toDate=${today}`),
        fetch(`/api/tenants/${tenantId}/settings`),
      ]);
      const emp: Employee[] = await empRes.json();
      const ent: TimeEntry[] = await entRes.json();
      const settings: any = await settingsRes.json();
      
      const active = Array.isArray(emp) ? emp.filter((e) => e.status === "ACTIVE") : [];
      setEmployees(active);
      setTodayEntries(Array.isArray(ent) ? ent : []);
      
      // Load week start day from tenant settings
      const dayOfWeek = settings.payrollConfig?.weekStartDay ?? 0;
      setWeekStartDay(dayOfWeek);
      setHistoryWeekStart(getWeekStart(today, dayOfWeek));
      
      // Pre-select the logged-in user in the manual entry form and track their ID
      if (user?.email) {
        const self = active.find(
          (e) => (e as Employee & { email?: string }).email?.toLowerCase() === user.email.toLowerCase()
        );
        if (self) {
          setCurrentEmployeeId(self.id);
          setManualForm((f) => ({ ...f, employeeId: f.employeeId || self.id }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tenantId, user?.email]);

  useEffect(() => { loadToday(); }, [loadToday]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!tenantId) return;
    setHistoryLoading(true);
    try {
      const weekDates = getWeekDates(historyWeekStart, weekStartDay);
      const fromDate = weekDates[0];
      const toDate = weekDates[6];
      const res = await fetch(
        `/api/tenants/${tenantId}/attendance?fromDate=${fromDate}&toDate=${toDate}`
      );
      const data: TimeEntry[] = await res.json();
      setHistoryEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  }, [tenantId, historyWeekStart, weekStartDay]);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  const goToWeek = (offset: number) => {
    const [y, m, d] = historyWeekStart.split("-").map(Number);
    const newDate = new Date(y, m - 1, d + offset * 7);
    setHistoryWeekStart(toNicaraguaDateString(newDate));
  };

  const goToThisWeek = () => {
    setHistoryWeekStart(getWeekStart(toNicaraguaDateString(new Date()), weekStartDay));
  };

  const empSummary = useMemo(() => {
    const map = new Map<
      string,
      { entries: TimeEntry[]; openEntry: TimeEntry | null; closedMin: number }
    >();
    employees.forEach((e) =>
      map.set(e.id, { entries: [], openEntry: null, closedMin: 0 })
    );
    const sorted = [...todayEntries].sort(
      (a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime()
    );
    sorted.forEach((entry) => {
      const s = map.get(entry.employee_id);
      if (!s) return;
      s.entries.push(entry);
      if (!entry.check_out) {
        s.openEntry = entry;
      } else {
        s.closedMin += minutesDiff(entry.check_in, entry.check_out);
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, todayEntries, tick]);

  // Filter employees: admins see all, non-admins see only themselves
  const visibleEmployees = useMemo(() => {
    if (isAdmin) return employees;
    if (currentEmployeeId) return employees.filter(e => e.id === currentEmployeeId);
    return [];
  }, [employees, isAdmin, currentEmployeeId]);

  // --- Manual entry submit ---
  const handleManualEntry = async () => {
    if (!tenantId) return;
    const { employeeId, date, checkInTime, checkOutTime, notes } = manualForm;
    if (!employeeId) return showMsg(false, "Selecciona un empleado");
    if (!date) return showMsg(false, "Selecciona una fecha");
    if (!checkInTime) return showMsg(false, "Ingresa la hora de entrada");
    if (checkOutTime && checkOutTime <= checkInTime) {
      return showMsg(false, "La hora de salida debe ser posterior a la entrada");
    }
    setManualSaving(true);
    try {
      const body: Record<string, string> = {
        employeeId,
        checkIn: toUTC(date, checkInTime),
      };
      if (checkOutTime) body.checkOut = toUTC(date, checkOutTime);
      if (notes.trim()) body.notes = notes.trim();

      const res = await fetch(`/api/tenants/${tenantId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      showMsg(true, "Horas registradas correctamente");
      // Reset only times/notes, keep employee + date for fast multi-entry
      setManualForm((f) => ({ ...f, checkInTime: "", checkOutTime: "", notes: "" }));
      if (date === toNicaraguaDateString(new Date())) await loadToday();
    } catch (e) {
      showMsg(false, e instanceof Error ? e.message : "Error");
    } finally {
      setManualSaving(false);
    }
  };

  // --- Punch clock ---
  const handleCheckIn = async (employeeId: string) => {
    if (!tenantId) return;
    setActionLoading(employeeId);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      showMsg(true, "Entrada registrada");
      await loadToday();
    } catch (e) {
      showMsg(false, e instanceof Error ? e.message : "Error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async (entryId: string, employeeId: string) => {
    if (!tenantId) return;
    setActionLoading(employeeId);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/attendance/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkOut: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      showMsg(true, "Salida registrada");
      await loadToday();
    } catch (e) {
      showMsg(false, e instanceof Error ? e.message : "Error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!tenantId) return;
    try {
      await fetch(`/api/tenants/${tenantId}/attendance/${entryId}`, { method: "DELETE" });
      setDeleteConfirm(null);
      await (tab === "history" ? loadHistory() : loadToday());
      showMsg(true, "Entrada eliminada");
    } catch {
      showMsg(false, "Error al eliminar");
    }
  };

  // Filter history entries based on admin status and selected employee filter
  const visibleHistoryEntries = useMemo(() => {
    let filtered = historyEntries;
    
    // Non-admins only see their own records
    if (!isAdmin && currentEmployeeId) {
      filtered = filtered.filter(e => e.employee_id === currentEmployeeId);
    }
    
    // Admins can further filter by selected employee
    if (isAdmin && historyFilterEmployeeId) {
      filtered = filtered.filter(e => e.employee_id === historyFilterEmployeeId);
    }
    
    return filtered;
  }, [historyEntries, isAdmin, currentEmployeeId, historyFilterEmployeeId]);

  // Get summary by employee for the week
  const weeklyEmployeeSummary = useMemo(() => {
    const sorted = [...visibleHistoryEntries].sort(
      (a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime()
    );
    const map = new Map<string, { name: string; totalMin: number; dayCount: number }>();
    
    sorted.forEach((e) => {
      const key = e.employee_id;
      if (!map.has(key)) {
        map.set(key, {
          name: `${e.employee_first_name ?? ""} ${e.employee_last_name ?? ""}`.trim(),
          totalMin: 0,
          dayCount: 0,
        });
      }
      const s = map.get(key)!;
      if (e.check_out) {
        s.totalMin += minutesDiff(e.check_in, e.check_out);
        s.dayCount++;
      }
    });
    
    return map;
  }, [visibleHistoryEntries]);

  const historyByDay = useMemo(() => {
    const sorted = [...visibleHistoryEntries].sort(
      (a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime()
    );
    const weekDates = getWeekDates(historyWeekStart, weekStartDay);
    const dayMap = new Map<string, Map<string, { name: string; entries: TimeEntry[]; totalMin: number }>>();
    
    // Initialize all days
    weekDates.forEach(date => {
      dayMap.set(date, new Map());
    });
    
    // Group by day then employee
    sorted.forEach((e) => {
      const dayStr = toNicaraguaDateString(new Date(e.check_in));
      const dayEmployees = dayMap.get(dayStr);
      if (!dayEmployees) return;
      
      const key = e.employee_id;
      if (!dayEmployees.has(key)) {
        dayEmployees.set(key, {
          name: `${e.employee_first_name ?? ""} ${e.employee_last_name ?? ""}`.trim(),
          entries: [],
          totalMin: 0,
        });
      }
      const s = dayEmployees.get(key)!;
      s.entries.push(e);
      if (e.check_out) s.totalMin += minutesDiff(e.check_in, e.check_out);
    });
    
    return dayMap;
  }, [visibleHistoryEntries, historyWeekStart, weekStartDay]);

  const historyByEmployee = useMemo(() => {
    const sorted = [...visibleHistoryEntries].sort(
      (a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime()
    );
    const map = new Map<
      string,
      { name: string; entries: TimeEntry[]; totalMin: number }
    >();
    sorted.forEach((e) => {
      const key = e.employee_id;
      if (!map.has(key)) {
        map.set(key, {
          name: `${e.employee_first_name ?? ""} ${e.employee_last_name ?? ""}`.trim(),
          entries: [],
          totalMin: 0,
        });
      }
      const s = map.get(key)!;
      s.entries.push(e);
      if (e.check_out) s.totalMin += minutesDiff(e.check_in, e.check_out);
    });
    return map;
  }, [visibleHistoryEntries]);

  const TABS = [
    { id: "manual",  label: "Entrada Manual" },
    { id: "punch",   label: "Tiempo Real"    },
    { id: "history", label: "Historial"      },
  ] as const;

  return (
    <div>
      {/* Edit entry modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Editar Registro</h2>
              <button onClick={() => setEditEntry(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-slate-500">
              {editEntry.employee_first_name} {editEntry.employee_last_name} &mdash; {editForm.date}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Hora entrada</label>
                <input
                  type="time"
                  value={editForm.checkInTime}
                  onChange={(e) => setEditForm((f) => ({ ...f, checkInTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Hora salida</label>
                <input
                  type="time"
                  value={editForm.checkOutTime}
                  onChange={(e) => setEditForm((f) => ({ ...f, checkOutTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {editForm.checkInTime && editForm.checkOutTime && editForm.checkOutTime > editForm.checkInTime && (
              <div className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                Duración: <span className="font-bold">{fmtDuration(Math.floor(
                  (new Date(`2000-01-01T${editForm.checkOutTime}`).getTime() -
                    new Date(`2000-01-01T${editForm.checkInTime}`).getTime()) / 60000
                ))}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Notas</label>
              <input
                type="text"
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Opcional..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditEntry(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving || !editForm.checkInTime}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold"
              >
                {editSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asistencia</h1>
          <p className="text-sm text-slate-600 mt-1">
            {fmtDateLong(toNicaraguaDateString(new Date()))} &mdash;{" "}
            {visibleEmployees.length} empleado{visibleEmployees.length !== 1 ? "s" : ""} {!isAdmin && "a tu cargo"}
            {!isAdmin ? "" : "activo" + (visibleEmployees.length !== 1 ? "s" : "")}
          </p>
        </div>
        <button
          onClick={loadToday}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 0120 15M19.418 15A8 8 0 014 9" />
          </svg>
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toast */}
      {message && (
        <div className={`mb-5 px-4 py-3 rounded-lg border text-sm font-medium ${
          message.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {message.text}
        </div>
      )}

      {/* ── Manual Entry Tab ─────────────────────────────────────────────────── */}
      {tab === "manual" && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <p className="text-sm text-slate-500">
              Registra las horas trabajadas de un empleado para cualquier dia.
            </p>

            {/* Employee */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Empleado <span className="text-red-500">*</span>
              </label>
              {loading ? (
                <div className="h-10 bg-slate-100 animate-pulse rounded-lg" />
              ) : isAdmin ? (
                <select
                  value={manualForm.employeeId}
                  onChange={(e) => setManualForm((f) => ({ ...f, employeeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Seleccionar empleado --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-slate-50">
                  {visibleEmployees[0] ? `${visibleEmployees[0].first_name} ${visibleEmployees[0].last_name}` : "Tu empleado"}
                  <input type="hidden" value={manualForm.employeeId} />
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={manualForm.date}
                max={toNicaraguaDateString(new Date())}
                onChange={(e) => setManualForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Times side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Hora de entrada <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={manualForm.checkInTime}
                  onChange={(e) => setManualForm((f) => ({ ...f, checkInTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Hora de salida
                </label>
                <input
                  type="time"
                  value={manualForm.checkOutTime}
                  onChange={(e) => setManualForm((f) => ({ ...f, checkOutTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Duration preview */}
            {manualForm.checkInTime && manualForm.checkOutTime && manualForm.checkOutTime > manualForm.checkInTime && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Duracion: <span className="font-bold ml-1">
                  {fmtDuration(
                    Math.floor(
                      (new Date(`2000-01-01T${manualForm.checkOutTime}`).getTime() -
                        new Date(`2000-01-01T${manualForm.checkInTime}`).getTime()) / 60000
                    )
                  )}
                </span>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Notas <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={manualForm.notes}
                onChange={(e) => setManualForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Ej: Turno de manana, cubriendo a Juan..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleManualEntry}
              disabled={manualSaving || !manualForm.employeeId || !manualForm.checkInTime}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors"
            >
              {manualSaving ? "Guardando..." : "Guardar Registro"}
            </button>
          </div>
        </div>
      )}

      {/* ── Punch Clock Tab ───────────────────────────────────────────────────── */}
      {tab === "punch" && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border-2 border-slate-200 bg-slate-50 h-52" />
              ))}
            </div>
          ) : visibleEmployees.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <p className="text-4xl mb-3">&#x1F465;</p>
              <p className="font-medium">No hay empleados activos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleEmployees.map((emp) => {
                const s = empSummary.get(emp.id)!;
                const isInside = !!s.openEntry;
                const elapsedMin = s.openEntry ? minutesDiff(s.openEntry.check_in) : 0;
                const totalMin = s.closedMin + elapsedMin;
                const isProcessing = actionLoading === emp.id;

                return (
                  <div
                    key={emp.id}
                    className={`rounded-xl border-2 p-5 flex flex-col gap-3 transition-colors ${
                      isInside ? "border-green-400 bg-green-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-900 text-base leading-tight">
                        {emp.first_name} {emp.last_name}
                      </h3>
                      <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                        isInside ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {isInside ? "DENTRO" : "FUERA"}
                      </span>
                    </div>

                    <div className="text-sm text-slate-600 space-y-0.5 min-h-[2.5rem]">
                      {isInside && s.openEntry && (
                        <p>
                          Entro: <span className="font-semibold text-slate-800">{fmtTime(s.openEntry.check_in)}</span>
                          {" "}&mdash; turno: <span className="font-semibold text-green-700">{fmtDuration(elapsedMin)}</span>
                        </p>
                      )}
                      {totalMin > 0 && (
                        <p>Total hoy: <span className="font-semibold text-slate-800">{fmtDuration(totalMin)}</span></p>
                      )}
                    </div>

                    {s.entries.length > 0 && (
                      <div className="text-xs text-slate-500 space-y-1 border-t border-slate-100 pt-2">
                        {s.entries.map((entry, i) => (
                          <div key={entry.id} className="flex justify-between">
                            <span className="text-slate-400">Turno {i + 1}</span>
                            <span>
                              {fmtTime(entry.check_in)} &rarr;{" "}
                              {entry.check_out
                                ? `${fmtTime(entry.check_out)} (${fmtDuration(minutesDiff(entry.check_in, entry.check_out))})`
                                : <span className="text-green-600 font-semibold">en curso</span>
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => isInside ? handleCheckOut(s.openEntry!.id, emp.id) : handleCheckIn(emp.id)}
                      disabled={isProcessing}
                      className={`mt-auto w-full py-3 rounded-lg font-bold text-white text-sm transition-colors disabled:opacity-50 ${
                        isInside
                          ? "bg-orange-500 hover:bg-orange-600 active:bg-orange-700"
                          : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                      }`}
                    >
                      {isProcessing ? "Registrando..." : isInside ? "Registrar Salida" : "Registrar Entrada"}
                    </button>
                    {/* Allow editing the open entry to set a custom check-out time */}
                    {isInside && s.openEntry && (
                      <button
                        onClick={() => openEdit(s.openEntry!)}
                        className="w-full py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
                      >
                        Editar / Corregir hora
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── History Tab ───────────────────────────────────────────────────────── */}
      {tab === "history" && (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="space-y-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => goToWeek(-1)}
                  disabled={historyLoading}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 text-sm font-semibold rounded-lg transition-colors"
                >
                  ← Anterior
                </button>
                <div className="text-center min-w-[220px]">
                  <p className="text-sm font-semibold text-slate-900">
                    Semana del {fmtWeekRange(historyWeekStart, weekStartDay)}
                  </p>
                </div>
                <button
                  onClick={() => goToWeek(1)}
                  disabled={historyLoading}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 text-sm font-semibold rounded-lg transition-colors"
                >
                  Siguiente →
                </button>
              </div>
              <button
                onClick={goToThisWeek}
                disabled={historyLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Esta Semana
              </button>
            </div>

            {/* Employee Filter (Admin Only) */}
            {isAdmin && (
              <div className="max-w-xs">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Filtrar por empleado</label>
                <select
                  value={historyFilterEmployeeId || ""}
                  onChange={(e) => setHistoryFilterEmployeeId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Todos los empleados --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Content Section */}
          {historyLoading ? (
            <div className="py-10 text-center text-slate-400 text-sm">Cargando...</div>
          ) : visibleHistoryEntries.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <p className="text-3xl mb-2">📋</p>
              <p>No hay registros para esta semana.</p>
            </div>
          ) : (
            <>
              {/* Weekly Summary by Employee */}
              {weeklyEmployeeSummary.size > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900">Resumen de la Semana</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {[...weeklyEmployeeSummary.entries()]
                      .sort((a, b) => b[1].totalMin - a[1].totalMin)
                      .map(([empId, { name, totalMin, dayCount }]) => (
                        <div key={empId} className="px-5 py-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{name || empId}</p>
                            <p className="text-xs text-slate-500">{dayCount} día{dayCount !== 1 ? "s" : ""} registrado{dayCount !== 1 ? "s" : ""}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-blue-700">{fmtDuration(totalMin)}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Detailed Entries by Day */}
              <div className="space-y-6">
                {getWeekDates(historyWeekStart, weekStartDay).map((dateStr) => {
                  const dayEmployees = historyByDay.get(dateStr);
                  const hasEntries = dayEmployees && dayEmployees.size > 0;
                  
                  if (!hasEntries) return null;
                  
                  return (
                    <div key={dateStr}>
                      <h4 className="text-sm font-semibold text-slate-900 mb-3">
                        {fmtDateLong(dateStr)}
                      </h4>
                      <div className="space-y-3">
                        {[...dayEmployees!.entries()].map(([empId, { name, entries, totalMin }]) => (
                          <div key={empId} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                              <span className="font-medium text-slate-900 text-sm">{name || empId}</span>
                              <span className="text-xs font-semibold text-blue-700">Total: {fmtDuration(totalMin)}</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                              {entries.map((entry, i) => (
                                <div key={entry.id} className="px-4 py-2.5 text-xs hover:bg-slate-50">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-slate-500">#{i + 1}</span>
                                    <div className="flex items-center gap-2 flex-1">
                                      <span className="font-medium text-slate-700">{fmtTime(entry.check_in)}</span>
                                      <span className="text-slate-400">→</span>
                                      {entry.check_out ? (
                                        <>
                                          <span className="font-medium text-slate-700">{fmtTime(entry.check_out)}</span>
                                          <span className="text-slate-500 ml-auto">({fmtDuration(minutesDiff(entry.check_in, entry.check_out))})</span>
                                        </>
                                      ) : (
                                        <span className="text-amber-600 font-semibold ml-auto">Sin salida</span>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => openEdit(entry)}
                                        className="text-blue-500 hover:text-blue-700 font-semibold transition-colors"
                                        title="Editar"
                                      >
                                        Editar
                                      </button>
                                      {deleteConfirm === entry.id ? (
                                        <>
                                          <button onClick={() => handleDeleteEntry(entry.id)} className="text-red-600 hover:text-red-700 font-semibold">Confirmar</button>
                                          <button onClick={() => setDeleteConfirm(null)} className="text-slate-400">Cancelar</button>
                                        </>
                                      ) : (
                                        <button onClick={() => setDeleteConfirm(entry.id)} className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}