/**
 * Real API types for the Cash Sessions module.
 * All shapes are snake_case — matching the Supabase column names.
 */

export interface ApiEmployee {
  id: string;
  first_name: string;
  last_name: string;
}

export interface ApiCashSessionCount {
  id: string;
  session_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  sku: string;
  unit_price: number;
  opening_qty: number | null;
  sold_qty: number;
  expected_closing_qty: number | null;
  closing_qty: number | null;
  recount_attempts: number;
  notes: string;
}

export interface ApiCashSession {
  id: string;
  tenant_id: string;
  name: string;
  status: "OPEN" | "CLOSED";
  opening_cash: number;
  closing_cash: number | null;
  opened_at: string;
  opened_by_id: string | null;
  closed_at: string | null;
  closed_by_id: string | null;
  opening_method: "COUNTED" | "CARRIED_OVER";
  previous_session_id: string | null;
  notes: string;
  resolved: boolean;
  total_sales: number;
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
  tx_count: number;
  voids_count: number;
  no_sales_count: number;
  large_discounts_count: number;
  created_at: string;
  updated_at: string;
  // Joined relations (populated by the list/detail routes)
  opened_by: ApiEmployee | null;
  closed_by: ApiEmployee | null;
  cash_session_employees: { employee_id: string; employees: ApiEmployee }[];
  cash_session_counts: ApiCashSessionCount[];
}

// ─── Display helpers ──────────────────────────────────────────────────────

export const empName = (e: ApiEmployee | null | undefined): string =>
  e ? `${e.first_name} ${e.last_name}` : "—";

export const empInitials = (e: ApiEmployee | null | undefined): string =>
  e ? `${e.first_name[0] ?? ""}${e.last_name[0] ?? ""}`.toUpperCase() : "?";

export const fmtNio = (n: number): string =>
  `C$ ${n.toLocaleString("es-NI", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export const fmtTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export const fmtDuration = (startIso: string, endIso: string): string => {
  const minutes = Math.floor(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000
  );
  return `${Math.floor(minutes / 60)}h ${(minutes % 60).toString().padStart(2, "0")}min`;
};

// ─── Reconciliation helpers ───────────────────────────────────────────────

export function calcItemVariance(c: ApiCashSessionCount): number {
  if (c.closing_qty == null) return 0;
  const expected = (c.opening_qty ?? 0) - c.sold_qty;
  return c.closing_qty - expected;
}

export function calcCashVariance(s: ApiCashSession): number {
  if (s.closing_cash == null) return 0;
  return s.closing_cash - (s.opening_cash + s.cash_sales);
}

export function calcMissingItemsValue(counts: ApiCashSessionCount[]): number {
  return counts.reduce((sum, c) => {
    const v = calcItemVariance(c);
    return v < 0 ? sum + Math.abs(v) * c.unit_price : sum;
  }, 0);
}

export function calcReconciliationSuggestion(s: ApiCashSession): {
  type: "info" | "success" | "warning" | "danger";
  message: string;
} | null {
  if (s.closing_cash == null) return null;
  const cashVar = calcCashVariance(s);
  const missingValue = calcMissingItemsValue(s.cash_session_counts ?? []);

  if (Math.abs(cashVar) < 10 && missingValue < 10) {
    return { type: "success", message: "Session équilibrée — aucune anomalie détectée." };
  }
  if (cashVar > 0 && missingValue > 0) {
    const diff = Math.abs(cashVar - missingValue);
    if (diff < Math.max(cashVar, missingValue) * 0.15) {
      return {
        type: "warning",
        message: `Surplus caisse (${fmtNio(cashVar)}) ≈ valeur items manquants (${fmtNio(missingValue)}). Probables ventes non enregistrées.`,
      };
    }
  }
  if (cashVar > 0 && missingValue === 0) {
    return { type: "info", message: `Surplus caisse de ${fmtNio(cashVar)} sans items manquants. Pourboire ou erreur de change ?` };
  }
  if (cashVar < 0 && missingValue === 0) {
    return { type: "danger", message: `Déficit caisse de ${fmtNio(Math.abs(cashVar))} sans items manquants. Vol cash possible.` };
  }
  return { type: "warning", message: "Écarts détectés — examen recommandé." };
}
