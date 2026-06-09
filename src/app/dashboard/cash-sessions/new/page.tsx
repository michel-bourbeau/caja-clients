"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Sun, Sunset, Moon, Sparkles, Info } from "lucide-react";
import { Button, Card, Container, Section, Badge, Alert } from "@/components/StripeUIComponents";
import { DashboardHeader } from "@/components";
import {
  MOCK_EMPLOYEES,
  MOCK_SESSIONS,
  MOCK_TRACKED_PRODUCTS,
  getEmployeeById,
  fmtNio,
  fmtTime,
} from "../_mockData";

// Find the most recent CLOSED session to offer "carry over"
const previousClosed = MOCK_SESSIONS.find((s) => s.status === "CLOSED");

const SHIFT_PRESETS = [
  { id: "matin",    label: "Quart matin",    icon: Sun,    timeRange: "08:00 — 14:00" },
  { id: "apresmidi", label: "Quart après-midi", icon: Sunset, timeRange: "14:00 — 18:00" },
  { id: "soir",     label: "Quart soir",     icon: Moon,   timeRange: "18:00 — 22:00" },
];

const TRACKED = MOCK_TRACKED_PRODUCTS.filter((p) => p.trackInCount);

export default function NewCashSessionPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [shiftId, setShiftId] = useState<string>("matin");
  const [customName, setCustomName] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  // Pretend the current logged-in user is Maria (emp-1) so we can simulate the carry-over banner
  const currentUserId = "emp-1";

  // Step 2 state
  const [openingCash, setOpeningCash] = useState<number>(2000);
  const [notes, setNotes] = useState("");

  // Step 3 state
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(TRACKED.map((p) => [p.id, 0]))
  );
  const [carriedOver, setCarriedOver] = useState(false);

  const canCarryOver =
    !!previousClosed && previousClosed.closedById === currentUserId;

  const sessionName = customName.trim() || SHIFT_PRESETS.find((s) => s.id === shiftId)?.label || "Session";

  const productsByCategory = useMemo(() => {
    const grouped: Record<string, typeof TRACKED> = {};
    TRACKED.forEach((p) => {
      grouped[p.category] = grouped[p.category] || [];
      grouped[p.category].push(p);
    });
    return grouped;
  }, []);

  const handleCarryOver = () => {
    if (!previousClosed) return;
    const map: Record<string, number> = {};
    previousClosed.counts.forEach((c) => {
      map[c.productId] = c.closingQty ?? 0;
    });
    // Fill the count form with previous closing values
    setCounts((prev) => ({ ...prev, ...map }));
    setOpeningCash(previousClosed.closingCash ?? 0);
    setCarriedOver(true);
  };

  const totalCounted = Object.values(counts).reduce((sum, n) => sum + n, 0);

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
          subtitle={`${sessionName} · Étape ${step}/3`}
        />

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors ${
                  step >= (n as 1 | 2 | 3)
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {step > n ? <Check className="w-4 h-4" /> : n}
              </div>
              {n < 3 && (
                <div className={`w-12 h-1 rounded-full ${step > n ? "bg-blue-600" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="max-w-3xl mx-auto">
          {step === 1 && (
            <Step1
              shiftId={shiftId}
              setShiftId={setShiftId}
              customName={customName}
              setCustomName={setCustomName}
              selectedEmployees={selectedEmployees}
              setSelectedEmployees={setSelectedEmployees}
              currentUserId={currentUserId}
            />
          )}

          {step === 2 && (
            <Step2
              openingCash={openingCash}
              setOpeningCash={setOpeningCash}
              notes={notes}
              setNotes={setNotes}
            />
          )}

          {step === 3 && (
            <Step3
              counts={counts}
              setCounts={setCounts}
              productsByCategory={productsByCategory}
              canCarryOver={canCarryOver}
              carriedOver={carriedOver}
              onCarryOver={handleCarryOver}
              previousCloser={previousClosed ? getEmployeeById(previousClosed.closedById)?.name : undefined}
              previousCloseTime={previousClosed?.closedAt}
            />
          )}

          {/* Footer actions */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
            <Button
              variant="secondary"
              size="md"
              onClick={() => (step > 1 ? setStep((step - 1) as 1 | 2 | 3) : router.push("/dashboard/cash-sessions"))}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>

            {step < 3 ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                disabled={step === 1 && selectedEmployees.length === 0}
              >
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push("/dashboard/cash-sessions/s-001")}
              >
                <Check className="w-4 h-4 mr-2" />
                Ouvrir le magasin
              </Button>
            )}
          </div>
        </Card>

        {step === 3 && (
          <p className="mt-3 text-center text-xs text-slate-500">
            {totalCounted} unités comptées sur {TRACKED.length} items
          </p>
        )}
      </Section>
    </Container>
  );
}

// ─── Step 1: Shift + Employees ────────────────────────────────────────────
function Step1({
  shiftId,
  setShiftId,
  customName,
  setCustomName,
  selectedEmployees,
  setSelectedEmployees,
  currentUserId,
}: any) {
  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev: string[]) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          Quel quart ?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SHIFT_PRESETS.map((s) => {
            const Icon = s.icon;
            const selected = shiftId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => { setShiftId(s.id); setCustomName(""); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  selected
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <Icon className={`w-7 h-7 ${selected ? "text-blue-600" : "text-slate-400"}`} />
                <p className="font-semibold text-slate-900 text-sm">{s.label}</p>
                <p className="text-xs text-slate-500">{s.timeRange}</p>
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <label className="text-xs text-slate-500 block mb-1">Ou nom personnalisé</label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="ex: Quart événement spécial"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          Qui est présent ?
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Cochez tous les employés qui travailleront pendant ce quart. Pas de mot de passe requis.
        </p>
        <div className="space-y-2">
          {MOCK_EMPLOYEES.map((emp) => {
            const checked = selectedEmployees.includes(emp.id);
            const isCurrentUser = emp.id === currentUserId;
            return (
              <label
                key={emp.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  checked
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleEmployee(emp.id)}
                  className="w-5 h-5 accent-blue-600"
                />
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                  {emp.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">
                    {emp.name}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs font-normal text-blue-600">(vous)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{emp.role}</p>
                </div>
              </label>
            );
          })}
        </div>
        {selectedEmployees.length === 0 && (
          <p className="mt-3 text-xs text-amber-700">
            Sélectionnez au moins un employé pour continuer.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Opening cash ─────────────────────────────────────────────────
function Step2({ openingCash, setOpeningCash, notes, setNotes }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          Fond de caisse
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Combien y a-t-il de cash dans le tiroir au démarrage ?
        </p>
        <div className="max-w-xs">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">
              C$
            </span>
            <input
              type="number"
              value={openingCash || ""}
              onChange={(e) => setOpeningCash(Number(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full pl-12 pr-4 py-3 text-2xl font-bold border-2 border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-bold uppercase tracking-wider text-slate-500 block mb-2">
          Notes (optionnel)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Conditions particulières, remarques…"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 resize-none"
        />
      </div>
    </div>
  );
}

// ─── Step 3: Initial item count ───────────────────────────────────────────
function Step3({
  counts,
  setCounts,
  productsByCategory,
  canCarryOver,
  carriedOver,
  onCarryOver,
  previousCloser,
  previousCloseTime,
}: any) {
  return (
    <div className="space-y-6">
      {canCarryOver && !carriedOver && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">
                Reprise rapide possible
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Vous avez fermé le magasin {previousCloseTime ? `le ${new Date(previousCloseTime).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}{previousCloser ? ` (${previousCloser})` : ""}.
                Le stock de fermeture peut servir directement de fond d'ouverture.
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="primary" size="sm" onClick={onCarryOver}>
                  <Check className="w-4 h-4 mr-2" />
                  Reprendre les valeurs
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onCarryOver()} disabled>
                  Recompter quand même
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {carriedOver && (
        <Alert variant="success" title="Valeurs reprises">
          Les comptages de fermeture précédents ont été appliqués comme fond d'ouverture. Vérifiez et ajustez si besoin.
        </Alert>
      )}

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
          Comptage initial
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Comptez chaque item présent en stock. Items configurés par l'admin.
        </p>

        <div className="space-y-4">
          {Object.entries(productsByCategory).map(([cat, products]) => (
            <div key={cat}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                {cat} · {(products as any[]).length} items
              </p>
              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
                {(products as any[]).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{fmtNio(p.unitPrice)} / unité</p>
                    </div>
                    <input
                      type="number"
                      value={counts[p.id] || ""}
                      onChange={(e) => setCounts({ ...counts, [p.id]: Number(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-20 px-2 py-1.5 text-center text-base font-bold border border-slate-300 rounded text-slate-900"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
