"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, Lock, ShoppingCart, AlertTriangle, CheckCircle2, Users,
  RotateCw, Eye, EyeOff, Shield,
} from "lucide-react";
import { Button, Card, Container, Section, Badge, Alert } from "@/components/StripeUIComponents";
import { DashboardHeader } from "@/components";
import { useTenantId } from "@/lib/utils/tenant";
import {
  type ApiCashSession,
  empName, empInitials,
  calcCashVariance, calcMissingItemsValue, calcItemVariance, calcReconciliationSuggestion,
  fmtNio, fmtTime, fmtDate, fmtDuration,
} from "../_apiTypes";

export default function CashSessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tenantId = useTenantId();
  const [session, setSession] = useState<ApiCashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"admin" | "employee">("admin");
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId || !params.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/cash-sessions/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, params.id]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async () => {
    if (!tenantId || !session) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/cash-sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: !session.resolved }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
      }
    } finally {
      setResolving(false);
    }
  };

  if (loading) return (
    <Container><Section>
      <p className="text-slate-500">Chargement…</p>
    </Section></Container>
  );

  if (!session) return (
    <Container><Section>
      <Alert variant="error" title="Session introuvable">La session demandée n'existe pas.</Alert>
      <div className="mt-4"><Link href="/dashboard/cash-sessions"><Button variant="secondary">Retour</Button></Link></div>
    </Section></Container>
  );

  return (
    <Container>
      <Section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <Link href="/dashboard/cash-sessions" className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />Retour aux sessions
          </Link>
          {session.status === "CLOSED" && (
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button onClick={() => setViewMode("admin")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${viewMode === "admin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>
                <Shield className="w-3 h-3" />Vue admin
              </button>
              <button onClick={() => setViewMode("employee")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${viewMode === "employee" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>
                <EyeOff className="w-3 h-3" />Vue employé
              </button>
            </div>
          )}
        </div>

        {session.status === "OPEN" ? (
          <OpenSessionView session={session} />
        ) : viewMode === "admin" ? (
          <AdminClosedView session={session} onResolve={handleResolve} resolving={resolving} />
        ) : (
          <EmployeeClosedView session={session} />
        )}
      </Section>
    </Container>
  );
}

// ─── Open session view ────────────────────────────────────────────────────
function OpenSessionView({ session }: { session: ApiCashSession }) {
  const router = useRouter();
  const sessionEmployees = session.cash_session_employees ?? [];

  return (
    <>
      <DashboardHeader pageType="cierre" title={`${session.name} · En cours`}
        subtitle={`Ouverte à ${fmtTime(session.opened_at)} par ${empName(session.opened_by)}`}>
        <Badge variant="success">EN COURS</Badge>
      </DashboardHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={<Lock className="w-5 h-5" />} label="Fond de caisse" value={fmtNio(session.opening_cash)} color="slate" />
        <KpiCard icon={<ShoppingCart className="w-5 h-5" />} label="Ventes du quart" value={fmtNio(session.total_sales)} sub={`${session.tx_count} tx`} color="emerald" />
        <KpiCard icon={<Users className="w-5 h-5" />} label="Employés actifs" value={`${sessionEmployees.length}`} sub={sessionEmployees.map((e) => empInitials(e.employees)).join(" · ")} color="blue" />
        <KpiCard icon={<AlertTriangle className="w-5 h-5" />} label="À recompter" value={`${(session.cash_session_counts ?? []).length}`} sub="items en fermeture" color="amber" />
      </div>

      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Que voulez-vous faire ?</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/dashboard/pos")}>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <ShoppingCart className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="font-bold text-slate-900 mb-1">Aller au POS</p>
            <p className="text-xs text-slate-500">Continuer à vendre</p>
          </div>
        </Card>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/cash-sessions/${session.id}/close`)}>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-3">
              <Lock className="w-7 h-7 text-amber-600" />
            </div>
            <p className="font-bold text-slate-900 mb-1">Fermer la session</p>
            <p className="text-xs text-slate-500">Comptage + réconciliation</p>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Équipe du quart</h3>
        <div className="flex flex-wrap gap-2">
          {sessionEmployees.map((se) => (
            <div key={se.employee_id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-full pl-1 pr-3 py-1">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                {empInitials(se.employees)}
              </div>
              <span className="text-sm font-medium text-slate-700">{empName(se.employees)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Admin closed view — full numbers ────────────────────────────────────
function AdminClosedView({ session, onResolve, resolving }: { session: ApiCashSession; onResolve: () => void; resolving: boolean }) {
  const counts = session.cash_session_counts ?? [];
  const cashVar = calcCashVariance(session);
  const missingValue = calcMissingItemsValue(counts);
  const expectedCash = session.opening_cash + session.cash_sales;
  const suggestion = calcReconciliationSuggestion(session);
  const hasAnomalies = Math.abs(cashVar) > 10 || missingValue > 10;

  return (
    <>
      <DashboardHeader pageType="cierre"
        title={`${session.name} · ${fmtDate(session.opened_at)}`}
        subtitle={`Ouverte par ${empName(session.opened_by)} → Fermée par ${empName(session.closed_by)}`}>
        {hasAnomalies ? <Badge variant="warning">À examiner</Badge> : <Badge variant="success">Conforme</Badge>}
        {session.resolved && <Badge variant="default">Résolue</Badge>}
      </DashboardHeader>

      <div className="mb-4 text-xs text-slate-500 flex flex-wrap gap-4">
        <span>Ouverte: <strong className="text-slate-700">{fmtTime(session.opened_at)}</strong></span>
        <span>Fermée: <strong className="text-slate-700">{fmtTime(session.closed_at!)}</strong></span>
        <span>Durée: <strong className="text-slate-700">{fmtDuration(session.opened_at, session.closed_at!)}</strong></span>
        <span>{session.tx_count} ventes · {fmtNio(session.total_sales)}</span>
      </div>

      {suggestion && (
        <Alert variant={suggestion.type === "danger" ? "error" : suggestion.type === "info" ? "info" : suggestion.type}
          title="Analyse intelligente" className="mb-6">{suggestion.message}</Alert>
      )}

      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">💰 Réconciliation caisse</h3>
      <Card className="mb-6">
        <div className="space-y-2">
          <ReconRow label="Fond initial" value={fmtNio(session.opening_cash)} />
          <ReconRow label="+ Ventes CASH" value={fmtNio(session.cash_sales)} />
          <div className="border-t border-slate-200 my-2" />
          <ReconRow label="= Cash attendu" value={fmtNio(expectedCash)} bold />
          <ReconRow label="Cash compté" value={fmtNio(session.closing_cash!)} bold />
          <div className="border-t border-slate-200 my-2" />
          <ReconRow label="ÉCART"
            value={cashVar === 0 ? "0 C$" : (cashVar > 0 ? `+${fmtNio(cashVar)}` : `−${fmtNio(Math.abs(cashVar))}`)}
            highlight={cashVar > 0 ? "warn" : cashVar < 0 ? "danger" : "ok"}
            note={cashVar > 0 ? "(surplus)" : cashVar < 0 ? "(déficit)" : "(équilibré)"} />
        </div>
      </Card>

      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">📦 Réconciliation stock · {counts.length} items</h3>
      <Card className="mb-6 overflow-hidden">
        <div className="overflow-x-auto -mx-6 -my-6">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Item</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-slate-700">Ouv.</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-slate-700">Vendu</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-slate-700">Att.</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-slate-700">Compté</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Écart</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700"><RotateCw className="w-3 h-3 inline mr-1" />Recompte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {counts.map((c) => {
                const expected = (c.opening_qty ?? 0) - c.sold_qty;
                const variance = calcItemVariance(c);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <p className="font-medium text-slate-900">{c.product_name}</p>
                      <p className="text-xs text-slate-500">{fmtNio(c.unit_price)}</p>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-700">{c.opening_qty ?? "—"}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-700">{c.sold_qty}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-700">{expected}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-900 font-medium">{c.closing_qty ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {variance === 0 ? <span className="text-emerald-600 font-semibold">0 ✓</span>
                        : variance < 0 ? <span className="text-red-600 font-semibold">{variance} ⚠</span>
                        : <span className="text-amber-600 font-semibold">+{variance}</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {c.recount_attempts === 0 ? <span className="text-slate-300">—</span> : (
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${c.recount_attempts >= 3 ? "bg-red-100 text-red-700" : c.recount_attempts === 2 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                          ×{c.recount_attempts}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">💡 Analyse</h3>
      <Card className="mb-6">
        <div className="space-y-2">
          <ReconRow label="Items manquants × prix vente" value={fmtNio(missingValue)} />
          <ReconRow label="Surplus / déficit caisse" value={cashVar >= 0 ? `+${fmtNio(cashVar)}` : `−${fmtNio(Math.abs(cashVar))}`} />
          <div className="border-t border-slate-200 my-2" />
          <ReconRow label="Différence inexpliquée" value={fmtNio(Math.abs(Math.abs(cashVar) - missingValue))} />
        </div>
      </Card>

      {session.notes && (
        <>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">📝 Note</h3>
          <Card className="mb-6">
            <p className="text-sm text-slate-700">"{session.notes}"</p>
          </Card>
        </>
      )}

      <div className="flex justify-end">
        <Button variant={session.resolved ? "secondary" : "primary"} onClick={onResolve} disabled={resolving}>
          {resolving ? "Mise à jour…" : session.resolved ? "Marquer non résolue" : "Marquer comme résolue ✓"}
        </Button>
      </div>
    </>
  );
}

// ─── Employee closed view — no numbers ───────────────────────────────────
function EmployeeClosedView({ session }: { session: ApiCashSession }) {
  const counts = session.cash_session_counts ?? [];
  const cashVar = calcCashVariance(session);
  const cashOk = Math.abs(cashVar) < 10;
  const itemsWithVariance = counts.filter((c) => calcItemVariance(c) !== 0);

  return (
    <>
      <DashboardHeader pageType="cierre" title={`${session.name} · ${fmtDate(session.opened_at)}`}
        subtitle={`Statut: Fermée à ${fmtTime(session.closed_at!)}`}>
        {cashOk && itemsWithVariance.length === 0 ? <Badge variant="success">Conforme</Badge> : <Badge variant="warning">Écarts détectés</Badge>}
      </DashboardHeader>

      <div className="mb-6 text-sm text-slate-600">
        Ouverte par <strong>{empName(session.opened_by)}</strong> · Fermée par <strong>{empName(session.closed_by)}</strong>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${cashOk ? "bg-emerald-100" : "bg-amber-100"}`}>
              {cashOk ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Caisse</p>
              <p className="font-bold text-slate-900">{cashOk ? "Équilibrée" : "Écart détecté"}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${itemsWithVariance.length === 0 ? "bg-emerald-100" : "bg-amber-100"}`}>
              {itemsWithVariance.length === 0 ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Stock</p>
              <p className="font-bold text-slate-900">
                {itemsWithVariance.length === 0 ? `${counts.length} items conformes` : `${itemsWithVariance.length} écart(s) sur ${counts.length}`}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Items</h3>
      <Card className="mb-6 overflow-hidden">
        <div className="divide-y divide-slate-100 -mx-6 -my-6">
          {counts.map((c) => {
            const variance = calcItemVariance(c);
            const ok = variance === 0;
            return (
              <div key={c.id} className="flex items-center gap-3 px-6 py-3">
                {ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{c.product_name}</p>
                </div>
                <span className={`text-xs font-semibold ${ok ? "text-emerald-700" : "text-amber-700"}`}>{ok ? "Conforme" : "Écart"}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Alert variant="info" title="Information">
        L'admin a été notifié et examinera les écarts.
      </Alert>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color = "slate" }: {
  icon?: React.ReactNode; label: string; value: string; sub?: string;
  color?: "slate" | "blue" | "emerald" | "amber" | "red";
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
        {icon && <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-white flex items-center justify-center ${colors.icon}`}>{icon}</div>}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
          <p className={`text-lg font-bold ${colors.value}`}>{value}</p>
          {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

function ReconRow({ label, value, bold, highlight, note }: {
  label: string; value: string; bold?: boolean;
  highlight?: "ok" | "warn" | "danger"; note?: string;
}) {
  const valueColor = !highlight ? "text-slate-900"
    : highlight === "ok" ? "text-emerald-700"
    : highlight === "warn" ? "text-amber-700"
    : "text-red-700";
  return (
    <div className="flex justify-between items-baseline">
      <span className={`text-sm ${bold ? "font-bold text-slate-900" : "text-slate-600"}`}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-bold text-base" : "text-sm font-medium"} ${valueColor}`}>
        {value}{note && <span className="ml-1 text-xs text-slate-400 font-normal">{note}</span>}
      </span>
    </div>
  );
}
