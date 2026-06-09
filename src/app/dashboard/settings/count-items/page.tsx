"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Search, Package, CheckCircle2 } from "lucide-react";
import { Button, Card, Container, Section, Badge, Alert } from "@/components/StripeUIComponents";
import { SearchInput, DashboardHeader } from "@/components";
import { MOCK_TRACKED_PRODUCTS, fmtNio } from "../../cash-sessions/_mockData";

export default function CountItemsConfigPage() {
  const [tracked, setTracked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MOCK_TRACKED_PRODUCTS.map((p) => [p.id, p.trackInCount]))
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "TRACKED" | "UNTRACKED">("ALL");

  const filtered = useMemo(() => {
    return MOCK_TRACKED_PRODUCTS.filter((p) => {
      if (filter === "TRACKED" && !tracked[p.id]) return false;
      if (filter === "UNTRACKED" && tracked[p.id]) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tracked, filter, search]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof MOCK_TRACKED_PRODUCTS> = {};
    filtered.forEach((p) => {
      map[p.category] = map[p.category] || [];
      map[p.category].push(p);
    });
    return map;
  }, [filtered]);

  const toggle = (id: string) => setTracked({ ...tracked, [id]: !tracked[id] });
  const trackedCount = Object.values(tracked).filter(Boolean).length;

  const toggleCategory = (cat: string, value: boolean) => {
    const updates: Record<string, boolean> = {};
    grouped[cat].forEach((p) => (updates[p.id] = value));
    setTracked({ ...tracked, ...updates });
  };

  return (
    <Container>
      <Section>
        <div className="mb-2">
          <Link href="/dashboard/settings" className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Retour aux paramètres
          </Link>
        </div>

        <DashboardHeader
          pageType="settings"
          title="Items à compter"
          subtitle="Sélectionnez les produits qui devront être recomptés à chaque ouverture / fermeture de session"
        >
          <Badge variant="primary">{trackedCount} sélectionnés</Badge>
          <Button variant="primary" size="md">
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
        </DashboardHeader>

        <Alert variant="info" title="Comment ça fonctionne ?" className="mb-6">
          Seuls les produits cochés ici apparaîtront dans le comptage des sessions de caisse.
          Choisissez les items à forte valeur ou à risque (alcool, tabac, viandes…) — pas besoin de tout suivre.
        </Alert>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Rechercher un produit ou une catégorie…"
          />
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(["ALL", "TRACKED", "UNTRACKED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                  filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                {f === "ALL" ? "Tous" : f === "TRACKED" ? "Suivis" : "Non suivis"}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, products]) => {
            const allChecked = products.every((p) => tracked[p.id]);
            const someChecked = products.some((p) => tracked[p.id]);
            return (
              <Card key={cat} className="overflow-hidden">
                <div className="flex items-center justify-between mb-3 -mt-2 -mx-2 px-3 py-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-500" />
                    <p className="font-bold text-slate-900">{cat}</p>
                    <span className="text-xs text-slate-500">
                      ({products.filter((p) => tracked[p.id]).length}/{products.length})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleCategory(cat, true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Tout sélectionner
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      onClick={() => toggleCategory(cat, false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Tout désélectionner
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {products.map((p) => {
                    const checked = !!tracked[p.id];
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 py-2.5 cursor-pointer transition-colors -mx-6 px-6 ${
                          checked ? "bg-blue-50/50" : "hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(p.id)}
                          className="w-5 h-5 accent-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{p.name}</p>
                          <p className="text-xs text-slate-500">
                            {fmtNio(p.unitPrice)} · stock actuel: {p.stock}
                          </p>
                        </div>
                        {checked && (
                          <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                            Suivi
                          </Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Aucun produit ne correspond à ce filtre.
          </div>
        )}

        {/* Sticky save bar */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-full shadow-lg px-6 py-3 flex items-center gap-4 z-10">
          <span className="text-sm text-slate-600">
            <strong className="text-slate-900">{trackedCount}</strong> items sélectionnés
          </span>
          <Button variant="primary" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </Section>
    </Container>
  );
}
