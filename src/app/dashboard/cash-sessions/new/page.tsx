"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button, Card, Container, Section, Alert } from "@/components/StripeUIComponents";
import { DashboardHeader } from "@/components";
import { useTenantId } from "@/lib/utils/tenant";
import { type ApiCashSession, type ApiEmployee, type ApiProductVariant, type ApiTrackedProduct, fmtNio, empInitials, empName } from "../_apiTypes";

export default function NewCashSessionPage() {
  const router = useRouter();
  const tenantId = useTenantId();

  // Remote data
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [products, setProducts] = useState<ApiTrackedProduct[]>([]);
  const [prevSession, setPrevSession] = useState<ApiCashSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [sessionName, setSessionName] = useState("");
  const nowIso = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const [openedAt, setOpenedAt] = useState<string>(() => nowIso());
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [openerId, setOpenerId] = useState<string>("");

  // Step 2
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [notes, setNotes] = useState("");

  // Step 3
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [carriedOver, setCarriedOver] = useState(false);

  // ── Load data ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;
    Promise.all([
      fetch(`/api/tenants/${tenantId}/employees?employees_only=true&status=ACTIVE`).then((r) => r.json()),
      fetch(`/api/tenants/${tenantId}/products/track-in-count`).then((r) => r.json()),
      fetch(`/api/tenants/${tenantId}/cash-sessions?status=CLOSED&limit=1`).then((r) => r.json()),
    ]).then(([empData, prodData, sessData]) => {
      // employees_only=true guarantees real employees table IDs (valid FK for opened_by_id)
      const emps: ApiEmployee[] = Array.isArray(empData) ? empData : [];
      setEmployees(emps);
      const tracked = (prodData.products ?? []).filter((p: ApiTrackedProduct) => p.track_in_count);
      setProducts(tracked);
      setPrevSession(sessData.sessions?.[0] ?? null);
      // Init counts keyed by "productId" or "productId:variantId" for variants
      const initCounts: Record<string, number> = {};
      tracked.forEach((p: ApiTrackedProduct) => {
        if (p.has_variants && p.product_variants?.length > 0) {
          p.product_variants.forEach((v) => { initCounts[`${p.id}:${v.id}`] = 0; });
        } else {
          initCounts[p.id] = 0;
        }
      });
      setCounts(initCounts);
    }).catch(console.error);
  }, [tenantId]);

  const tracked = products;

  const canCarryOver =
    !!prevSession &&
    !!openerId &&
    prevSession.closed_by_id === openerId;

  const displayName = sessionName.trim() || "Session";

  const productsByCategory = useMemo(() => {
    const grouped: Record<string, ApiTrackedProduct[]> = {};
    tracked.forEach((p) => {
      const cat = p.product_categories?.name ?? "Sans catégorie";
      grouped[cat] = grouped[cat] || [];
      grouped[cat].push(p);
    });
    return grouped;
  }, [tracked]);

  const handleCarryOver = () => {
    if (!prevSession) return;
    const map: Record<string, number> = {};
    (prevSession.cash_session_counts ?? []).forEach((c) => {
      const key = c.variant_id ? `${c.product_id}:${c.variant_id}` : c.product_id;
      map[key] = c.closing_qty ?? 0;
    });
    setCounts((prev) => ({ ...prev, ...map }));
    setOpeningCash(prevSession.closing_cash ?? 0);
    setCarriedOver(true);
  };

  const handleSubmit = async () => {
    if (!tenantId || !openerId) return;
    setSaving(true);
    setError(null);
    try {
      // Expand variant products into one count row per variant
      const countRows: object[] = [];
      tracked.forEach((p) => {
        if (p.has_variants && p.product_variants?.length > 0) {
          const sorted = [...p.product_variants].sort((a, b) => a.sort_order - b.sort_order);
          sorted.forEach((v) => {
            countRows.push({
              product_id: p.id,
              variant_id: v.id,
              product_name: `${p.name} — ${v.label}`,
              sku: v.sku,
              unit_price: v.price,
              opening_qty: counts[`${p.id}:${v.id}`] ?? 0,
            });
          });
        } else {
          countRows.push({
            product_id: p.id,
            product_name: p.name,
            sku: p.sku,
            unit_price: p.price,
            opening_qty: counts[p.id] ?? 0,
          });
        }
      });
      const res = await fetch(`/api/tenants/${tenantId}/cash-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          opening_cash: openingCash,
          opened_by_id: openerId,
          employee_ids: selectedEmployees,
          opening_method: carriedOver ? "CARRIED_OVER" : "COUNTED",
          previous_session_id: carriedOver ? prevSession?.id : null,
          notes,
          counts: countRows,
          ...(openedAt ? { opened_at: new Date(openedAt).toISOString() } : {}),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erreur lors de l'ouverture");
      }
      const data = await res.json();
      router.push(`/dashboard/cash-sessions/${data.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

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
          pageType="cierre"
          title="Ouvrir une session"
          subtitle={`${displayName} · Étape ${step}/3`}
        />

        {error && <Alert variant="error" title="Erreur">{error}</Alert>}

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors ${step >= n ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                {step > n ? <Check className="w-4 h-4" /> : n}
              </div>
              {n < 3 && <div className={`w-12 h-1 rounded-full ${step > n ? "bg-blue-600" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <Card className="max-w-3xl mx-auto">
          {step === 1 && (
            <Step1
              sessionName={sessionName} setSessionName={setSessionName}
              openedAt={openedAt} setOpenedAt={setOpenedAt}
              employees={employees}
              selectedEmployees={selectedEmployees} setSelectedEmployees={setSelectedEmployees}
              openerId={openerId} setOpenerId={setOpenerId}
            />
          )}
          {step === 2 && (
            <Step2 openingCash={openingCash} setOpeningCash={setOpeningCash} notes={notes} setNotes={setNotes} />
          )}
          {step === 3 && (
            <Step3
              counts={counts} setCounts={setCounts}
              productsByCategory={productsByCategory}
              canCarryOver={canCarryOver}
              carriedOver={carriedOver}
              onCarryOver={handleCarryOver}
              prevCloserName={prevSession ? empName(prevSession.closed_by) : undefined}
              prevCloseTime={prevSession?.closed_at}
            />
          )}

          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
            <Button
              variant="secondary" size="md"
              onClick={() => step > 1 ? setStep((step - 1) as 1 | 2 | 3) : router.push("/dashboard/cash-sessions")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />Retour
            </Button>
            {step < 3 ? (
              <Button
                variant="primary" size="md"
                onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                disabled={step === 1 && (selectedEmployees.length === 0 || !openerId)}
              >
                Continuer <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button variant="primary" size="md" onClick={handleSubmit} disabled={saving}>
                <Check className="w-4 h-4 mr-2" />
                {saving ? "Ouverture…" : "Ouvrir le magasin"}
              </Button>
            )}
          </div>
        </Card>
      </Section>
    </Container>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────
function Step1({ sessionName, setSessionName, openedAt, setOpenedAt, employees, selectedEmployees, setSelectedEmployees, openerId, setOpenerId }: {
  sessionName: string; setSessionName: (v: string) => void;
  openedAt: string; setOpenedAt: (v: string) => void;
  employees: ApiEmployee[];
  selectedEmployees: string[]; setSelectedEmployees: (v: string[]) => void;
  openerId: string; setOpenerId: (v: string) => void;
}) {
  const toggle = (id: string) => {
    const next = selectedEmployees.includes(id)
      ? selectedEmployees.filter((e) => e !== id)
      : [...selectedEmployees, id];
    setSelectedEmployees(next);
    // If only one selected, auto-set as opener
    if (next.length === 1) setOpenerId(next[0]);
    // If opener was deselected, clear
    if (!next.includes(openerId)) setOpenerId(next[0] ?? "");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Nom de la session</label>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="ex: Quart du matin, Événement spécial…"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Heure d&apos;ouverture</label>
          <input
            type="datetime-local"
            value={openedAt}
            onChange={(e) => setOpenedAt(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">Qui est présent ?</h3>
        <p className="text-xs text-slate-500 mb-3">Cochez tous les employés du quart. Pas de mot de passe requis.</p>
        {employees.length === 0 ? (
          <p className="text-sm text-slate-500">Chargement des employés…</p>
        ) : (
          <div className="space-y-2">
            {employees.map((emp) => {
              const checked = selectedEmployees.includes(emp.id);
              return (
                <label key={emp.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(emp.id)} className="w-5 h-5 accent-blue-600" />
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                    {empInitials(emp)}
                  </div>
                  <p className="font-semibold text-slate-900 text-sm flex-1">{empName(emp)}</p>
                </label>
              );
            })}
          </div>
        )}
        {selectedEmployees.length === 0 && (
          <p className="mt-3 text-xs text-amber-700">Sélectionnez au moins un employé pour continuer.</p>
        )}
      </div>

      {selectedEmployees.length > 1 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Qui ouvre la session ?</h3>
          <div className="space-y-2">
            {employees.filter((e) => selectedEmployees.includes(e.id)).map((emp) => (
              <label key={emp.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${openerId === emp.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                <input type="radio" name="opener" checked={openerId === emp.id} onChange={() => setOpenerId(emp.id)} className="w-5 h-5 accent-blue-600" />
                <p className="font-semibold text-slate-900 text-sm">{empName(emp)}</p>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────
function Step2({ openingCash, setOpeningCash, notes, setNotes }: { openingCash: number; setOpeningCash: (v: number) => void; notes: string; setNotes: (v: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Fond de caisse</h3>
        <p className="text-sm text-slate-600 mb-4">Combien y a-t-il de cash dans le tiroir au démarrage ?</p>
        <div className="max-w-xs">
          <div className="flex items-center border-2 border-slate-300 rounded-lg focus-within:border-blue-500 bg-white">
            <span className="pl-4 pr-2 text-slate-500 font-bold text-2xl select-none">C$</span>
            <input type="number" value={openingCash || ""} onChange={(e) => setOpeningCash(Number(e.target.value) || 0)}
              placeholder="0.00" className="flex-1 pr-4 py-3 text-2xl font-bold text-slate-900 bg-transparent outline-none" />
          </div>
        </div>
      </div>
      <div>
        <label className="text-sm font-bold uppercase tracking-wider text-slate-500 block mb-2">Notes (optionnel)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder="Conditions particulières, remarques…"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 resize-none" />
      </div>
    </div>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────
function Step3({ counts, setCounts, productsByCategory, canCarryOver, carriedOver, onCarryOver, prevCloserName, prevCloseTime }: {
  counts: Record<string, number>; setCounts: (v: Record<string, number>) => void;
  productsByCategory: Record<string, ApiTrackedProduct[]>;
  canCarryOver: boolean; carriedOver: boolean; onCarryOver: () => void;
  prevCloserName?: string; prevCloseTime?: string | null;
}) {
  const totalCounted = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-6">
      {canCarryOver && !carriedOver && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">Reprise rapide possible</p>
              <p className="text-xs text-blue-700 mt-1">
                {prevCloserName ? `${prevCloserName} a fermé` : "Fermeture précédente"}
                {prevCloseTime ? ` le ${new Date(prevCloseTime).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}.
                Le stock de fermeture peut servir de fond d'ouverture.
              </p>
              <div className="mt-3">
                <Button variant="primary" size="sm" onClick={onCarryOver}>
                  <Check className="w-4 h-4 mr-2" />Reprendre les valeurs
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {carriedOver && <Alert variant="success" title="Valeurs reprises">Les comptages précédents ont été appliqués comme fond d'ouverture.</Alert>}

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">Comptage initial</h3>
        <p className="text-sm text-slate-600 mb-4">Comptez chaque item présent en stock.</p>
        {Object.keys(productsByCategory).length === 0 && (
          <p className="text-sm text-slate-500">Aucun item configuré à compter. Configurez-les dans Paramètres → Items à compter.</p>
        )}
        <div className="space-y-4">
          {Object.entries(productsByCategory).map(([cat, prods]) => (
            <div key={cat}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{cat}</p>
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span>Produit</span>
                  <span className="text-center w-20">Qté</span>
                </div>
                {prods.map((p) => {
                  if (p.has_variants && p.product_variants?.length > 0) {
                    const sorted = [...p.product_variants].sort((a, b) => a.sort_order - b.sort_order);
                    return (
                      <div key={p.id} className="border-b border-slate-100 last:border-0">
                        <div className="px-4 py-1.5 bg-slate-50/60">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{p.name}</p>
                        </div>
                        {sorted.map((v) => (
                          <div key={v.id} className="grid grid-cols-[1fr_auto] gap-3 items-center px-4 py-2.5 pl-7 hover:bg-blue-50/40 border-t border-slate-100 first:border-0">
                            <div>
                              <span className="text-sm font-semibold text-slate-800">{v.label}</span>
                              <span className="ml-2 text-xs text-slate-400">{fmtNio(v.price)}</span>
                            </div>
                            <input
                              type="number" min="0"
                              value={counts[`${p.id}:${v.id}`] ?? ""}
                              onChange={(e) => setCounts({ ...counts, [`${p.id}:${v.id}`]: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-20 px-2 py-1.5 text-center text-base font-bold border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <div key={p.id} className="grid grid-cols-[1fr_auto] gap-3 items-center px-4 py-2.5 hover:bg-blue-50/40 border-b border-slate-100 last:border-0">
                      <div>
                        <span className="text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                        <span className="ml-2 text-xs text-slate-400">{fmtNio(p.price)}</span>
                      </div>
                      <input
                        type="number" min="0"
                        value={counts[p.id] ?? ""}
                        onChange={(e) => setCounts({ ...counts, [p.id]: Number(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-20 px-2 py-1.5 text-center text-base font-bold border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">{totalCounted} unités comptées</p>
      </div>
    </div>
  );
}
