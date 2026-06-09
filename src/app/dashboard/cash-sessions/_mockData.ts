/**
 * MOCK DATA — Cash Sessions module (UI/UX prototype)
 * No API calls. Pure mock for demo & layout iteration.
 */

export type SessionStatus = "OPEN" | "CLOSED";

export interface MockEmployee {
  id: string;
  name: string;
  initials: string;
  role: "MANAGER" | "CASHIER" | "EMPLOYEE";
}

export interface MockCountedItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  unitPrice: number; // C$ — used for missing items value
  openingQty: number;
  soldQty: number; // calculated from POS
  closingQty: number | null; // null = not yet counted
  recountAttempts: number;
}

export interface MockRecountEvent {
  id: string;
  countId: string | null; // null = cash recount
  type: "ITEM" | "CASH";
  attemptNumber: number;
  previousValue: number;
  newValue: number;
  recountedById: string;
  recountedAt: string;
}

export interface MockCashSession {
  id: string;
  name: string; // "Quart matin"
  status: SessionStatus;
  openingCash: number;
  closingCash: number | null;
  openedAt: string; // ISO
  openedById: string;
  closedAt: string | null;
  closedById: string | null;
  openingMethod: "COUNTED" | "CARRIED_OVER";
  previousSessionId: string | null;
  notes: string;
  resolved: boolean;
  employees: MockEmployee[];
  counts: MockCountedItem[];
  recounts: MockRecountEvent[];
  // POS aggregates (would be computed from transactions table)
  totalSales: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  txCount: number;
  voidsCount: number;
  noSalesCount: number;
  largeDiscountsCount: number;
}

export const MOCK_EMPLOYEES: MockEmployee[] = [
  { id: "emp-1", name: "Maria González",  initials: "MG", role: "MANAGER" },
  { id: "emp-2", name: "Carlos Ramírez",  initials: "CR", role: "CASHIER" },
  { id: "emp-3", name: "Ana Martínez",    initials: "AM", role: "CASHIER" },
  { id: "emp-4", name: "Luis Mendoza",    initials: "LM", role: "EMPLOYEE" },
  { id: "emp-5", name: "Sofía Torres",    initials: "ST", role: "CASHIER" },
];

// Items configured by admin to be counted (track_in_count = TRUE)
export const MOCK_TRACKED_PRODUCTS = [
  { id: "p1",  name: "Toña 12oz",            category: "Alcools",  unitPrice: 35,  trackInCount: true,  stock: 24 },
  { id: "p2",  name: "Toña Litro",           category: "Alcools",  unitPrice: 75,  trackInCount: true,  stock: 8 },
  { id: "p3",  name: "Victoria Frost",       category: "Alcools",  unitPrice: 40,  trackInCount: true,  stock: 18 },
  { id: "p4",  name: "Flor de Caña 4 ans",   category: "Alcools",  unitPrice: 320, trackInCount: true,  stock: 3 },
  { id: "p5",  name: "Flor de Caña 7 ans",   category: "Alcools",  unitPrice: 520, trackInCount: true,  stock: 1 },
  { id: "p6",  name: "Pollo entier",         category: "Viandes",  unitPrice: 180, trackInCount: true,  stock: 6 },
  { id: "p7",  name: "Carne molida (kg)",    category: "Viandes",  unitPrice: 220, trackInCount: true,  stock: 4 },
  { id: "p8",  name: "Chuleta cerdo (kg)",   category: "Viandes",  unitPrice: 195, trackInCount: true,  stock: 5 },
  { id: "p9",  name: "Cigarros Belmont",     category: "Tabac",    unitPrice: 75,  trackInCount: true,  stock: 12 },
  { id: "p10", name: "Cigarros Marlboro",    category: "Tabac",    unitPrice: 95,  trackInCount: true,  stock: 9 },
  { id: "p11", name: "Coca-Cola 2L",         category: "Sodas",    unitPrice: 65,  trackInCount: true,  stock: 14 },
  { id: "p12", name: "Pepsi 2L",             category: "Sodas",    unitPrice: 60,  trackInCount: true,  stock: 11 },
  // Untracked products (admin did not enable)
  { id: "p13", name: "Pan blanco",           category: "Boulangerie", unitPrice: 25, trackInCount: false, stock: 30 },
  { id: "p14", name: "Galletas Oreo",        category: "Snacks",      unitPrice: 35, trackInCount: false, stock: 20 },
  { id: "p15", name: "Agua 600ml",           category: "Sodas",       unitPrice: 18, trackInCount: false, stock: 50 },
];

// ─── Active session (OPEN) ────────────────────────────────────────────────
const activeCounts: MockCountedItem[] = [
  { id: "c1",  productId: "p1",  productName: "Toña 12oz",          category: "Alcools", unitPrice: 35,  openingQty: 24, soldQty: 3, closingQty: null, recountAttempts: 0 },
  { id: "c2",  productId: "p2",  productName: "Toña Litro",         category: "Alcools", unitPrice: 75,  openingQty: 8,  soldQty: 0, closingQty: null, recountAttempts: 0 },
  { id: "c3",  productId: "p3",  productName: "Victoria Frost",     category: "Alcools", unitPrice: 40,  openingQty: 18, soldQty: 2, closingQty: null, recountAttempts: 0 },
  { id: "c4",  productId: "p4",  productName: "Flor de Caña 4 ans", category: "Alcools", unitPrice: 320, openingQty: 3,  soldQty: 0, closingQty: null, recountAttempts: 0 },
  { id: "c5",  productId: "p5",  productName: "Flor de Caña 7 ans", category: "Alcools", unitPrice: 520, openingQty: 1,  soldQty: 0, closingQty: null, recountAttempts: 0 },
  { id: "c6",  productId: "p6",  productName: "Pollo entier",       category: "Viandes", unitPrice: 180, openingQty: 6,  soldQty: 2, closingQty: null, recountAttempts: 0 },
  { id: "c7",  productId: "p7",  productName: "Carne molida (kg)",  category: "Viandes", unitPrice: 220, openingQty: 4,  soldQty: 1, closingQty: null, recountAttempts: 0 },
  { id: "c8",  productId: "p8",  productName: "Chuleta cerdo (kg)", category: "Viandes", unitPrice: 195, openingQty: 5,  soldQty: 0, closingQty: null, recountAttempts: 0 },
  { id: "c9",  productId: "p9",  productName: "Cigarros Belmont",   category: "Tabac",   unitPrice: 75,  openingQty: 12, soldQty: 4, closingQty: null, recountAttempts: 0 },
  { id: "c10", productId: "p10", productName: "Cigarros Marlboro",  category: "Tabac",   unitPrice: 95,  openingQty: 9,  soldQty: 2, closingQty: null, recountAttempts: 0 },
  { id: "c11", productId: "p11", productName: "Coca-Cola 2L",       category: "Sodas",   unitPrice: 65,  openingQty: 14, soldQty: 3, closingQty: null, recountAttempts: 0 },
  { id: "c12", productId: "p12", productName: "Pepsi 2L",           category: "Sodas",   unitPrice: 60,  openingQty: 11, soldQty: 2, closingQty: null, recountAttempts: 0 },
];

// ─── Closed session with discrepancies ────────────────────────────────────
const closedCounts: MockCountedItem[] = [
  { id: "cc1",  productId: "p1",  productName: "Toña 12oz",          category: "Alcools", unitPrice: 35,  openingQty: 24, soldQty: 3, closingQty: 18, recountAttempts: 2 },
  { id: "cc2",  productId: "p2",  productName: "Toña Litro",         category: "Alcools", unitPrice: 75,  openingQty: 8,  soldQty: 0, closingQty: 8,  recountAttempts: 0 },
  { id: "cc3",  productId: "p3",  productName: "Victoria Frost",     category: "Alcools", unitPrice: 40,  openingQty: 18, soldQty: 2, closingQty: 14, recountAttempts: 3 },
  { id: "cc4",  productId: "p4",  productName: "Flor de Caña 4 ans", category: "Alcools", unitPrice: 320, openingQty: 3,  soldQty: 0, closingQty: 3,  recountAttempts: 0 },
  { id: "cc5",  productId: "p5",  productName: "Flor de Caña 7 ans", category: "Alcools", unitPrice: 520, openingQty: 1,  soldQty: 0, closingQty: 1,  recountAttempts: 0 },
  { id: "cc6",  productId: "p6",  productName: "Pollo entier",       category: "Viandes", unitPrice: 180, openingQty: 6,  soldQty: 2, closingQty: 4,  recountAttempts: 1 },
  { id: "cc7",  productId: "p7",  productName: "Carne molida (kg)",  category: "Viandes", unitPrice: 220, openingQty: 4,  soldQty: 1, closingQty: 3,  recountAttempts: 0 },
  { id: "cc8",  productId: "p8",  productName: "Chuleta cerdo (kg)", category: "Viandes", unitPrice: 195, openingQty: 5,  soldQty: 0, closingQty: 5,  recountAttempts: 0 },
  { id: "cc9",  productId: "p9",  productName: "Cigarros Belmont",   category: "Tabac",   unitPrice: 75,  openingQty: 12, soldQty: 4, closingQty: 8,  recountAttempts: 0 },
  { id: "cc10", productId: "p10", productName: "Cigarros Marlboro",  category: "Tabac",   unitPrice: 95,  openingQty: 9,  soldQty: 2, closingQty: 7,  recountAttempts: 0 },
  { id: "cc11", productId: "p11", productName: "Coca-Cola 2L",       category: "Sodas",   unitPrice: 65,  openingQty: 14, soldQty: 3, closingQty: 11, recountAttempts: 0 },
  { id: "cc12", productId: "p12", productName: "Pepsi 2L",           category: "Sodas",   unitPrice: 60,  openingQty: 11, soldQty: 2, closingQty: 9,  recountAttempts: 0 },
];

export const MOCK_SESSIONS: MockCashSession[] = [
  // Active session (OPEN)
  {
    id: "s-001",
    name: "Quart matin",
    status: "OPEN",
    openingCash: 2000,
    closingCash: null,
    openedAt: "2026-05-08T08:15:00",
    openedById: "emp-1",
    closedAt: null,
    closedById: null,
    openingMethod: "COUNTED",
    previousSessionId: null,
    notes: "",
    resolved: false,
    employees: [MOCK_EMPLOYEES[0], MOCK_EMPLOYEES[1]],
    counts: activeCounts,
    recounts: [],
    totalSales: 4350,
    cashSales: 2850,
    cardSales: 1200,
    transferSales: 300,
    txCount: 23,
    voidsCount: 0,
    noSalesCount: 0,
    largeDiscountsCount: 1,
  },
  // Closed session — yesterday evening with discrepancies
  {
    id: "s-002",
    name: "Quart soir",
    status: "CLOSED",
    openingCash: 1500,
    closingCash: 7100,
    openedAt: "2026-05-07T14:00:00",
    openedById: "emp-1",
    closedAt: "2026-05-07T21:32:00",
    closedById: "emp-2",
    openingMethod: "COUNTED",
    previousSessionId: null,
    notes: "Vente non enregistrée — un client est venu pendant la panne d'internet de 19h, payé cash.",
    resolved: false,
    employees: [MOCK_EMPLOYEES[0], MOCK_EMPLOYEES[1]],
    counts: closedCounts,
    recounts: [
      { id: "r1", countId: "cc1", type: "ITEM", attemptNumber: 1, previousValue: 20, newValue: 19, recountedById: "emp-2", recountedAt: "2026-05-07T21:15:00" },
      { id: "r2", countId: "cc1", type: "ITEM", attemptNumber: 2, previousValue: 19, newValue: 18, recountedById: "emp-2", recountedAt: "2026-05-07T21:18:00" },
      { id: "r3", countId: "cc3", type: "ITEM", attemptNumber: 1, previousValue: 12, newValue: 13, recountedById: "emp-2", recountedAt: "2026-05-07T21:20:00" },
      { id: "r4", countId: "cc3", type: "ITEM", attemptNumber: 2, previousValue: 13, newValue: 14, recountedById: "emp-2", recountedAt: "2026-05-07T21:22:00" },
      { id: "r5", countId: "cc3", type: "ITEM", attemptNumber: 3, previousValue: 14, newValue: 14, recountedById: "emp-2", recountedAt: "2026-05-07T21:25:00" },
      { id: "r6", countId: null,  type: "CASH", attemptNumber: 1, previousValue: 6800, newValue: 7100, recountedById: "emp-2", recountedAt: "2026-05-07T21:30:00" },
    ],
    totalSales: 5350,
    cashSales: 4350,
    cardSales: 800,
    transferSales: 200,
    txCount: 31,
    voidsCount: 2,
    noSalesCount: 1,
    largeDiscountsCount: 0,
  },
  // Clean closed session
  {
    id: "s-003",
    name: "Quart matin",
    status: "CLOSED",
    openingCash: 2000,
    closingCash: 5840,
    openedAt: "2026-05-07T08:00:00",
    openedById: "emp-3",
    closedAt: "2026-05-07T14:00:00",
    closedById: "emp-3",
    openingMethod: "COUNTED",
    previousSessionId: null,
    notes: "",
    resolved: true,
    employees: [MOCK_EMPLOYEES[2]],
    counts: closedCounts.map((c) => ({ ...c, closingQty: c.openingQty - c.soldQty, recountAttempts: 0 })),
    recounts: [],
    totalSales: 3840,
    cashSales: 3840,
    cardSales: 0,
    transferSales: 0,
    txCount: 18,
    voidsCount: 0,
    noSalesCount: 0,
    largeDiscountsCount: 0,
  },
  // Older closed session
  {
    id: "s-004",
    name: "Quart soir",
    status: "CLOSED",
    openingCash: 1800,
    closingCash: 6420,
    openedAt: "2026-05-06T14:00:00",
    openedById: "emp-2",
    closedAt: "2026-05-06T21:15:00",
    closedById: "emp-2",
    openingMethod: "CARRIED_OVER",
    previousSessionId: "s-005",
    notes: "",
    resolved: true,
    employees: [MOCK_EMPLOYEES[1], MOCK_EMPLOYEES[3]],
    counts: closedCounts.map((c) => ({ ...c, closingQty: c.openingQty - c.soldQty, recountAttempts: 0 })),
    recounts: [],
    totalSales: 4620,
    cashSales: 3200,
    cardSales: 1100,
    transferSales: 320,
    txCount: 24,
    voidsCount: 0,
    noSalesCount: 0,
    largeDiscountsCount: 0,
  },
];

export const getSessionById = (id: string): MockCashSession | undefined =>
  MOCK_SESSIONS.find((s) => s.id === id);

export const getEmployeeById = (id: string | null): MockEmployee | undefined =>
  id ? MOCK_EMPLOYEES.find((e) => e.id === id) : undefined;

// ─── Reconciliation helpers ───────────────────────────────────────────────
export function calcItemVariance(c: MockCountedItem): number {
  if (c.closingQty == null) return 0;
  const expected = c.openingQty - c.soldQty;
  return c.closingQty - expected; // negative = missing
}

export function calcCashVariance(s: MockCashSession): number {
  if (s.closingCash == null) return 0;
  const expected = s.openingCash + s.cashSales;
  return s.closingCash - expected;
}

export function calcMissingItemsValue(s: MockCashSession): number {
  return s.counts.reduce((sum, c) => {
    const v = calcItemVariance(c);
    return v < 0 ? sum + Math.abs(v) * c.unitPrice : sum;
  }, 0);
}

export function calcReconciliationSuggestion(s: MockCashSession): {
  type: "info" | "success" | "warning" | "danger";
  message: string;
} | null {
  if (s.closingCash == null) return null;
  const cashVar = calcCashVariance(s);
  const missingValue = calcMissingItemsValue(s);

  if (Math.abs(cashVar) < 10 && missingValue < 10) {
    return { type: "success", message: "Session équilibrée — aucune anomalie détectée." };
  }
  if (cashVar > 0 && missingValue > 0) {
    const diff = Math.abs(cashVar - missingValue);
    const tolerance = Math.max(cashVar, missingValue) * 0.15;
    if (diff < tolerance) {
      return {
        type: "warning",
        message: `Surplus caisse (${cashVar} C$) ≈ valeur items manquants (${missingValue} C$). Probables ventes non enregistrées.`,
      };
    }
  }
  if (cashVar > 0 && missingValue === 0) {
    return { type: "info", message: `Surplus caisse de ${cashVar} C$ sans items manquants. Pourboire ou erreur de change ?` };
  }
  if (cashVar < 0 && missingValue === 0) {
    return { type: "danger", message: `Déficit caisse de ${Math.abs(cashVar)} C$ sans items manquants. Vol cash possible.` };
  }
  return { type: "warning", message: "Écarts détectés — examen recommandé." };
}

// ─── Insights / risk scoring ──────────────────────────────────────────────
export interface MockEmployeeRiskScore {
  employeeId: string;
  employeeName: string;
  riskScore: number; // 0-100
  trend: "UP" | "STABLE" | "DOWN";
  totalSessions: number;
  totalRecounts: number;
  totalNegativeVariance: number;
  totalPositiveVariance: number;
  varianceRatio: number; // 0-1, higher = more negative variance
  voidsCount: number;
  noSalesCount: number;
  precision: number; // 0-100 (% sessions without anomalies)
}

export const MOCK_RISK_SCORES: MockEmployeeRiskScore[] = [
  {
    employeeId: "emp-2",
    employeeName: "Carlos Ramírez",
    riskScore: 78,
    trend: "UP",
    totalSessions: 18,
    totalRecounts: 12,
    totalNegativeVariance: 2340,
    totalPositiveVariance: 120,
    varianceRatio: 0.95,
    voidsCount: 8,
    noSalesCount: 4,
    precision: 56,
  },
  {
    employeeId: "emp-1",
    employeeName: "Maria González",
    riskScore: 31,
    trend: "STABLE",
    totalSessions: 22,
    totalRecounts: 4,
    totalNegativeVariance: 180,
    totalPositiveVariance: 95,
    varianceRatio: 0.65,
    voidsCount: 2,
    noSalesCount: 0,
    precision: 86,
  },
  {
    employeeId: "emp-3",
    employeeName: "Ana Martínez",
    riskScore: 8,
    trend: "DOWN",
    totalSessions: 19,
    totalRecounts: 1,
    totalNegativeVariance: 25,
    totalPositiveVariance: 70,
    varianceRatio: 0.26,
    voidsCount: 0,
    noSalesCount: 0,
    precision: 95,
  },
  {
    employeeId: "emp-5",
    employeeName: "Sofía Torres",
    riskScore: 14,
    trend: "STABLE",
    totalSessions: 12,
    totalRecounts: 2,
    totalNegativeVariance: 60,
    totalPositiveVariance: 40,
    varianceRatio: 0.6,
    voidsCount: 1,
    noSalesCount: 0,
    precision: 92,
  },
];

export const MOCK_TOP_VARIANCE_PRODUCTS = [
  { productId: "p5",  name: "Flor de Caña 7 ans", missingQty: 23, totalValue: 11960 },
  { productId: "p1",  name: "Toña 12oz",          missingQty: 47, totalValue: 1645 },
  { productId: "p3",  name: "Victoria Frost",     missingQty: 28, totalValue: 1120 },
  { productId: "p9",  name: "Cigarros Belmont",   missingQty: 14, totalValue: 1050 },
  { productId: "p4",  name: "Flor de Caña 4 ans", missingQty: 3,  totalValue: 960 },
];

// ─── Format helpers ───────────────────────────────────────────────────────
export const fmtNio = (n: number): string =>
  `C$ ${n.toLocaleString("es-NI", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

export const fmtDuration = (startIso: string, endIso: string): string => {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const minutes = Math.floor((end - start) / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
};
