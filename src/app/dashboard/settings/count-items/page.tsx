"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Package, CheckCircle2 } from "lucide-react";
import { Button, Card, Container, Section, Badge, Alert } from "@/components/StripeUIComponents";
import { SearchInput, DashboardHeader } from "@/components";
import { useTenantId } from "@/lib/utils/tenant";
import { fmtNio } from "../../cash-sessions/_apiTypes";
import type { ApiProductVariant, ApiTrackedProduct } from "../../cash-sessions/_apiTypes";

export default function CountItemsConfigPage() {
  const tenantId = useTenantId();
  const [products, setProducts] = useState<ApiTrackedProduct[]>([]);
  const [tracked, setTracked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "TRACKED" | "UNTRACKED">("ALL");

  const load = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/products/track-in-count`);
      const data = await res.json();
      if (!res.ok) {
        setApiError(data?.error ?? `Erreur ${res.status}`);
        return;
      }
      const prods: ApiTrackedProduct[] = data.products ?? [];
      setProducts(prods);
      setTracked(Object.fromEntries(prods.map((p) => [p.id, p.track_in_count ?? false])));
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filter === "TRACKED" && !tracked[p.id]) return false;
      if (filter === "UNTRACKED" && tracked[p.id]) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const cat = p.product_categories?.name ?? "";
        return p.name.toLowerCase().includes(q) || cat.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, tracked, filter, search]);

  const grouped = useMemo(() => {
    const map: Record<string, ApiTrackedProduct[]> = {};
    filtered.forEach((p) => {
      const cat = p.product_categories?.name ?? "Sans catégorie";
      map[cat] = map[cat] || [];
      map[cat].push(p);
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

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    setSaved(false);
    try {
      const updates = Object.entries(tracked).map(([product_id, track_in_count]) => ({
        product_id,
        track_in_count,
      }));
      const res = await fetch(`/api/tenants/${tenantId}/products/track-in-count`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
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
          <Button variant="primary" size="md" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
        </DashboardHeader>

        {saved && <Alert variant="success" title="Sauvegardé" className="mb-4">Les items à compter ont été mis à jour.</Alert>}

        <Alert variant="info" title="Comment ça fonctionne ?" className="mb-6">
          Seuls les produits cochés ici apparaîtront dans le comptage des sessions de caisse.
          Choisissez les items à forte valeur ou à risque (alcool, tabac, viandes…) — pas besoin de tout suivre.
        </Alert>

        {loading ? (
          <p className="text-slate-500">Chargement des produits…</p>
        ) : apiError ? (
          <Alert variant="error" title="Impossible de charger les produits">
            <p className="text-sm">{apiError}</p>
            <p className="text-xs mt-1 text-slate-500">Vérifiez que la migration SQL a bien été exécutée (colonne <code>track_in_count</code> sur la table <code>products</code>).</p>
            <button onClick={load} className="mt-2 text-xs font-semibold text-blue-600 hover:underline">Réessayer</button>
          </Alert>
        ) : products.length === 0 ? (
          <Alert variant="info" title="Aucun produit trouvé">
            Aucun produit n&apos;a été trouvé pour ce tenant. Ajoutez des produits dans le module Inventaire.
          </Alert>
        ) : (
          <>
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un produit ou une catégorie…" />
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(["ALL", "TRACKED", "UNTRACKED"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>
                {f === "ALL" ? "Tous" : f === "TRACKED" ? "Suivis" : "Non suivis"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, prods]) => (
            <Card key={cat} className="overflow-hidden">
              <div className="flex items-center justify-between mb-3 -mt-2 -mx-2 px-3 py-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-500" />
                  <p className="font-bold text-slate-900">{cat}</p>
                  <span className="text-xs text-slate-500">({prods.filter((p) => tracked[p.id]).length}/{prods.length})</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleCategory(cat, true)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Tout sélectionner</button>
                  <span className="text-slate-300">·</span>
                  <button onClick={() => toggleCategory(cat, false)} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Tout désélectionner</button>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {prods.map((p) => {
                  const checked = !!tracked[p.id];
                  const sortedVariants = p.has_variants && p.product_variants?.length > 0
                    ? [...p.product_variants].sort((a, b) => a.sort_order - b.sort_order)
                    : [];
                  return (
                    <div key={p.id}>
                      <label className={`flex items-center gap-3 py-2.5 cursor-pointer transition-colors -mx-6 px-6 ${checked ? "bg-blue-50/50" : "hover:bg-slate-50"}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} className="w-5 h-5 accent-blue-600" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{p.name}</p>
                          {!p.has_variants && (
                            <p className="text-xs text-slate-500">{fmtNio(p.price)} · stock: {p.stock_quantity}</p>
                          )}
                          {p.has_variants && (
                            <p className="text-xs text-slate-500">{sortedVariants.length} format{sortedVariants.length > 1 ? "s" : ""} — chacun sera compté séparément</p>
                          )}
                        </div>
                        {checked && <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>Suivi</Badge>}
                      </label>
                      {checked && sortedVariants.length > 0 && (
                        <div className="bg-slate-50 border-t border-slate-100 divide-y divide-slate-100">
                          {sortedVariants.map((v) => (
                            <div key={v.id} className="flex items-center gap-3 py-2 pl-12 pr-6">
                              <div className="w-2 h-2 rounded-full bg-blue-300 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-700">{v.label}</p>
                                <p className="text-xs text-slate-500">{fmtNio(v.price)} · stock: {v.stock_quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">Aucun produit ne correspond à ce filtre.</div>
        )}

        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-full shadow-lg px-6 py-3 flex items-center gap-4 z-10">
          <span className="text-sm text-slate-600"><strong className="text-slate-900">{trackedCount}</strong> items sélectionnés</span>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />{saving ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
        </div>
        </>)}
      </Section>
    </Container>
  );
}
