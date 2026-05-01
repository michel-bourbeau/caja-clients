/**
 * Demo Mode — API Route Handler
 * This static `demo` segment takes precedence over the dynamic `[tenantId]` route.
 * All GET requests return mock data; POST/PUT return the submitted payload; DELETE returns 200.
 * No real database calls are made.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  DEMO_TENANT,
  DEMO_SETTINGS,
  DEMO_CATEGORIES,
  DEMO_PRODUCTS,
  DEMO_TAXES,
  DEMO_TRANSACTIONS,
  DEMO_EMPLOYEES,
  DEMO_ATTENDANCE,
  DEMO_SALARY_PAYMENTS,
  DEMO_PAYROLL_CONFIG,
  DEMO_ROLES,
  DEMO_LOYALTY_SETTINGS,
  DEMO_LOYAL_CUSTOMERS,
  DEMO_PAYMENT_STATUS,
  DEMO_CONTACTS_INITIAL,
  DEMO_SUPPLIERS_INITIAL,
  DEMO_EXPENSE_CATEGORIES,
  DEMO_FIXED_EXPENSES,
  DEMO_EXPENSES_INITIAL,
  DEMO_CASH_CLOSINGS_INITIAL,
} from "@/lib/demo/mockData";

// Module-level mutable stores for demo data (persists within the same server process)
let demoContacts = [...DEMO_CONTACTS_INITIAL];
let demoExpenses = [...DEMO_EXPENSES_INITIAL];
let demoSuppliers = [...DEMO_SUPPLIERS_INITIAL];
let demoCashClosings = [...DEMO_CASH_CLOSINGS_INITIAL];

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function newId() {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function handleGet(path: string[], searchParams: URLSearchParams): NextResponse {
  const [resource, id, sub, subId] = path;

  // GET /api/tenants/demo
  if (!resource) return json(DEMO_TENANT);

  switch (resource) {
    case "settings":
      return json(DEMO_SETTINGS);

    case "payment":
      return json(DEMO_PAYMENT_STATUS);

    case "features":
      return json({ features: DEMO_TENANT.features });

    case "categories":
      return json(DEMO_CATEGORIES);

    case "products":
      if (!id) return json(DEMO_PRODUCTS);
      if (sub === "variants") {
        const product = DEMO_PRODUCTS.find((p) => p.id === id);
        return json(product ? (product as any).variants ?? [] : []);
      }
      return json(DEMO_PRODUCTS.find((p) => p.id === id) ?? null);

    case "taxes":
      return json(DEMO_TAXES);

    case "transactions": {
      const isStats = searchParams.get("stats") === "true";
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const hasPage = searchParams.has("page");
      const page = parseInt(searchParams.get("page") ?? "1", 10);
      const limit = parseInt(searchParams.get("limit") ?? "50", 10);

      // Filter by date range when provided
      let txs = DEMO_TRANSACTIONS;
      if (from) txs = txs.filter((t) => t.created_at >= `${from}T00:00:00Z`);
      if (to)   txs = txs.filter((t) => t.created_at <= `${to}T23:59:59Z`);

      if (isStats) {
        const completed = txs.filter((t) => t.status === "COMPLETED");
        return json({
          count: completed.length,
          amount: completed.reduce((s, t) => s + t.total, 0),
          taxes: completed.reduce((s, t) => s + (t.tax ?? 0), 0),
          refundCount: 0,
          refundAmount: 0,
        });
      }

      // If no explicit page param, return plain array (some pages expect this)
      if (!hasPage) return json(txs);

      // Paginated response
      const total = txs.length;
      const offset = (page - 1) * limit;
      const data = txs.slice(offset, offset + limit);
      return json({ data, total });
    }

    case "employees":
      if (!id) return json(DEMO_EMPLOYEES);
      if (sub === "payments") return json(DEMO_SALARY_PAYMENTS.filter((p) => p.employee_id === id));
      return json(DEMO_EMPLOYEES.find((e) => e.id === id) ?? null);

    case "attendance":
      return json(DEMO_ATTENDANCE);

    case "payroll":
      if (sub === "payments") {
        const paidFrom = searchParams.get("paidFrom");
        const paidTo   = searchParams.get("paidTo");
        const from     = searchParams.get("from");
        const to       = searchParams.get("to");
        let payments = DEMO_SALARY_PAYMENTS;
        if (paidFrom && paidTo) {
          payments = payments.filter((p) => p.paid_at >= paidFrom && p.paid_at <= paidTo);
        } else if (from && to) {
          payments = payments.filter((p) => p.period_start === from && p.period_end === to);
        }
        return json(payments);
      }
      return json({
        config: DEMO_PAYROLL_CONFIG,
        periods: buildDemoPeriods(),
        summary: buildDemoPayrollSummary(),
      });

    case "expenses": {
      if (!id) return json(demoExpenses);
      const exp = demoExpenses.find((e) => e.id === id);
      return exp ? json(exp) : json({ message: "Not found" }, 404);
    }

    case "suppliers": {
      if (!id) return json(demoSuppliers);
      const sup = demoSuppliers.find((s) => s.id === id);
      return sup ? json(sup) : json({ message: "Not found" }, 404);
    }

    case "expense-categories":
      return json(DEMO_EXPENSE_CATEGORIES);

    case "fixed-expenses":
      return json(DEMO_FIXED_EXPENSES);

    case "roles":
      return json(DEMO_ROLES);

    case "stats":
      return json({
        totalProducts: DEMO_PRODUCTS.length,
        totalEmployees: DEMO_EMPLOYEES.filter((e) => e.status === "ACTIVE").length,
        totalTransactions: DEMO_TRANSACTIONS.length,
        totalRevenue: DEMO_TRANSACTIONS.reduce((s, t) => s + t.total, 0),
      });

    case "loyalty":
      if (id === "settings") return json(DEMO_LOYALTY_SETTINGS);
      if (id === "customers") {
        if (subId) {
          const customer = DEMO_LOYAL_CUSTOMERS.find((c) => c.id === subId);
          if (!customer) return json(null, 404);
          return json({ ...customer, total_accumulated: customer.total_accumulated, total_visits: customer.total_visits });
        }
        return json(DEMO_LOYAL_CUSTOMERS);
      }
      return json(null, 404);

    case "backup":
      return json({
        tenant: DEMO_TENANT,
        settings: DEMO_SETTINGS,
        products: DEMO_PRODUCTS,
        categories: DEMO_CATEGORIES,
        employees: DEMO_EMPLOYEES,
        transactions: DEMO_TRANSACTIONS.slice(0, 50),
        exportedAt: new Date().toISOString(),
      });

    case "contacts": {
      if (id) {
        const contact = demoContacts.find((c) => c.id === id);
        return contact ? json(contact) : json({ message: "Not found" }, 404);
      }
      const q = (searchParams.get("search") ?? "").toLowerCase();
      const filtered = q
        ? demoContacts.filter((c) =>
            c.full_name.toLowerCase().includes(q) ||
            (c.company_name ?? "").toLowerCase().includes(q) ||
            (c.email ?? "").toLowerCase().includes(q) ||
            (c.phone_number ?? "").toLowerCase().includes(q)
          )
        : demoContacts;
      return json({ contacts: filtered, total: filtered.length });
    }

    case "reports": {
      const type = searchParams.get("type") ?? "SUMMARY";
      const txns = DEMO_TRANSACTIONS;

      if (type === "SUMMARY") {
        const dailyMap = new Map<string, { date: string; sales: number; discount: number; tax: number; transactions: number; payment: Record<string, number> }>();
        const hourMap = new Map<number, { sales: number; transactions: number }>();
        let totalSales = 0, totalDiscount = 0, totalTax = 0;

        txns.forEach((tx) => {
          const d = new Date(tx.created_at);
          const local = new Date(d.getTime() - 6 * 60 * 60 * 1000);
          const dateStr = local.toISOString().split("T")[0];
          const hour = local.getUTCHours();

          totalSales += tx.total;
          totalDiscount += tx.discount ?? 0;
          totalTax += tx.tax ?? 0;

          if (!dailyMap.has(dateStr)) {
            dailyMap.set(dateStr, { date: dateStr, sales: 0, discount: 0, tax: 0, transactions: 0, payment: {} });
          }
          const day = dailyMap.get(dateStr)!;
          day.sales += tx.total;
          day.discount += tx.discount ?? 0;
          day.tax += tx.tax ?? 0;
          day.transactions += 1;
          day.payment[tx.payment_method] = (day.payment[tx.payment_method] ?? 0) + tx.total;

          const h = hourMap.get(hour) ?? { sales: 0, transactions: 0 };
          h.sales += tx.total;
          h.transactions += 1;
          hourMap.set(hour, h);
        });

        const byDay = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        const byHour = Array.from(hourMap.entries())
          .map(([hour, v]) => ({ hour, ...v }))
          .sort((a, b) => a.hour - b.hour);
        const bestHourEntry = byHour.reduce((best, h) => h.transactions > (best?.transactions ?? 0) ? h : best, byHour[0]);

        return json({
          summary: {
            totalSales: Math.round(totalSales * 100) / 100,
            totalDiscount: Math.round(totalDiscount * 100) / 100,
            totalTax: Math.round(totalTax * 100) / 100,
            totalTransactions: txns.length,
            averageTransaction: txns.length ? Math.round((totalSales / txns.length) * 100) / 100 : 0,
            bestHour: bestHourEntry?.hour ?? 0,
            bestHourCount: bestHourEntry?.transactions ?? 0,
          },
          byDay,
          byHour,
        });
      }

      if (type === "PRODUCT") {
        const productMap = new Map<string, { productId: string; name: string; quantity: number; revenue: number; count: number }>();
        txns.forEach((tx) => {
          (tx.items ?? []).forEach((item: any) => {
            const key = item.variantId ?? item.productId;
            const existing = productMap.get(key) ?? { productId: key, name: item.name ?? key, quantity: 0, revenue: 0, count: 0 };
            existing.quantity += item.quantity;
            existing.revenue += item.total ?? item.price * item.quantity;
            existing.count += 1;
            productMap.set(key, existing);
          });
        });
        const all = Array.from(productMap.values());
        return json({
          topByRevenue: [...all].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
          topByQuantity: [...all].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
        });
      }

      if (type === "PAYMENT") {
        const methodMap = new Map<string, { method: string; amount: number; count: number }>();
        txns.forEach((tx) => {
          const m = methodMap.get(tx.payment_method) ?? { method: tx.payment_method, amount: 0, count: 0 };
          m.amount += tx.total;
          m.count += 1;
          methodMap.set(tx.payment_method, m);
        });
        return json({ breakdown: Array.from(methodMap.values()) });
      }

      if (type === "BILAN") {
        let revenue = 0;
        let cogs = 0;
        let refundTotal = 0;
        let refundCount = 0;
        const uniqueTs = new Set<string>();
        txns.forEach((tx) => {
          const isRefund = tx.status === "REFUND";
          if (!isRefund) uniqueTs.add((tx.created_at as string).substring(0, 19));
          if (isRefund) {
            refundTotal += Math.abs(Number(tx.total));
            refundCount += 1;
          }
          (tx.items ?? []).forEach((item: any) => {
            const qty = Number(item.quantity) || 1;
            revenue += (Number(item.price) || 0) * qty;
            cogs    += (Number(item.cost_price) || 0) * qty;
          });
        });
        return json({ revenue, cogs, grossProfit: revenue - cogs, txCount: uniqueTs.size, refundTotal, refundCount });
      }

      return json({ error: "Unknown report type" }, 400);
    }

    case "bilan":
      // Legacy route kept for compatibility — redirect to reports BILAN handler
      return handleGet(["reports", ...path.slice(1)], new URLSearchParams("type=BILAN"));

    case "cash-closings": {
      const date = searchParams.get("date");
      const preview = searchParams.has("preview");

      if (date && preview) {
        // Compute system totals from DEMO_TRANSACTIONS for the requested date
        const txForDate = DEMO_TRANSACTIONS.filter((t) => {
          // Match by extracting local date (UTC-6, Nicaragua time) from ISO string
          const local = new Date(new Date(t.created_at).getTime() - 6 * 60 * 60 * 1000);
          return local.toISOString().startsWith(date);
        });
        const completed = txForDate.filter((t) => t.status === "COMPLETED");
        const system_cash     = round2(completed.filter((t) => t.payment_method === "CASH").reduce((s, t) => s + t.total, 0));
        const system_card     = round2(completed.filter((t) => t.payment_method === "CARD").reduce((s, t) => s + t.total, 0));
        const system_transfer = round2(completed.filter((t) => t.payment_method === "TRANSFER").reduce((s, t) => s + t.total, 0));
        return json({ system_cash, system_card, system_transfer, system_total: round2(system_cash + system_card + system_transfer), tx_count: completed.length });
      }

      if (date) {
        // Return saved closing for that date or null
        const closing = demoCashClosings.find((c) => c.closing_date === date) ?? null;
        return json(closing);
      }

      // Return full history newest first
      return json([...demoCashClosings].sort((a, b) => b.closing_date.localeCompare(a.closing_date)));
    }

    default:
      return json({ message: "Demo endpoint not found" }, 404);
  }
}

function handlePost(path: string[], body: unknown): NextResponse {
  const [resource, id, sub] = path;

  switch (resource) {
    case "products":
      return json({ ...(body as object), id: newId(), tenant_id: "demo", variants: [], created_at: new Date().toISOString() }, 201);

    case "categories":
      return json({ ...(body as object), id: newId(), tenant_id: "demo", created_at: new Date().toISOString() }, 201);

    case "taxes":
      return json({ ...(body as object), id: newId(), tenant_id: "demo", created_at: new Date().toISOString() }, 201);

    case "transactions": {
      const b = body as Record<string, unknown>;
      const subtotal = Array.isArray(b.items)
        ? (b.items as any[]).reduce((s: number, i: any) => s + (i.total ?? i.price * i.quantity), 0)
        : 0;
      const discount = Number(b.discount ?? 0);
      const taxAmount = subtotal * 0.15;
      const total = subtotal - discount + taxAmount;
      return json({
        ...b,
        id: `TXN-DEMO-${Date.now()}`,
        tenant_id: "demo",
        subtotal,
        tax: taxAmount,
        total,
        status: "COMPLETED",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, 201);
    }

    case "employees":
      if (sub === "payments") {
        return json({ ...(body as object), id: newId(), tenant_id: "demo", employee_id: id, paid_at: new Date().toISOString().split("T")[0], created_at: new Date().toISOString() }, 201);
      }
      return json({ ...(body as object), id: newId(), tenant_id: "demo", status: "ACTIVE", created_at: new Date().toISOString() }, 201);

    case "attendance":
      return json({ ...(body as object), id: newId(), tenant_id: "demo", created_at: new Date().toISOString() }, 201);

    case "roles":
      return json({ ...(body as object), id: newId(), tenant_id: "demo", is_system: false, created_at: new Date().toISOString() }, 201);

    case "loyalty":
      if (id === "customers") {
        return json({ ...(body as object), id: newId(), tenant_id: "demo", total_accumulated: 0, total_visits: 0, created_at: new Date().toISOString() }, 201);
      }
      if (id === "purchases") {
        return json({ ...(body as object), id: newId(), created_at: new Date().toISOString() }, 201);
      }
      return json({ ...(body as object), id: newId() }, 201);

    case "contacts": {
      const now = new Date().toISOString();
      const newContact = { ...(body as object), id: newId(), tenant_id: "demo", photo_url: null, created_at: now, updated_at: now } as any;
      demoContacts = [newContact, ...demoContacts];
      return json(newContact, 201);
    }

    case "expenses": {
      const now = new Date().toISOString();
      const newExpense = { ...(body as object), id: newId(), tenant_id: "demo", created_at: now, updated_at: now } as any;
      demoExpenses = [newExpense, ...demoExpenses];
      return json(newExpense, 201);
    }

    case "suppliers": {
      const now = new Date().toISOString();
      const newSupplier = { ...(body as object), id: newId(), tenant_id: "demo", created_at: now, updated_at: now } as any;
      demoSuppliers = [newSupplier, ...demoSuppliers];
      return json(newSupplier, 201);
    }

    case "fixed-expenses":
      return json({ ...(body as object), id: newId(), tenant_id: "demo", is_active: true, created_at: new Date().toISOString() }, 201);

    case "expense-categories":
      return json({ ...(body as object), id: newId(), tenant_id: "demo", created_at: new Date().toISOString() }, 201);

    case "cash-closings": {
      const b = body as Record<string, unknown>;
      const closing_date = b.closing_date as string;
      if (!closing_date) return json({ error: "closing_date is required" }, 400);

      // Compute system totals from DEMO_TRANSACTIONS for that date
      const txForDate = DEMO_TRANSACTIONS.filter((t) => {
        const local = new Date(new Date(t.created_at).getTime() - 6 * 60 * 60 * 1000);
        return local.toISOString().startsWith(closing_date);
      });
      const completed = txForDate.filter((t) => t.status === "COMPLETED");
      const system_cash     = round2(completed.filter((t) => t.payment_method === "CASH").reduce((s, t) => s + t.total, 0));
      const system_card     = round2(completed.filter((t) => t.payment_method === "CARD").reduce((s, t) => s + t.total, 0));
      const system_transfer = round2(completed.filter((t) => t.payment_method === "TRANSFER").reduce((s, t) => s + t.total, 0));
      const system_total    = round2(system_cash + system_card + system_transfer);

      const declared_cash     = round2(Number(b.declared_cash ?? 0));
      const declared_card     = round2(Number(b.declared_card ?? 0));
      const declared_transfer = round2(Number(b.declared_transfer ?? 0));

      const now2 = new Date().toISOString();
      const newClosing = {
        id: newId(),
        tenant_id: "demo",
        closing_date,
        system_cash, system_card, system_transfer, system_total,
        declared_cash, declared_card, declared_transfer,
        diff_cash:     round2(declared_cash - system_cash),
        diff_card:     round2(declared_card - system_card),
        diff_transfer: round2(declared_transfer - system_transfer),
        notes: (b.notes as string) ?? null,
        closed_by: (b.closed_by as string) ?? null,
        closing_time: now2,
        created_at: now2,
      };
      demoCashClosings = [newClosing, ...demoCashClosings];
      return json(newClosing, 201);
    }

    default:
      return json({ ...(body as object), id: newId() }, 201);
  }
}

function handlePut(path: string[], body: unknown): NextResponse {
  const [resource, id] = path;
  const now = new Date().toISOString();
  if (resource === "contacts" && id) {
    const updated = { ...(body as object), id, tenant_id: "demo", updated_at: now } as any;
    demoContacts = demoContacts.map((c) => c.id === id ? { ...c, ...updated } : c);
    return json(updated);
  }
  if (resource === "expenses" && id) {
    const updated = { ...(body as object), id, tenant_id: "demo", updated_at: now } as any;
    demoExpenses = demoExpenses.map((e) => e.id === id ? { ...e, ...updated } : e);
    return json(updated);
  }
  if (resource === "suppliers" && id) {
    const updated = { ...(body as object), id, tenant_id: "demo", updated_at: now } as any;
    demoSuppliers = demoSuppliers.map((s) => s.id === id ? { ...s, ...updated } : s);
    return json(updated);
  }
  return json({ ...(body as object), updated_at: now });
}

function handleDelete(path: string[]): NextResponse {
  const [resource, id] = path;
  if (resource === "contacts" && id) {
    demoContacts = demoContacts.filter((c) => c.id !== id);
  }
  if (resource === "expenses" && id) {
    demoExpenses = demoExpenses.filter((e) => e.id !== id);
  }
  if (resource === "suppliers" && id) {
    demoSuppliers = demoSuppliers.filter((s) => s.id !== id);
  }
  return json({ success: true });
}

// ─── Build realistic payroll periods ─────────────────────────────────────────
function buildDemoPeriods() {
  const periods = [];
  const now = new Date();
  // Find the most recent Monday (weekStartDay = 1)
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon…
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - daysToMonday);
  thisMonday.setHours(0, 0, 0, 0);

  for (let i = 0; i < 8; i++) {
    const start = new Date(thisMonday);
    start.setDate(thisMonday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleString("es-NI", { day: "numeric", month: "short" });
    periods.push({
      id: `period-${i}`,
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      label: `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`,
      isCurrent: i === 0,
    });
  }
  return periods;
}

function buildDemoPayrollSummary() {
  return DEMO_EMPLOYEES.filter((e) => e.status === "ACTIVE").map((emp) => {
    const hourlyRate = emp.salary / 160;
    const hoursWorked = 40;
    return {
      employeeId: emp.id,
      firstName: emp.first_name,
      lastName: emp.last_name,
      hourlyRate,
      hoursWorked,
      shiftsCount: 5,
      salaryDue: hourlyRate * hoursWorked,
      hasOpenShift: false,
    };
  });
}

// ─── Route Handlers ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const searchParams = new URL(req.url).searchParams;
  return handleGet(path ?? [], searchParams);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  let body: unknown = {};
  try { body = await req.json(); } catch { /* empty body */ }
  return handlePost(path ?? [], body);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  let body: unknown = {};
  try { body = await req.json(); } catch { /* empty body */ }
  return handlePut(path ?? [], body);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleDelete(path ?? []);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  let body: unknown = {};
  try { body = await req.json(); } catch { /* empty body */ }
  return handlePut(path ?? [], body);
}
