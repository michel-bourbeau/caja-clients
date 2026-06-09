"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Lock, AlertTriangle, RotateCw,
  CheckCircle2, EyeOff, User, Sparkles,
} from "lucide-react";
import { Button, Card, Container, Section, Badge, Alert } from "@/components/StripeUIComponents";
import { DashboardHeader } from "@/components";
import {
  getSessionById,
  getEmployeeById,
  MOCK_EMPLOYEES,
  fmtNio,
} from "../../_mockData";

export default function CloseSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const session = getSessionById(params.id);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: who is doing the count
  const [counterId, setCounterId] = useState<string>("");

  // Step 2: blind item count
  const [closingCounts, setClosingCounts] = useState<Record<string, number | "">>({});
  const [recountAttempts, setRecountAttempts] = useState<Record<string, number>>({});

  // Step 3: cash count + reveal results
  const [closingCash, setClosingCash] = useState<number>(0);
  const [cashRecount, setCashRecount] = useState(0);
  const [notes, setNotes] = useState("");
  const [revealed, setRevealed] = useState(false);

  if (!session || session.status !== "OPEN") {
    return (
      <Container>
        <Section>
          <Alert variant="error" title="Session non disponible">
            Cette session n'existe pas ou est déjà fermée.
          </Alert>
        </Section>
      </Container>
    );
  }

  const handleRecount = (countId: string) => {
    setRecountAttempts((prev) => ({ ...prev, [countId]: (prev[countId] || 0) + 1 }));
    setClosingCounts((prev) => ({ ...prev, [countId]: "" }));
  };

  const allCounted = session.counts.every((c) => closingCounts[c.id] !== undefined && closingCounts[c.id] !== "");
  const counter = getEmployeeById(counterId);

  // Compute results once cash is entered (revealed in step 3)
  const itemVariances = session.counts.map((c) => {
    const counted = Number(closingCounts[c.id] || 0);
    const expected = c.openingQty - c.soldQty;
    return { count: c, counted, expected, variance: counted - expected };
  });

  const itemsWithVariance = itemVariances.filter((v) => v.variance !== 0);
  const missingItemsValue = itemVariances
    .filter((v) => v.variance < 0)
    .reduce((sum, v) => sum + Math.abs(v.variance) * v.count.unitPrice, 0);

  const expectedCash = session.openingCash + session.cashSales;
  const cashVariance = closingCash - expectedCash;

  return (
    <Container>
      <Section>
        <div className="mb-2">
          <Link href={`/dashboard/cash-sessions/${session.id}`} className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Retour à la session
          </Link>
        </div>

        <DashboardHeader
          pageType="cierre"
          title={`Fermer ${session.name}`}
          subtitle={`Étape ${step}/3 · ${step === 1 ? "Qui compte ?" : step === 2 ? "Comptage à l'aveugle" : "Cash + résultat"}`}
        />

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors ${
                  step >= (n as 1 | 2 | 3)
                    ? "bg-amber-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {step > n ? <Check className="w-4 h-4" /> : n}
              </div>
              {n < 3 && (
                <div className={`w-12 h-1 rounded-full ${step > n ? "bg-amber-600" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="max-w-3xl mx-auto">
          {/* ── Step 1: Identify the counter ───────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
                <User className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Qui effectue le comptage de fermeture ?
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Cette information est tracée. Vous serez identifié comme la personne ayant clôturé la session.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Employés du quart
                </h3>
                <div className="space-y-2">
                  {session.employees.map((emp) => (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        counterId === emp.id
                          ? "border-amber-500 bg-amber-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="counter"
                        checked={counterId === emp.id}
                        onChange={() => setCounterId(emp.id)}
                        className="w-5 h-5 accent-amber-600"
                      />
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                        {emp.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{emp.name}</p>
                        <p className="text-xs text-slate-500">{emp.role}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <summary className="text-sm font-semibold text-slate-700 cursor-pointer">
                  L'employé qui compte n'est pas dans la liste ?
                </summary>
                <div className="mt-3 space-y-2">
                  {MOCK_EMPLOYEES.filter((e) => !session.employees.some((se) => se.id === e.id)).map((emp) => (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        counterId === emp.id
                          ? "border-amber-500 bg-amber-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="counter"
                        checked={counterId === emp.id}
                        onChange={() => setCounterId(emp.id)}
                        className="w-4 h-4 accent-amber-600"
                      />
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                        {emp.initials}
                      </div>
                      <p className="font-medium text-slate-900 text-sm">{emp.name}</p>
                      <span className="text-xs text-slate-400 ml-auto">+ ajouté à la session</span>
                    </label>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* ── Step 2: Blind item count ───────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 flex items-start gap-3">
                <EyeOff className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-purple-900">
                    Comptage à l'aveugle
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    Vous ne voyez pas la quantité attendue — comptez ce que vous avez réellement en stock.
                    L'écart sera révélé après soumission.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(
                  session.counts.reduce<Record<string, typeof session.counts>>((acc, c) => {
                    acc[c.category] = acc[c.category] || [];
                    acc[c.category].push(c);
                    return acc;
                  }, {})
                ).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      {cat} · {items.length} items
                    </p>
                    <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
                      {items.map((c) => {
                        const attempts = recountAttempts[c.id] || 0;
                        const locked = attempts >= 3;
                        return (
                          <div key={c.id} className="flex items-center gap-3 p-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{c.productName}</p>
                              <p className="text-xs text-slate-500">{fmtNio(c.unitPrice)} / unité</p>
                            </div>
                            <input
                              type="number"
                              value={closingCounts[c.id] ?? ""}
                              onChange={(e) =>
                                setClosingCounts({
                                  ...closingCounts,
                                  [c.id]: e.target.value === "" ? "" : Number(e.target.value),
                                })
                              }
                              disabled={locked}
                              placeholder="?"
                              className="w-20 px-2 py-1.5 text-center text-base font-bold border border-slate-300 rounded text-slate-900 disabled:bg-slate-100"
                            />
                            {attempts > 0 && (
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                  attempts >= 3
                                    ? "bg-red-100 text-red-700"
                                    : attempts === 2
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                                title={`${attempts} recomptage(s)`}
                              >
                                ×{attempts}
                              </span>
                            )}
                            <button
                              onClick={() => handleRecount(c.id)}
                              disabled={locked || closingCounts[c.id] === undefined || closingCounts[c.id] === ""}
                              className="text-xs text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                              title={locked ? "Verrouillé après 3 recomptages — admin requis" : "Recompter"}
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                              {locked ? "Verrouillé" : "Recompter"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-center text-slate-500">
                {Object.values(closingCounts).filter((v) => v !== "" && v !== undefined).length}/{session.counts.length} items comptés
              </p>
            </div>
          )}

          {/* ── Step 3: Cash + reveal ──────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              {!revealed && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 flex items-start gap-3">
                  <EyeOff className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-purple-900">
                      Cash compté à l'aveugle
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      Comptez tout le cash dans le tiroir. Le total attendu sera révélé après.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                  💵 Cash dans le tiroir
                </h3>
                <div className="max-w-xs">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">
                      C$
                    </span>
                    <input
                      type="number"
                      value={closingCash || ""}
                      onChange={(e) => {
                        if (revealed) {
                          setCashRecount((prev) => prev + 1);
                        }
                        setClosingCash(Number(e.target.value) || 0);
                      }}
                      placeholder="0.00"
                      className="w-full pl-12 pr-4 py-3 text-2xl font-bold border-2 border-slate-300 rounded-lg text-slate-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  {cashRecount > 0 && (
                    <p className="mt-1 text-xs text-amber-700 flex items-center gap-1">
                      <RotateCw className="w-3 h-3" />
                      {cashRecount} recomptage{cashRecount > 1 ? "s" : ""} cash
                    </p>
                  )}
                </div>
              </div>

              {!revealed && closingCash > 0 && (
                <Button variant="primary" size="md" onClick={() => setRevealed(true)} className="w-full">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Révéler le résultat
                </Button>
              )}

              {revealed && (
                <RevealedResults
                  session={session}
                  itemVariances={itemVariances}
                  itemsWithVariance={itemsWithVariance}
                  missingItemsValue={missingItemsValue}
                  cashVariance={cashVariance}
                  expectedCash={expectedCash}
                  notes={notes}
                  setNotes={setNotes}
                />
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                if (step > 1) setStep((step - 1) as 1 | 2 | 3);
                else router.push(`/dashboard/cash-sessions/${session.id}`);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>

            {step < 3 ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                disabled={(step === 1 && !counterId) || (step === 2 && !allCounted)}
              >
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                disabled={!revealed}
                onClick={() => router.push(`/dashboard/cash-sessions/s-002`)}
              >
                <Lock className="w-4 h-4 mr-2" />
                Fermer définitivement
              </Button>
            )}
          </div>
        </Card>
      </Section>
    </Container>
  );
}

// ─── Revealed reconciliation results ──────────────────────────────────────
function RevealedResults({
  session, itemVariances, itemsWithVariance, missingItemsValue,
  cashVariance, expectedCash, notes, setNotes,
}: any) {
  const cashOk = Math.abs(cashVariance) < 10;
  const stockOk = itemsWithVariance.length === 0;
  const allOk = cashOk && stockOk;
  const noteRequired = !cashOk || missingItemsValue > 50;

  return (
    <div className="space-y-4">
      <div className={`rounded-lg p-4 border-2 ${
        allOk ? "bg-emerald-50 border-emerald-300" : "bg-amber-50 border-amber-300"
      }`}>
        <div className="flex items-center gap-3">
          {allOk ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          )}
          <div>
            <p className={`font-bold text-lg ${allOk ? "text-emerald-900" : "text-amber-900"}`}>
              {allOk ? "Session équilibrée ✓" : "Écarts détectés"}
            </p>
            <p className="text-sm text-slate-700">
              Caisse: {cashOk ? "✓ équilibrée" : (cashVariance > 0 ? `+${fmtNio(cashVariance)}` : `−${fmtNio(Math.abs(cashVariance))}`)}
              {" · "}
              Stock: {stockOk ? "✓ conforme" : `${itemsWithVariance.length} item(s) en écart`}
            </p>
          </div>
        </div>
      </div>

      {/* Cash detail */}
      <Card>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Caisse</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-600">Fond initial</span><span className="tabular-nums">{fmtNio(session.openingCash)}</span></div>
          <div className="flex justify-between"><span className="text-slate-600">+ Ventes CASH</span><span className="tabular-nums">{fmtNio(session.cashSales)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>= Attendu</span><span className="tabular-nums">{fmtNio(expectedCash)}</span></div>
          <div className="flex justify-between font-semibold"><span>Compté</span><span className="tabular-nums">{fmtNio(session.openingCash + session.cashSales + cashVariance)}</span></div>
          <div className={`flex justify-between border-t border-slate-200 pt-1 font-bold ${cashOk ? "text-emerald-700" : cashVariance > 0 ? "text-amber-700" : "text-red-700"}`}>
            <span>Écart</span>
            <span className="tabular-nums">
              {cashVariance === 0 ? "0 C$" : cashVariance > 0 ? `+${fmtNio(cashVariance)}` : `−${fmtNio(Math.abs(cashVariance))}`}
            </span>
          </div>
        </div>
      </Card>

      {/* Items with variance */}
      {itemsWithVariance.length > 0 && (
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Items en écart ({itemsWithVariance.length})
          </p>
          <div className="space-y-2 text-sm">
            {itemsWithVariance.map((v: any) => (
              <div key={v.count.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-900">{v.count.productName}</p>
                  <p className="text-xs text-slate-500">
                    Compté: {v.counted} · Attendu: {v.expected}
                  </p>
                </div>
                <span className={`font-bold tabular-nums ${v.variance < 0 ? "text-red-700" : "text-amber-700"}`}>
                  {v.variance > 0 ? "+" : ""}{v.variance}
                </span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-bold text-sm">
              <span>Valeur items manquants</span>
              <span className="tabular-nums text-red-700">{fmtNio(missingItemsValue)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Note (required if discrepancies) */}
      <div>
        <label className="text-sm font-bold text-slate-700 block mb-2">
          Note explicative {noteRequired && <span className="text-red-600">*</span>}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={noteRequired ? "Obligatoire — expliquez l'écart (ex: vente non enregistrée pendant panne, erreur de change…)" : "Notes optionnelles"}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 resize-none"
        />
        {noteRequired && !notes.trim() && (
          <p className="mt-1 text-xs text-red-600">
            Une explication est requise pour les écarts supérieurs au seuil toléré.
          </p>
        )}
      </div>
    </div>
  );
}
