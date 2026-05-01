"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { toNicaraguaDateString } from "@/lib/utils/formatters";
import { useAuth } from "@/context/AuthContext";
import { useTenantFeatures } from "@/context/TenantFeaturesContext";
import { Button, Card, Container, Section, Alert } from "@/components/StripeUIComponents";
import { ButtonGroup } from "@/components/ButtonGroup";
import { DashboardHeader } from "@/components";
import { buildPrintDocument, openPrintWindow, escHtml } from "@/lib/export";

type PeriodType = "week" | "month" | "year";
type TabType = "resumen" | "gastos" | "salarios";

interface BilanSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  txCount: number;
  refundTotal?: number;
  refundCount?: number;
}

export default function BilanPage() {
  const tenantId = useTenantId();
  const { fmt } = useCurrency();
  const { user, hasPermission } = useAuth();
  const { features } = useTenantFeatures();

  // Feature + permission guard
  if (features && !features.reports) {
    return (
      <Container>
        <Alert variant="warning">
          El módulo de Reportes no está activado en tu plan actual.
        </Alert>
      </Container>
    );
  }
  if (!hasPermission("reports.view")) {
    return (
      <Container>
        <Alert variant="error">
          No tienes permisos para ver el Bilan Financiero.
        </Alert>
      </Container>
    );
  }

  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [periodDate, setPeriodDate] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<TabType>("resumen");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aggregated sales data from reports API (handles >1000 rows via server-side pagination)
  const [salesSummary, setSalesSummary] = useState<BilanSummary>({ revenue: 0, cogs: 0, grossProfit: 0, txCount: 0 });
  const [expenses, setExpenses] = useState<any[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<any[]>([]);

  // ── Date range ──────────────────────────────────────────────────────────
  const { dateFrom, dateTo } = useMemo(() => {
    const year = periodDate.getFullYear();
    const month = periodDate.getMonth();
    const day = periodDate.getDate();
    let from: Date, to: Date;

    if (periodType === "week") {
      const d = new Date(year, month, day);
      const dow = d.getDay();
      from = new Date(year, month, day - dow + (dow === 0 ? -6 : 1));
      to = new Date(from);
      to.setDate(to.getDate() + 6);
    } else if (periodType === "month") {
      from = new Date(year, month, 1);
      to = new Date(year, month + 1, 0);
    } else {
      from = new Date(year, 0, 1);
      to = new Date(year, 11, 31);
    }

    return {
      dateFrom: toNicaraguaDateString(from),
      dateTo: toNicaraguaDateString(to),
    };
  }, [periodDate, periodType]);

  // ── Fetch all data ───────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { "x-user-id": user?.id || "" };

      // Use reports API (BILAN type) — it handles >1000 rows via server-side pagination
      const [bilanRes, expRes, salRes] = await Promise.all([
        fetch(
          `/api/tenants/${tenantId}/reports?type=BILAN&fromDate=${dateFrom}&toDate=${dateTo}`
        ),
        fetch(`/api/tenants/${tenantId}/expenses`, { headers }),
        fetch(
          `/api/tenants/${tenantId}/payroll/payments?paidFrom=${dateFrom}&paidTo=${dateTo}`
        ),
      ]);

      if (bilanRes.ok) {
        const bilanData = await bilanRes.json();
        setSalesSummary(bilanData);
      }

      if (expRes.ok) {
        const expData: any[] = await expRes.json();
        // Filter to the period client-side
        const from = new Date(dateFrom + "T00:00:00");
        const to = new Date(dateTo + "T23:59:59");
        setExpenses(
          expData.filter((e) => {
            const d = new Date(e.expense_date);
            return d >= from && d <= to;
          })
        );
      }

      if (salRes.ok) {
        const salData = await salRes.json();
        setSalaryPayments(Array.isArray(salData) ? salData : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [tenantId, dateFrom, dateTo, user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses]
  );

  const totalSalaries = useMemo(
    () => salaryPayments.reduce((s, p) => s + Number(p.amount), 0),
    [salaryPayments]
  );

  const netProfit = salesSummary.grossProfit - totalExpenses - totalSalaries;

  // Expense breakdown by category
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = e.category || "Sin categoría";
      map[cat] = (map[cat] || 0) + Number(e.amount);
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // Salary breakdown by employee
  const salariesByEmployee = useMemo(() => {
    const map: Record<string, { name: string; amount: number; count: number }> = {};
    salaryPayments.forEach((p) => {
      const id = p.employee_id;
      const firstName = p.employees?.first_name || "";
      const lastName = p.employees?.last_name || "";
      const name = firstName || lastName ? `${firstName} ${lastName}`.trim() : id;
      if (!map[id]) map[id] = { name, amount: 0, count: 0 };
      map[id].amount += Number(p.amount);
      map[id].count += 1;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [salaryPayments]);

  // ── Period navigation ────────────────────────────────────────────────────
  const navigate = (dir: -1 | 1) => {
    const d = new Date(periodDate);
    if (periodType === "week") d.setDate(d.getDate() + dir * 7);
    else if (periodType === "month") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setPeriodDate(d);
  };

  const periodLabel =
    periodType === "week"
      ? `${dateFrom} → ${dateTo}`
      : periodType === "month"
      ? periodDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
      : `${periodDate.getFullYear()}`;

  // ── Summary bar widths ───────────────────────────────────────────────────
  const maxAbs = Math.max(salesSummary.grossProfit, totalExpenses, totalSalaries, 1);
  const pct = (v: number) => Math.round((Math.abs(v) / maxAbs) * 100);

  // ── Print bilan ──────────────────────────────────────────────────────────
  const handlePrintBilan = () => {
    const printedAt = new Intl.DateTimeFormat("es-NI", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date());

    const fmtNum = (n: number) =>
      n.toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const money = (n: number) => `C$ ${fmtNum(n)}`;

    // ── KPI cards ──────────────────────────────────────────────────────
    const kpiHtml = `
<div class="stats-grid">
  <div class="stat-card" style="border-left:4px solid #16a34a">
    <div class="stat-label">Ganancia Bruta</div>
    <div class="stat-value" style="color:#15803d">${money(salesSummary.grossProfit)}</div>
    <div class="stat-sub">${salesSummary.txCount} ventas · ${money(salesSummary.revenue)} ingresos</div>
  </div>
  <div class="stat-card" style="border-left:4px solid #ea580c">
    <div class="stat-label">Gastos</div>
    <div class="stat-value" style="color:#c2410c">− ${money(totalExpenses)}</div>
    <div class="stat-sub">${expenses.length} entrada${expenses.length !== 1 ? "s" : ""}</div>
  </div>
  <div class="stat-card" style="border-left:4px solid #9333ea">
    <div class="stat-label">Salarios</div>
    <div class="stat-value" style="color:#7e22ce">− ${money(totalSalaries)}</div>
    <div class="stat-sub">${salaryPayments.length} pago${salaryPayments.length !== 1 ? "s" : ""}</div>
  </div>
  <div class="stat-card" style="border-left:4px solid ${netProfit >= 0 ? "#2563eb" : "#dc2626"}">
    <div class="stat-label">Ganancia Neta</div>
    <div class="stat-value" style="color:${netProfit >= 0 ? "#1d4ed8" : "#dc2626"}">${money(netProfit)}</div>
    <div class="stat-sub">${salesSummary.revenue > 0 ? `Margen: ${((netProfit / salesSummary.revenue) * 100).toFixed(1)}%` : "Sin ventas"}</div>
  </div>
</div>`;

    // ── Estado de resultados ────────────────────────────────────────────
    const estadoHtml = `
<h2 class="section-title">Estado de Resultados</h2>
<table>
  <tbody>
    <tr><td>Ingresos por ventas</td><td class="right">${money(salesSummary.revenue)}</td></tr>
    <tr><td>Costo de productos vendidos</td><td class="right" style="color:#dc2626">− ${money(salesSummary.cogs)}</td></tr>
    <tr class="subtotal"><td><b>Ganancia Bruta</b></td><td class="right" style="color:#15803d"><b>${money(salesSummary.grossProfit)}</b></td></tr>
    <tr><td>Gastos operacionales</td><td class="right" style="color:#c2410c">− ${money(totalExpenses)}</td></tr>
    <tr><td>Salarios</td><td class="right" style="color:#7e22ce">− ${money(totalSalaries)}</td></tr>
    <tr class="total"><td><b>GANANCIA NETA</b></td><td class="right" style="color:${netProfit >= 0 ? "#1d4ed8" : "#dc2626"}"><b>${money(netProfit)}</b></td></tr>
  </tbody>
</table>`;

    // ── Gastos por categoría ────────────────────────────────────────────
    const catHtml = expensesByCategory.length > 0 ? `
<h2 class="section-title" style="margin-top:20px">Gastos por Categoría</h2>
<table>
  <thead><tr><th>Categoría</th><th class="right">Monto</th></tr></thead>
  <tbody>
    ${expensesByCategory.map((c) => `<tr><td>${escHtml(c.name)}</td><td class="right" style="color:#c2410c">${money(c.amount)}</td></tr>`).join("")}
  </tbody>
</table>` : "";

    // ── Gastos detalle ──────────────────────────────────────────────────
    const expDetailHtml = expenses.length > 0 ? `
<h2 class="section-title" style="margin-top:20px">Detalle de Gastos</h2>
<table>
  <thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th class="right">Monto</th></tr></thead>
  <tbody>
    ${expenses.map((e) => `<tr>
      <td>${new Date(e.expense_date).toLocaleDateString("es-NI")}</td>
      <td>${escHtml(e.description || "—")}</td>
      <td>${escHtml(e.category || "—")}</td>
      <td class="right" style="color:#c2410c">${money(Number(e.amount))}</td>
    </tr>`).join("")}
  </tbody>
</table>` : "";

    // ── Salarios por empleado ───────────────────────────────────────────
    const salEmpHtml = salariesByEmployee.length > 0 ? `
<h2 class="section-title" style="margin-top:20px">Salarios por Empleado</h2>
<table>
  <thead><tr><th>Empleado</th><th class="right">Pagos</th><th class="right">Total</th></tr></thead>
  <tbody>
    ${salariesByEmployee.map((emp) => `<tr>
      <td>${escHtml(emp.name)}</td>
      <td class="right">${emp.count}</td>
      <td class="right" style="color:#7e22ce">${money(emp.amount)}</td>
    </tr>`).join("")}
  </tbody>
</table>` : "";

    // ── Salarios detalle ────────────────────────────────────────────────
    const salDetailHtml = salaryPayments.length > 0 ? `
<h2 class="section-title" style="margin-top:20px">Detalle de Salarios</h2>
<table>
  <thead><tr><th>Empleado</th><th>Período</th><th class="right">Horas</th><th class="right">Monto</th></tr></thead>
  <tbody>
    ${salaryPayments.map((p) => {
      const name = p.employees
        ? `${p.employees.first_name || ""} ${p.employees.last_name || ""}`.trim()
        : p.employee_id;
      return `<tr>
        <td>${escHtml(name || "—")}</td>
        <td>${escHtml(`${p.period_start || ""} → ${p.period_end || ""}`)}</td>
        <td class="right">${p.hours_worked ? `${Number(p.hours_worked).toFixed(1)}h` : "—"}</td>
        <td class="right" style="color:#7e22ce">${money(Number(p.amount))}</td>
      </tr>`;
    }).join("")}
  </tbody>
</table>` : "";

    const bodyHtml = `
<div class="report-header">
  <h1>Bilan Financiero</h1>
  <div class="meta" style="text-transform:capitalize">${escHtml(periodLabel)} &nbsp;·&nbsp; ${printedAt}</div>
</div>
${kpiHtml}
${estadoHtml}
${catHtml}
${expDetailHtml}
${salEmpHtml}
${salDetailHtml}
<div class="report-footer">${printedAt}</div>
`;

    openPrintWindow(
      buildPrintDocument(bodyHtml, {
        title: `Bilan Financiero — ${periodLabel}`,
        layout: "a4",
        extraStyles: `
          .section-title { font-size:13px; font-weight:700; color:#0f172a; margin:16px 0 6px; border-bottom:1px solid #e2e8f0; padding-bottom:4px; }
          .subtotal td { border-top:1px solid #cbd5e1; }
          .total td { border-top:2px solid #94a3b8; font-size:15px; }
        `,
      })
    );
  };

  return (
    <Container className="space-y-6">
      <DashboardHeader
        pageType="reports"
        title="Bilan Financiero"
        subtitle="Ventas · Gastos · Salarios · Ganancia neta del período"
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrintBilan}
          disabled={loading}
          title="Imprimer le bilan"
        >
          🖨 Imprimer
        </Button>
      </DashboardHeader>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Period selector */}
      <Section>
        <div className="space-y-4">
          <ButtonGroup
            options={[
              { id: "week", label: "Semana", color: "blue" },
              { id: "month", label: "Mes", color: "blue" },
              { id: "year", label: "Año", color: "blue" },
            ]}
            value={periodType}
            onChange={(v) => setPeriodType(v as PeriodType)}
            size="md"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-4 py-2 bg-slate-50 rounded-lg font-semibold text-slate-700 min-w-48 text-center capitalize">
                {periodLabel}
              </div>
              <button
                onClick={() => navigate(1)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <Button onClick={fetchAll} disabled={loading}>
              {loading ? "Cargando..." : "Actualizar"}
            </Button>
          </div>
        </div>
      </Section>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-green-50 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-xs text-green-700 font-semibold">Ganancias Brutas</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{fmt(salesSummary.grossProfit)}</p>
          <p className="text-xs text-green-600 mt-1">{salesSummary.txCount} ventas · {fmt(salesSummary.revenue)} ingresos</p>
          {(salesSummary.refundCount ?? 0) > 0 && (
            <p className="text-xs text-red-600 mt-0.5">
              {salesSummary.refundCount} remboursement{(salesSummary.refundCount ?? 0) > 1 ? "s" : ""} : -{fmt(salesSummary.refundTotal ?? 0)}
            </p>
          )}
        </Card>

        <Card className="p-4 bg-orange-50 border border-orange-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-orange-600" />
            <p className="text-xs text-orange-700 font-semibold">Gastos</p>
          </div>
          <p className="text-2xl font-bold text-orange-700">{fmt(totalExpenses)}</p>
          <p className="text-xs text-orange-600 mt-1">{expenses.length} entrada{expenses.length !== 1 ? "s" : ""}</p>
        </Card>

        <Card className="p-4 bg-purple-50 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple-600" />
            <p className="text-xs text-purple-700 font-semibold">Salarios</p>
          </div>
          <p className="text-2xl font-bold text-purple-700">{fmt(totalSalaries)}</p>
          <p className="text-xs text-purple-600 mt-1">{salaryPayments.length} pago{salaryPayments.length !== 1 ? "s" : ""}</p>
        </Card>

        <Card className={`p-4 border ${netProfit >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className={`w-4 h-4 ${netProfit >= 0 ? "text-blue-600" : "text-red-600"}`} />
            <p className={`text-xs font-semibold ${netProfit >= 0 ? "text-blue-700" : "text-red-700"}`}>Ganancia Neta</p>
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-blue-700" : "text-red-700"}`}>{fmt(netProfit)}</p>
          <p className={`text-xs mt-1 ${netProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
            {salesSummary.revenue > 0
              ? `Margen: ${((netProfit / salesSummary.revenue) * 100).toFixed(1)}%`
              : "Sin ventas"}
          </p>
        </Card>
      </div>

      {/* Visual breakdown bar */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Desglose visual</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-green-700">Ganancia Bruta</span>
              <span className="font-semibold text-green-700">{fmt(salesSummary.grossProfit)}</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${pct(salesSummary.grossProfit)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-orange-700">Gastos</span>
              <span className="font-semibold text-orange-700">− {fmt(totalExpenses)}</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full transition-all"
                style={{ width: `${pct(totalExpenses)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-purple-700">Salarios</span>
              <span className="font-semibold text-purple-700">− {fmt(totalSalaries)}</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400 rounded-full transition-all"
                style={{ width: `${pct(totalSalaries)}%` }}
              />
            </div>
          </div>
          <div className="border-t border-slate-200 pt-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-bold text-slate-900">Ganancia Neta</span>
              <span className={`font-bold ${netProfit >= 0 ? "text-blue-700" : "text-red-700"}`}>{fmt(netProfit)}</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${netProfit >= 0 ? "bg-blue-500" : "bg-red-500"}`}
                style={{ width: `${pct(netProfit)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Detail tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {(
          [
            { id: "resumen", label: "Resumen" },
            { id: "gastos", label: `Gastos (${expenses.length})` },
            { id: "salarios", label: `Salarios (${salaryPayments.length})` },
          ] as { id: TabType; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Section>
        {/* RESUMEN */}
        {activeTab === "resumen" && (
          <div className="space-y-6">
            {/* Income statement */}
            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Estado de Resultados</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Ingresos por ventas</span>
                  <span className="font-semibold text-slate-900">{fmt(salesSummary.revenue)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Costo de productos vendidos</span>
                  <span className="font-semibold text-red-600">− {fmt(salesSummary.cogs)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200 font-semibold">
                  <span className="text-green-700">Ganancia Bruta</span>
                  <span className="text-green-700">{fmt(salesSummary.grossProfit)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Gastos operacionales</span>
                  <span className="font-semibold text-orange-600">− {fmt(totalExpenses)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Salarios</span>
                  <span className="font-semibold text-purple-600">− {fmt(totalSalaries)}</span>
                </div>
                <div className={`flex justify-between py-2 font-bold text-base ${netProfit >= 0 ? "text-blue-700" : "text-red-700"}`}>
                  <span>GANANCIA NETA</span>
                  <span>{fmt(netProfit)}</span>
                </div>
              </div>
            </Card>

            {/* Expenses by category */}
            {expensesByCategory.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Gastos por Categoría</h3>
                <div className="space-y-2">
                  {expensesByCategory.map((cat) => (
                    <div key={cat.name} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-700">{cat.name}</span>
                      <span className="text-sm font-semibold text-orange-700">{fmt(cat.amount)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Salaries by employee */}
            {salariesByEmployee.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Salarios por Empleado</h3>
                <div className="space-y-2">
                  {salariesByEmployee.map((emp) => (
                    <div key={emp.name} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-700">{emp.name}</span>
                      <span className="text-sm font-semibold text-purple-700">{fmt(emp.amount)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* GASTOS */}
        {activeTab === "gastos" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <p className="text-xs text-slate-500 font-semibold">Total Gastos</p>
                <p className="text-xl font-bold mt-1 text-orange-700">{fmt(totalExpenses)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-500 font-semibold">Categorías</p>
                <p className="text-xl font-bold mt-1">{expensesByCategory.length}</p>
              </Card>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Descripción</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 hidden sm:table-cell">Categoría</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No hay gastos en este período</td></tr>
                  ) : (
                    expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                          {new Date(e.expense_date).toLocaleDateString("es-NI")}
                        </td>
                        <td className="px-4 py-2 text-slate-700">{e.description || "—"}</td>
                        <td className="px-4 py-2 text-slate-500 hidden sm:table-cell">{e.category || "—"}</td>
                        <td className="px-4 py-2 text-right font-semibold text-orange-700">{fmt(Number(e.amount))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SALARIOS */}
        {activeTab === "salarios" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <p className="text-xs text-slate-500 font-semibold">Total Salarios</p>
                <p className="text-xl font-bold mt-1 text-purple-700">{fmt(totalSalaries)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-500 font-semibold">Empleados pagados</p>
                <p className="text-xl font-bold mt-1">{salariesByEmployee.length}</p>
              </Card>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Empleado</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 hidden sm:table-cell">Período</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 hidden sm:table-cell">Horas</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salaryPayments.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No hay salarios pagados en este período</td></tr>
                  ) : (
                    salaryPayments.map((p) => {
                      const name = p.employees
                        ? `${p.employees.first_name || ""} ${p.employees.last_name || ""}`.trim()
                        : p.employee_id;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-900">{name || "—"}</td>
                          <td className="px-4 py-2 text-slate-500 hidden sm:table-cell text-xs">
                            {p.period_start} → {p.period_end}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-500 hidden sm:table-cell">
                            {p.hours_worked ? `${Number(p.hours_worked).toFixed(1)}h` : "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-purple-700">{fmt(Number(p.amount))}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>
    </Container>
  );
}
