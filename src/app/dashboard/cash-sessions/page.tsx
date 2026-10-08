"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Eye, RefreshCw, AlertTriangle, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import { Button, Card, Container, Section, Badge } from "@/components/StripeUIComponents";
import { SearchInput, DashboardHeader, EmptyState } from "@/components";
import { useTenantId } from "@/lib/utils/tenant";
import { toNicaraguaDateString } from "@/lib/utils/formatters";
import {
  type ApiCashSession,
  empName,
  empInitials,
  calcCashVariance,
  calcMissingItemsValue,
  fmtNio,
  fmtDate,
  fmtDuration,
} from "./_apiTypes";

export default function CashSessionsListPage() {
  const router = useRouter();
  const tenantId = useTenantId();
  const [sessions, setSessions] = useState<ApiCashSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/cash-sessions?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const opener = empName(s.opened_by).toLowerCase();
      const closer = empName(s.closed_by).toLowerCase();
      return s.name.toLowerCase().includes(q) || opener.includes(q) || closer.includes(q);
    });
  }, [sessions, search, statusFilter]);

  const openSessions = filtered.filter((s) => s.status === "OPEN");
  const todayNi = toNicaraguaDateString(new Date());
  const closedToday = filtered.filter((s) => {
    if (s.status !== "CLOSED" || !s.closed_at) return false;
    return toNicaraguaDateString(new Date(s.closed_at)) === todayNi;
  });
  const closedRest = filtered.filter((s) => {
    if (s.status !== "CLOSED" || !s.closed_at) return false;
    return toNicaraguaDateString(new Date(s.closed_at)) !== todayNi;
  });

  return (
    <Container>
      <Section>
        <DashboardHeader
          pageType="cierre"
          title="Sessions de caisse"
          subtitle="Ouvertures et fermetures de magasin avec réconciliation stock + cash"
        >
          <Button variant="secondary" size="md" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Link href="/dashboard/cash-sessions/insights">
            <Button variant="secondary" size="md">
              <BarChart3 className="w-4 h-4 mr-2" />
              Insights
            </Button>
          </Link>
          <Button variant="primary" size="md" onClick={() => router.push("/dashboard/cash-sessions/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Ouvrir une session
          </Button>
        </DashboardHeader>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Rechercher par employé ou nom de quart…"
          />
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(["ALL", "OPEN", "CLOSED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                  statusFilter === s
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {s === "ALL" ? "Toutes" : s === "OPEN" ? "En cours" : "Fermées"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <EmptyState state="loading" message="Chargement des sessions…" />
        ) : filtered.length === 0 ? (
          <EmptyState state="empty" message="Aucune session pour ce filtre." />
        ) : (
          <div className="space-y-6">
            {openSessions.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  En cours
                </h3>
                <div className="space-y-3">
                  {openSessions.map((s) => <SessionCard key={s.id} session={s} />)}
                </div>
              </div>
            )}
            {closedToday.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Aujourd'hui</h3>
                <div className="space-y-3">
                  {closedToday.map((s) => <SessionCard key={s.id} session={s} />)}
                </div>
              </div>
            )}
            {closedRest.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Précédentes</h3>
                <div className="space-y-3">
                  {closedRest.map((s) => <SessionCard key={s.id} session={s} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </Section>
    </Container>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────
function SessionCard({ session }: { session: ApiCashSession }) {
  const isOpen = session.status === "OPEN";
  const cashVar = calcCashVariance(session);
  const missingValue = calcMissingItemsValue(session.cash_session_counts ?? []);
  const hasAnomalies = !isOpen && (Math.abs(cashVar) > 10 || missingValue > 10);
  const itemsToCount = (session.cash_session_counts ?? []).length;
  const openerInitials = empInitials(session.opened_by);
  const openerFullName = empName(session.opened_by);
  const closerInitials = empInitials(session.closed_by);
  const closerFullName = empName(session.closed_by);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Status indicator */}
        <div className="flex-shrink-0 flex items-center gap-3">
          {isOpen ? (
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-emerald-600" />
            </div>
          ) : hasAnomalies ? (
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
          )}
          <div className="lg:hidden">
            <p className="font-bold text-slate-900">{session.name}</p>
            <p className="text-xs text-slate-500">{fmtDate(session.opened_at)}</p>
          </div>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="hidden lg:flex items-center gap-3 mb-1">
            <p className="font-bold text-slate-900">{session.name}</p>
            <span className="text-xs text-slate-400">·</span>
            <p className="text-sm text-slate-600">{fmtDate(session.opened_at)}</p>
            {isOpen && <Badge variant="success">EN COURS</Badge>}
            {!isOpen && session.resolved && <Badge variant="default">Résolue</Badge>}
            {!isOpen && hasAnomalies && !session.resolved && <Badge variant="warning">À examiner</Badge>}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Ouvert par</span>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                {openerInitials}
              </span>
              <span className="font-medium text-slate-700">{openerFullName}</span>
            </span>
            {!isOpen && session.closed_by && session.closed_by_id !== session.opened_by_id && (
              <span className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">→ fermé par</span>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                  {closerInitials}
                </span>
                <span className="font-medium text-slate-700">{closerFullName}</span>
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            {isOpen ? (
              <>
                <Stat label="Fond" value={fmtNio(session.opening_cash)} />
                <Stat label="Ventes" value={fmtNio(session.total_sales)} sub={`${session.tx_count} tx`} />
                <Stat label="À recompter" value={`${itemsToCount} items`} />
              </>
            ) : (
              <>
                <Stat label="Durée" value={fmtDuration(session.opened_at, session.closed_at!)} />
                <Stat label="Ventes" value={fmtNio(session.total_sales)} sub={`${session.tx_count} tx`} />
                <Stat
                  label="Caisse"
                  value={Math.abs(cashVar) < 1 ? "✓ équilibrée" : (cashVar > 0 ? `+${fmtNio(cashVar)}` : `−${fmtNio(Math.abs(cashVar))}`)}
                  variant={Math.abs(cashVar) < 10 ? "ok" : cashVar > 0 ? "warn" : "danger"}
                />
                <Stat
                  label="Stock"
                  value={missingValue > 0 ? `${fmtNio(missingValue)} manquants` : "✓ conforme"}
                  variant={missingValue > 10 ? "warn" : "ok"}
                />
              </>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          {isOpen ? (
            <Link href={`/dashboard/cash-sessions/${session.id}`}>
              <Button variant="primary" size="md" className="w-full lg:w-auto">Continuer / Fermer</Button>
            </Link>
          ) : (
            <Link href={`/dashboard/cash-sessions/${session.id}`}>
              <Button variant="secondary" size="md" className="w-full lg:w-auto">
                <Eye className="w-4 h-4 mr-2" />Voir détails
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value, sub, variant = "default" }: { label: string; value: string; sub?: string; variant?: "default" | "ok" | "warn" | "danger" }) {
  const valueColor = {
    default: "text-slate-900",
    ok: "text-emerald-700",
    warn: "text-amber-700",
    danger: "text-red-700",
  }[variant];
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-slate-400">{label}:</span>
      <span className={`font-semibold ${valueColor}`}>{value}</span>
      {sub && <span className="text-slate-400">({sub})</span>}
    </div>
  );
}
