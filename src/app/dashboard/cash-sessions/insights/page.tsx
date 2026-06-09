"use client";

import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, AlertTriangle, Shield, Package, Users } from "lucide-react";
import { Button, Card, Container, Section, Badge, Alert } from "@/components/StripeUIComponents";
import { DashboardHeader } from "@/components";
import {
  MOCK_RISK_SCORES,
  MOCK_TOP_VARIANCE_PRODUCTS,
  fmtNio,
} from "../_mockData";

export default function CashSessionInsightsPage() {
  const sortedRisk = [...MOCK_RISK_SCORES].sort((a, b) => b.riskScore - a.riskScore);
  const totalNegative = MOCK_RISK_SCORES.reduce((sum, e) => sum + e.totalNegativeVariance, 0);
  const totalSessions = MOCK_RISK_SCORES.reduce((sum, e) => sum + e.totalSessions, 0);
  const totalRecounts = MOCK_RISK_SCORES.reduce((sum, e) => sum + e.totalRecounts, 0);

  return (
    <Container>
      <Section>
        <div className="mb-2">
          <Link href="/dashboard/cash-sessions" className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Retour aux sessions
          </Link>
        </div>

        <DashboardHeader
          pageType="reports"
          title="Insights · Sessions de caisse"
          subtitle="30 derniers jours · détection des comportements à risque"
        />

        {/* Top KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <KpiTile
            icon={<Users className="w-5 h-5" />}
            label="Sessions"
            value={totalSessions.toString()}
            sub="ce mois"
            color="slate"
          />
          <KpiTile
            icon={<TrendingDown className="w-5 h-5" />}
            label="Écart cumulé"
            value={`−${fmtNio(totalNegative)}`}
            sub="déficit total"
            color="red"
          />
          <KpiTile
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Recomptages"
            value={totalRecounts.toString()}
            sub="événements"
            color="amber"
          />
          <KpiTile
            icon={<Shield className="w-5 h-5" />}
            label="Sessions saines"
            value={`${Math.round((1 - sortedRisk[0].varianceRatio) * 100)}%`}
            sub="moyenne équipe"
            color="emerald"
          />
        </div>

        {/* Employees to watch */}
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Employés à surveiller
        </h3>
        <div className="space-y-3 mb-8">
          {sortedRisk.map((emp) => (
            <EmployeeRiskRow key={emp.employeeId} emp={emp} />
          ))}
        </div>

        {/* Products with most variance */}
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Produits les plus en écart
        </h3>
        <Card className="mb-8 overflow-hidden">
          <div className="-mx-6 -my-6">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-2 text-left text-xs font-semibold text-slate-700">Produit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Manquants</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Valeur</th>
                  <th className="px-6 py-2 text-left text-xs font-semibold text-slate-700">Visualisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_TOP_VARIANCE_PRODUCTS.map((p, i) => {
                  const max = MOCK_TOP_VARIANCE_PRODUCTS[0].totalValue;
                  const pct = (p.totalValue / max) * 100;
                  return (
                    <tr key={p.productId} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 w-4">{i + 1}.</span>
                          <span className="font-medium text-slate-900">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-700">−{p.missingQty}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-bold text-red-700">{fmtNio(p.totalValue)}</td>
                      <td className="px-6 py-3">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Trend chart placeholder */}
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Évolution des écarts cumulés
        </h3>
        <Card className="mb-8">
          <SimpleTrendChart />
        </Card>

        <Alert variant="info" title="Comment lire ces insights ?">
          Le <strong>score de risque</strong> combine fréquence de recomptage, ratio écart négatif/positif, voids POS et taille des écarts.
          Au-delà de 70, une investigation est recommandée. Tendance ↑ = aggravation sur les 30 derniers jours.
        </Alert>
      </Section>
    </Container>
  );
}

// ─── Employee risk row ────────────────────────────────────────────────────
function EmployeeRiskRow({ emp }: { emp: typeof MOCK_RISK_SCORES[0] }) {
  const initials = emp.employeeName.split(" ").map((n) => n[0]).slice(0, 2).join("");
  const riskColor = emp.riskScore >= 70 ? "red" : emp.riskScore >= 40 ? "amber" : emp.riskScore >= 20 ? "blue" : "emerald";
  const colors = {
    red:     { bg: "bg-red-100",     text: "text-red-700",     border: "border-red-200",     fill: "from-red-500 to-red-600" },
    amber:   { bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-200",   fill: "from-amber-500 to-amber-600" },
    blue:    { bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-200",    fill: "from-blue-500 to-blue-600" },
    emerald: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", fill: "from-emerald-500 to-emerald-600" },
  }[riskColor];

  const TrendIcon = emp.trend === "UP" ? TrendingUp : emp.trend === "DOWN" ? TrendingDown : Minus;
  const trendColor = emp.trend === "UP" ? "text-red-600" : emp.trend === "DOWN" ? "text-emerald-600" : "text-slate-400";

  return (
    <Card className={`border ${colors.border}`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-3 lg:w-64 flex-shrink-0">
          <div className={`w-12 h-12 rounded-full ${colors.bg} ${colors.text} font-bold flex items-center justify-center text-base`}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{emp.employeeName}</p>
            <p className="text-xs text-slate-500">{emp.totalSessions} sessions</p>
          </div>
        </div>

        {/* Risk score gauge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Score de risque</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-lg font-bold ${colors.text}`}>{emp.riskScore}</span>
              <span className="text-xs text-slate-400">/ 100</span>
              <TrendIcon className={`w-4 h-4 ${trendColor}`} />
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${colors.fill} rounded-full transition-all`}
              style={{ width: `${emp.riskScore}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 text-xs lg:w-96 flex-shrink-0">
          <Stat label="Recomptages" value={emp.totalRecounts.toString()} />
          <Stat label="Précision" value={`${emp.precision}%`} variant={emp.precision >= 90 ? "ok" : emp.precision >= 70 ? "warn" : "danger"} />
          <Stat label="Déficit" value={`−${fmtNio(emp.totalNegativeVariance)}`} variant={emp.totalNegativeVariance > 500 ? "danger" : "warn"} />
          <Stat label="Voids POS" value={emp.voidsCount.toString()} variant={emp.voidsCount > 5 ? "danger" : "default"} />
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value, variant = "default" }: { label: string; value: string; variant?: "default" | "ok" | "warn" | "danger" }) {
  const color = {
    default: "text-slate-700",
    ok: "text-emerald-700",
    warn: "text-amber-700",
    danger: "text-red-700",
  }[variant];
  return (
    <div>
      <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{label}</p>
      <p className={`font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function KpiTile({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  color: "slate" | "blue" | "emerald" | "amber" | "red";
}) {
  const colors = {
    slate:   { bg: "bg-slate-50",   icon: "text-slate-600",   value: "text-slate-900" },
    blue:    { bg: "bg-blue-50",    icon: "text-blue-600",    value: "text-blue-900" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", value: "text-emerald-900" },
    amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   value: "text-amber-900" },
    red:     { bg: "bg-red-50",     icon: "text-red-600",     value: "text-red-900" },
  }[color];
  return (
    <Card className={colors.bg}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center ${colors.icon}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
          <p className={`text-lg font-bold ${colors.value}`}>{value}</p>
          <p className="text-xs text-slate-500">{sub}</p>
        </div>
      </div>
    </Card>
  );
}

// ─── Mock SVG trend chart ─────────────────────────────────────────────────
function SimpleTrendChart() {
  // 30 days mock data — total negative variance per day (cumulative going up)
  const data = [
    0, 0, 50, 50, 100, 150, 150, 200, 280, 320, 320, 400, 480, 540,
    580, 650, 720, 800, 880, 950, 1100, 1250, 1380, 1500, 1700, 1900, 2050, 2200, 2300, 2340,
  ];
  const max = Math.max(...data);
  const w = 800;
  const h = 200;
  const padding = 30;
  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (w - padding * 2);
    const y = h - padding - (v / max) * (h - padding * 2);
    return `${x},${y}`;
  });
  const path = `M ${points.join(" L ")}`;
  const areaPath = `${path} L ${padding + (w - padding * 2)},${h - padding} L ${padding},${h - padding} Z`;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={padding}
            x2={w - padding}
            y1={padding + p * (h - padding * 2)}
            y2={padding + p * (h - padding * 2)}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}
        {/* Area */}
        <path d={areaPath} fill="url(#redGradient)" opacity="0.2" />
        {/* Line */}
        <path d={path} fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Last point */}
        <circle
          cx={padding + (w - padding * 2)}
          cy={h - padding - (data[data.length - 1] / max) * (h - padding * 2)}
          r="5"
          fill="#dc2626"
        />
        <text
          x={w - padding}
          y={h - padding - (data[data.length - 1] / max) * (h - padding * 2) - 12}
          textAnchor="end"
          fontSize="12"
          fill="#dc2626"
          fontWeight="bold"
        >
          C$ {data[data.length - 1]}
        </text>
        {/* Axis labels */}
        <text x={padding} y={h - 8} fontSize="10" fill="#94a3b8">Jour 1</text>
        <text x={w - padding} y={h - 8} fontSize="10" fill="#94a3b8" textAnchor="end">Aujourd'hui</text>
        <defs>
          <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
