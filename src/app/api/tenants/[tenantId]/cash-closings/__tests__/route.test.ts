/**
 * Cash Closings — API Integration Tests
 *
 * Tests GET and POST /api/tenants/[tenantId]/cash-closings:
 *
 * GET modes:
 *   1. ?date=&preview  → compute system totals from transactions (no DB save)
 *   2. ?date=          → return saved closing for that date (or null)
 *   3. (no params)     → return all closings list
 *
 * POST:
 *   4. Validation: closing_date required
 *   5. Computes system totals from transactions, inserts closing
 *   6. Links transactions to the new closing via cash_closing_id
 *
 * Supabase is fully mocked; no network calls are made.
 */

// ─── Mock next/server BEFORE any route import ─────────────────────────────────

class MockNextResponse {
  readonly status: number;
  private body: unknown;
  constructor(body: unknown, init?: { status?: number }) {
    this.body = body;
    this.status = init?.status ?? 200;
  }
  async json() { return this.body; }
  static json(body: unknown, init?: { status?: number }) {
    return new MockNextResponse(body, init);
  }
}

class MockNextRequest {
  readonly url: string;
  readonly method: string;
  private _body: unknown;
  constructor(url: string, init?: { method?: string; body?: string }) {
    this.url = url;
    this.method = init?.method ?? "GET";
    this._body = init?.body ? JSON.parse(init.body) : undefined;
  }
  async json() { return this._body; }
}

jest.mock("next/server", () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}));

import { GET, POST } from "../route";

// ─── Shared mutable state (reset in beforeEach) ───────────────────────────────

/** Returned by cash_closings.single() — represents the latest prior closing */
let lastClosingData: { closing_time: string } | null = null;
/** Returned when the transactions chain is awaited directly */
let txsData: { id: string; payment_method: string; total: number }[] = [];
/** Error returned by the transactions query (null = success) */
let txsError: { message: string } | null = null;
/** Returned when cash_closings chain is awaited directly (list mode) */
let closingsListData: any[] = [];

const insertCalls: { table: string; data: any }[] = [];
const updateCalls: { table: string; data: any; ids: string[] }[] = [];

// ─── Mock: Supabase ────────────────────────────────────────────────────────────

jest.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => buildMockSupabase(),
}));

function buildTableChain(table: string) {
  const chain: any = {
    select:  jest.fn().mockReturnThis(),
    eq:      jest.fn().mockReturnThis(),
    gte:     jest.fn().mockReturnThis(),
    lte:     jest.fn().mockReturnThis(),
    order:   jest.fn().mockReturnThis(),
    limit:   jest.fn().mockReturnThis(),

    /** Used for lastClosing lookups on cash_closings */
    single: jest.fn(async () => {
      if (table === "cash_closings") {
        return { data: lastClosingData, error: null };
      }
      return { data: null, error: null };
    }),

    /** Used for POST: cash_closings.insert().select().single() */
    insert: jest.fn((rows: any) => {
      const row = Array.isArray(rows) ? rows[0] : rows;
      insertCalls.push({ table, data: row });
      const inserted = { id: "closing-new-001", ...row };
      const ic: any = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn(async () => ({ data: inserted, error: null })),
      };
      return ic;
    }),

    /** Used for POST: transactions.update({cash_closing_id}).in("id", txIds) */
    update: jest.fn((data: any) => {
      const call: { table: string; data: any; ids: string[] } = { table, data, ids: [] };
      updateCalls.push(call);
      return {
        in: jest.fn((_col: string, ids: string[]) => {
          call.ids = ids;
          return Promise.resolve({ data: null, error: null });
        }),
        eq: jest.fn().mockReturnThis(),
      };
    }),
  };

  // Thenable — used when the chain itself is awaited (no .single() call)
  Object.defineProperty(chain, "then", {
    get: () => (ok: any, fail: any) => {
      if (table === "transactions") {
        return Promise.resolve({ data: txsData, error: txsError }).then(ok, fail);
      }
      if (table === "cash_closings") {
        return Promise.resolve({ data: closingsListData, error: null }).then(ok, fail);
      }
      return Promise.resolve({ data: null, error: null }).then(ok, fail);
    },
  });

  return chain;
}

function buildMockSupabase() {
  return { from: (table: string) => buildTableChain(table) };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeGET(
  path: string,
  tenantId = "tenant-1"
): [any, { params: Promise<{ tenantId: string }> }] {
  const req = new MockNextRequest(
    `http://localhost/api/tenants/${tenantId}/cash-closings${path}`
  );
  return [req, { params: Promise.resolve({ tenantId }) }];
}

function makePOST(
  body: object,
  tenantId = "tenant-1"
): [any, { params: Promise<{ tenantId: string }> }] {
  const req = new MockNextRequest(
    `http://localhost/api/tenants/${tenantId}/cash-closings`,
    { method: "POST", body: JSON.stringify(body) }
  );
  return [req, { params: Promise.resolve({ tenantId }) }];
}

// ─── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  lastClosingData  = null;
  txsData          = [];
  txsError         = null;
  closingsListData = [];
  insertCalls.length = 0;
  updateCalls.length = 0;
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /cash-closings", () => {

  // ── Preview mode (?date=&preview) ──────────────────────────────────────────

  describe("?date=&preview — compute system totals", () => {
    test("returns 200 with the expected shape", async () => {
      const [req, ctx] = makeGET("?date=2026-04-21&preview");
      const res = await GET(req, ctx);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(
        expect.objectContaining({
          system_cash: expect.any(Number),
          system_card: expect.any(Number),
          system_transfer: expect.any(Number),
          system_total: expect.any(Number),
          tx_count: expect.any(Number),
        })
      );
    });

    test("system_cash = sum of CASH transaction totals", async () => {
      txsData = [
        { id: "t1", payment_method: "CASH", total: 100 },
        { id: "t2", payment_method: "CASH", total: 50.5 },
        { id: "t3", payment_method: "CARD", total: 200 },
      ];
      const [req, ctx] = makeGET("?date=2026-04-21&preview");
      const body = await (await GET(req, ctx)).json();
      expect(body.system_cash).toBe(150.5);
    });

    test("system_card = sum of CARD transaction totals", async () => {
      txsData = [
        { id: "t1", payment_method: "CASH",     total: 100 },
        { id: "t2", payment_method: "CARD",     total: 200 },
        { id: "t3", payment_method: "CARD",     total: 75  },
      ];
      const [req, ctx] = makeGET("?date=2026-04-21&preview");
      const body = await (await GET(req, ctx)).json();
      expect(body.system_card).toBe(275);
    });

    test("system_transfer = sum of TRANSFER transaction totals", async () => {
      txsData = [
        { id: "t1", payment_method: "TRANSFER", total: 500 },
        { id: "t2", payment_method: "TRANSFER", total: 250.25 },
        { id: "t3", payment_method: "CASH",     total: 100 },
      ];
      const [req, ctx] = makeGET("?date=2026-04-21&preview");
      const body = await (await GET(req, ctx)).json();
      expect(body.system_transfer).toBe(750.25);
    });

    test("system_total = system_cash + system_card + system_transfer", async () => {
      txsData = [
        { id: "t1", payment_method: "CASH",     total: 100 },
        { id: "t2", payment_method: "CARD",     total: 200 },
        { id: "t3", payment_method: "TRANSFER", total: 50  },
      ];
      const [req, ctx] = makeGET("?date=2026-04-21&preview");
      const body = await (await GET(req, ctx)).json();
      expect(body.system_total).toBe(350);
      expect(body.system_total).toBe(body.system_cash + body.system_card + body.system_transfer);
    });

    test("tx_count = total number of transactions", async () => {
      txsData = [
        { id: "t1", payment_method: "CASH", total: 50 },
        { id: "t2", payment_method: "CARD", total: 80 },
        { id: "t3", payment_method: "CASH", total: 30 },
      ];
      const [req, ctx] = makeGET("?date=2026-04-21&preview");
      const body = await (await GET(req, ctx)).json();
      expect(body.tx_count).toBe(3);
    });

    test("rounds all totals to 2 decimal places", async () => {
      // 1/3 ≈ 0.333... → should be rounded to 0.33
      txsData = [
        { id: "t1", payment_method: "CASH", total: 1 / 3 },
        { id: "t2", payment_method: "CARD", total: 1 / 3 },
      ];
      const [req, ctx] = makeGET("?date=2026-04-21&preview");
      const body = await (await GET(req, ctx)).json();
      expect(body.system_cash.toString()).toMatch(/^\d+\.\d{1,2}$/);
      expect(body.system_card.toString()).toMatch(/^\d+\.\d{1,2}$/);
      // Verify actual rounding
      expect(body.system_cash).toBe(Math.round((1 / 3) * 100) / 100);
    });

    test("returns all zeros and tx_count=0 when no transactions", async () => {
      txsData = [];
      const [req, ctx] = makeGET("?date=2026-04-21&preview");
      const body = await (await GET(req, ctx)).json();
      expect(body).toEqual({
        system_cash:     0,
        system_card:     0,
        system_transfer: 0,
        system_total:    0,
        tx_count:        0,
      });
    });

    test("mixes all payment methods correctly in one pass", async () => {
      txsData = [
        { id: "t1", payment_method: "CASH",     total: 100 },
        { id: "t2", payment_method: "CARD",     total: 200 },
        { id: "t3", payment_method: "TRANSFER", total: 300 },
        { id: "t4", payment_method: "CASH",     total: 50  },
        { id: "t5", payment_method: "CARD",     total: 25  },
      ];
      const [req, ctx] = makeGET("?date=2026-04-21&preview");
      const body = await (await GET(req, ctx)).json();
      expect(body.system_cash).toBe(150);
      expect(body.system_card).toBe(225);
      expect(body.system_transfer).toBe(300);
      expect(body.system_total).toBe(675);
      expect(body.tx_count).toBe(5);
    });

    test("returns 500 when transactions query fails", async () => {
      txsError = { message: "DB connection error" };
      const [req, ctx] = makeGET("?date=2026-04-21&preview");
      const res = await GET(req, ctx);
      expect(res.status).toBe(500);
    });
  });

  // ── GET by date (saved closing) ────────────────────────────────────────────

  describe("?date= — return saved closing", () => {
    test("returns the saved closing for a given date", async () => {
      const closing = { id: "c1", closing_date: "2026-04-20", system_total: 1500, tenant_id: "tenant-1" };
      closingsListData = [closing];
      const [req, ctx] = makeGET("?date=2026-04-20");
      const body = await (await GET(req, ctx)).json();
      expect(body).toEqual(closing);
    });

    test("returns null when no closing exists for that date", async () => {
      closingsListData = [];
      const [req, ctx] = makeGET("?date=2026-04-20");
      const body = await (await GET(req, ctx)).json();
      expect(body).toBeNull();
    });
  });

  // ── GET list (all closings) ────────────────────────────────────────────────

  describe("no params — return all closings", () => {
    test("returns array of all closings", async () => {
      closingsListData = [
        { id: "c1", closing_date: "2026-04-20" },
        { id: "c2", closing_date: "2026-04-19" },
      ];
      const [req, ctx] = makeGET("");
      const body = await (await GET(req, ctx)).json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);
    });

    test("returns empty array when no closings exist", async () => {
      closingsListData = [];
      const [req, ctx] = makeGET("");
      const body = await (await GET(req, ctx)).json();
      expect(body).toEqual([]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("POST /cash-closings", () => {

  describe("Validation", () => {
    test("returns 400 when closing_date is missing", async () => {
      const [req, ctx] = makePOST({ declared_cash: 100 });
      const res = await POST(req, ctx);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/closing_date/);
    });
  });

  describe("System totals computation", () => {
    test("returns 201 on success", async () => {
      const [req, ctx] = makePOST({ closing_date: "2026-04-21" });
      const res = await POST(req, ctx);
      expect(res.status).toBe(201);
    });

    test("computes correct system_cash from transactions", async () => {
      txsData = [
        { id: "t1", payment_method: "CASH", total: 300 },
        { id: "t2", payment_method: "CASH", total: 200 },
        { id: "t3", payment_method: "CARD", total: 500 },
      ];
      const [req, ctx] = makePOST({ closing_date: "2026-04-21" });
      await POST(req, ctx);
      const inserted = insertCalls.find(c => c.table === "cash_closings");
      expect(inserted?.data.system_cash).toBe(500);
    });

    test("computes correct system_card from transactions", async () => {
      txsData = [
        { id: "t1", payment_method: "CARD", total: 800 },
        { id: "t2", payment_method: "CASH", total: 200 },
      ];
      const [req, ctx] = makePOST({ closing_date: "2026-04-21" });
      await POST(req, ctx);
      const inserted = insertCalls.find(c => c.table === "cash_closings");
      expect(inserted?.data.system_card).toBe(800);
    });

    test("computes system_total = cash + card + transfer", async () => {
      txsData = [
        { id: "t1", payment_method: "CASH",     total: 100 },
        { id: "t2", payment_method: "CARD",     total: 200 },
        { id: "t3", payment_method: "TRANSFER", total: 50  },
      ];
      const [req, ctx] = makePOST({ closing_date: "2026-04-21" });
      await POST(req, ctx);
      const inserted = insertCalls.find(c => c.table === "cash_closings");
      expect(inserted?.data.system_total).toBe(350);
    });

    test("rounds system totals to 2 decimal places", async () => {
      txsData = [{ id: "t1", payment_method: "CASH", total: 100.005 }];
      const [req, ctx] = makePOST({ closing_date: "2026-04-21" });
      await POST(req, ctx);
      const inserted = insertCalls.find(c => c.table === "cash_closings");
      // Math.round(100.005 * 100) / 100
      expect(inserted?.data.system_cash).toBe(Math.round(100.005 * 100) / 100);
    });

    test("stores declared values from request body", async () => {
      const [req, ctx] = makePOST({
        closing_date:      "2026-04-21",
        declared_cash:     1500,
        declared_card:     3200,
        declared_transfer: 400,
        notes:             "Todo cuadra",
        closed_by:         "María",
      });
      await POST(req, ctx);
      const inserted = insertCalls.find(c => c.table === "cash_closings");
      expect(inserted?.data).toMatchObject({
        declared_cash:     1500,
        declared_card:     3200,
        declared_transfer: 400,
        notes:             "Todo cuadra",
        closed_by:         "María",
      });
    });

    test("defaults declared values to 0 when not provided", async () => {
      const [req, ctx] = makePOST({ closing_date: "2026-04-21" });
      await POST(req, ctx);
      const inserted = insertCalls.find(c => c.table === "cash_closings");
      expect(inserted?.data.declared_cash).toBe(0);
      expect(inserted?.data.declared_card).toBe(0);
      expect(inserted?.data.declared_transfer).toBe(0);
    });
  });

  describe("Transaction linking", () => {
    test("links transactions to closing via cash_closing_id", async () => {
      txsData = [
        { id: "tx-1", payment_method: "CASH", total: 100 },
        { id: "tx-2", payment_method: "CARD", total: 200 },
      ];
      const [req, ctx] = makePOST({ closing_date: "2026-04-21" });
      await POST(req, ctx);
      const txUpdate = updateCalls.find(c => c.table === "transactions");
      expect(txUpdate?.data).toEqual({ cash_closing_id: "closing-new-001" });
      expect(txUpdate?.ids).toEqual(["tx-1", "tx-2"]);
    });

    test("does NOT run update when there are no transactions", async () => {
      txsData = [];
      const [req, ctx] = makePOST({ closing_date: "2026-04-21" });
      await POST(req, ctx);
      expect(updateCalls.filter(c => c.table === "transactions")).toHaveLength(0);
    });
  });
});
