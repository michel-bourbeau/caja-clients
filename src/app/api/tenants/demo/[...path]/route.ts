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
import { Locale, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, LOCALES, getIntlLocale } from "@/i18n/config";
import { toNicaraguaDateString } from "@/lib/utils/formatters";

const SUPPORTED_LOCALES: readonly string[] = Object.values(LOCALES);

/** Reads the active UI language from the cookie set by LanguageContext, defaulting to es-ni. */
function resolveLocale(req: NextRequest): Locale {
  const cookie = req.cookies.get(LOCALE_STORAGE_KEY)?.value;
  return cookie && SUPPORTED_LOCALES.includes(cookie) ? (cookie as Locale) : DEFAULT_LOCALE;
}

/** Demo categories translated into the active locale (name/description only — data otherwise unchanged). */
function localizeCategories(locale: Locale) {
  return DEMO_CATEGORIES.map((c) => ({
    ...c,
    name: c.name_i18n[locale] ?? c.name,
    description: c.description_i18n[locale] ?? c.description,
  }));
}

/** Demo products (and their variants) translated into the active locale. */
function localizeProducts(locale: Locale) {
  return DEMO_PRODUCTS.map((p) => ({
    ...p,
    name: p.name_i18n[locale] ?? p.name,
    description: p.description_i18n[locale] ?? p.description,
    variants: p.variants.map((v) => ({
      ...v,
      label: v.label_i18n[locale] ?? v.label,
    })),
  }));
}

/** Demo transactions with their line-item names re-mapped to the already-localized products. */
function localizeTransactions(locale: Locale, products: ReturnType<typeof localizeProducts>) {
  const nameByKey = new Map<string, string>();
  products.forEach((p) => {
    nameByKey.set(p.id, p.name);
    p.variants.forEach((v) => nameByKey.set(v.id, `${p.name} — ${v.label}`));
  });
  return DEMO_TRANSACTIONS.map((tx) => ({
    ...tx,
    items: tx.items.map((item) => ({
      ...item,
      name: nameByKey.get((item as { variantId?: string }).variantId ?? item.productId) ?? item.name,
    })),
  }));
}

/** Demo roles translated into the active locale (name/description only — permissions otherwise unchanged). */
function localizeRoles(locale: Locale) {
  return DEMO_ROLES.map((r) => ({
    ...r,
    name: r.name_i18n[locale] ?? r.name,
    description: r.description_i18n[locale] ?? r.description,
  }));
}

/** Demo taxes translated into the active locale (name only). */
function localizeTaxes(locale: Locale) {
  return DEMO_TAXES.map((t) => ({
    ...t,
    name: t.name_i18n[locale] ?? t.name,
  }));
}

/** Demo expense categories translated into the active locale (name/description only). */
function localizeExpenseCategories(locale: Locale) {
  return DEMO_EXPENSE_CATEGORIES.map((c) => ({
    ...c,
    name: c.name_i18n[locale] ?? c.name,
    description: c.description_i18n[locale] ?? c.description,
  }));
}

/** Maps each expense category's default (Spanish) name to its localized name — used to
 * re-map the free-text `category` field stored on fixed expenses/expenses. */
function buildCategoryNameMap(locale: Locale): Map<string, string> {
  const map = new Map<string, string>();
  DEMO_EXPENSE_CATEGORIES.forEach((c) => map.set(c.name, c.name_i18n[locale] ?? c.name));
  return map;
}

/** Demo fixed expenses translated into the active locale (name/notes + category name). */
function localizeFixedExpenses(locale: Locale) {
  const categoryNames = buildCategoryNameMap(locale);
  return DEMO_FIXED_EXPENSES.map((f) => ({
    ...f,
    name: f.name_i18n[locale] ?? f.name,
    category: categoryNames.get(f.category) ?? f.category,
    notes: f.notes_i18n[locale] ?? f.notes,
  }));
}

/** Demo expenses translated into the active locale (description/notes + category name).
 * Accepts the live (mutable) expenses list so edits/creations made during the demo session are preserved. */
function localizeExpenses(expenses: typeof DEMO_EXPENSES_INITIAL, locale: Locale) {
  const categoryNames = buildCategoryNameMap(locale);
  return expenses.map((e) => ({
    ...e,
    description: e.description_i18n?.[locale] ?? e.description,
    category: categoryNames.get(e.category) ?? e.category,
    notes: e.notes_i18n?.[locale] ?? e.notes,
  }));
}

/** Demo suppliers translated into the active locale (description only — company name unchanged). */
function localizeSuppliers(suppliers: typeof DEMO_SUPPLIERS_INITIAL, locale: Locale) {
  return suppliers.map((s) => ({
    ...s,
    description: s.description_i18n?.[locale] ?? s.description,
  }));
}

/** Demo cash closings translated into the active locale (notes only). */
function localizeCashClosings(closings: typeof DEMO_CASH_CLOSINGS_INITIAL, locale: Locale) {
  return closings.map((c) => ({
    ...c,
    notes: c.notes_i18n?.[locale] ?? c.notes,
  }));
}

/** Demo contacts translated into the active locale (position/notes only). */
function localizeContacts(contacts: typeof DEMO_CONTACTS_INITIAL, locale: Locale) {
  return contacts.map((c) => ({
    ...c,
    position: c.position_i18n?.[locale] ?? c.position,
    notes: c.notes_i18n?.[locale] ?? c.notes,
  }));
}

// Module-level mutable stores for demo data (persists within the same server process)
let demoContacts = [...DEMO_CONTACTS_INITIAL];
let demoExpenses = [...DEMO_EXPENSES_INITIAL];
let demoSuppliers = [...DEMO_SUPPLIERS_INITIAL];
let demoCashClosings = [...DEMO_CASH_CLOSINGS_INITIAL];

function json(data: unknown, status = 200) {
  // Responses vary by the `caja_locale` cookie (product/category names) — never cache them.
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function newId() {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function handleGet(path: string[], searchParams: URLSearchParams, locale: Locale): NextResponse {
  const [resource, id, sub, subId] = path;

  // GET /api/tenants/demo
  if (!resource) return json(DEMO_TENANT);

  // Localized once per request and reused across every case that exposes product/category names.
  const categories = localizeCategories(locale);
  const products = localizeProducts(locale);

  switch (resource) {
    case "settings":
      return json(DEMO_SETTINGS);

    case "payment":
      return json(DEMO_PAYMENT_STATUS);

    case "features":
      return json({ features: DEMO_TENANT.features });

    case "categories":
      return json(categories);

    case "products":
      if (!id) return json(products);
      if (sub === "variants") {
        const product = products.find((p) => p.id === id);
        return json(product ? product.variants ?? [] : []);
      }
      return json(products.find((p) => p.id === id) ?? null);

    case "taxes":
      return json(localizeTaxes(locale));

    case "transactions": {
      const isStats = searchParams.get("stats") === "true";
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const hasPage = searchParams.has("page");
      const page = parseInt(searchParams.get("page") ?? "1", 10);
      const limit = parseInt(searchParams.get("limit") ?? "50", 10);

      // Filter by date range when provided
      let txs = localizeTransactions(locale, products);
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
          payments = payments.filter((p) => p.paid_at != null && p.paid_at >= paidFrom && p.paid_at <= paidTo);
        } else if (from && to) {
          payments = payments.filter((p) => p.period_start === from && p.period_end === to);
        }
        return json(payments);
      }
      return json({
        config: DEMO_PAYROLL_CONFIG,
        periods: buildDemoPeriods(locale),
        summary: buildDemoPayrollSummary(),
      });

    case "expenses": {
      const expenses = localizeExpenses(demoExpenses, locale);
      if (!id) return json(expenses);
      const exp = expenses.find((e) => e.id === id);
      return exp ? json(exp) : json({ message: "Not found" }, 404);
    }

    case "suppliers": {
      const suppliers = localizeSuppliers(demoSuppliers, locale);
      if (!id) return json(suppliers);
      const sup = suppliers.find((s) => s.id === id);
      return sup ? json(sup) : json({ message: "Not found" }, 404);
    }

    case "expense-categories":
      return json(localizeExpenseCategories(locale));

    case "fixed-expenses":
      return json(localizeFixedExpenses(locale));

    case "roles":
      return json(localizeRoles(locale));

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
        products,
        categories,
        employees: DEMO_EMPLOYEES,
        transactions: DEMO_TRANSACTIONS.slice(0, 50),
        exportedAt: new Date().toISOString(),
      });

    case "contacts": {
      const contacts = localizeContacts(demoContacts, locale);
      if (id) {
        const contact = contacts.find((c) => c.id === id);
        return contact ? json(contact) : json({ message: "Not found" }, 404);
      }
      const q = (searchParams.get("search") ?? "").toLowerCase();
      const filtered = q
        ? contacts.filter((c) =>
            c.full_name.toLowerCase().includes(q) ||
            (c.company_name ?? "").toLowerCase().includes(q) ||
            (c.email ?? "").toLowerCase().includes(q) ||
            (c.phone_number ?? "").toLowerCase().includes(q)
          )
        : contacts;
      return json({ contacts: filtered, total: filtered.length });
    }

    case "reports": {
      const type = searchParams.get("type") ?? "SUMMARY";
      const txns = localizeTransactions(locale, products);

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
      return handleGet(["reports", ...path.slice(1)], new URLSearchParams("type=BILAN"), locale);

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
        const closing = localizeCashClosings(demoCashClosings, locale).find((c) => c.closing_date === date) ?? null;
        return json(closing);
      }

      // Return full history newest first
      return json(localizeCashClosings([...demoCashClosings].sort((a, b) => b.closing_date.localeCompare(a.closing_date)), locale));
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
        return json({ ...(body as object), id: newId(), tenant_id: "demo", employee_id: id, paid_at: toNicaraguaDateString(new Date()), created_at: new Date().toISOString() }, 201);
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
        notes_i18n: { "es-ni": (b.notes as string) ?? "", en: (b.notes as string) ?? "", fr: (b.notes as string) ?? "" },
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
// "Today" and the week's day-of-week are both resolved in Nicaragua local time (not the
// server process's timezone), so the current period always matches what the rest of the
// app (and `toNicaraguaDateString`) considers "today" — see `generatePeriods()` in
// /api/tenants/[tenantId]/payroll/route.ts for the equivalent production-tenant logic.
function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function buildDemoPeriods(locale: Locale) {
  const periods = [];
  const todayStr = toNicaraguaDateString(new Date());
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(ty, tm - 1, td)).getUTCDay(); // 0=Sun, 1=Mon…
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = addDaysStr(todayStr, -daysToMonday);

  const fmt = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleString(getIntlLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" });
  };

  for (let i = 0; i < 8; i++) {
    const start = addDaysStr(thisMonday, -i * 7);
    const end = addDaysStr(start, 6);
    periods.push({
      id: `period-${i}`,
      startDate: start,
      endDate: end,
      label: `${fmt(start)} – ${fmt(end)} ${end.slice(0, 4)}`,
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
  return handleGet(path ?? [], searchParams, resolveLocale(req));
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
