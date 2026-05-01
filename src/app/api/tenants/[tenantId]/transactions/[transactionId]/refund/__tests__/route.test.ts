/**
 * Refund Flow — API Integration Tests
 *
 * Tests POST /api/tenants/[tenantId]/transactions/[transactionId]/refund:
 *   1. Marks original as REFUNDED, creates REFUND-{id} with negated amounts
 *   2. Restores product stock and variant stock
 *   3. Sets cashier_name with optional reason prefix
 *   4. Error cases: not found, wrong status
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
    this.method = init?.method ?? "POST";
    this._body = init?.body ? JSON.parse(init.body) : {};
  }
  async json() { return this._body; }
}

jest.mock("next/server", () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}));

import { POST } from "../route";

// ─── Shared mutable state (reset in beforeEach) ───────────────────────────────

let txSelectData: Record<string, any> | null = null;
let productStock: Record<string, number> = {};
let variantStock: Record<string, number> = {};
const updateCalls: { table: string; data: any; filters: Record<string, any> }[] = [];
const insertCalls: { table: string; data: any }[] = [];

// ─── Mock: Supabase ────────────────────────────────────────────────────────────

jest.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => buildMockSupabase(),
}));

function buildTableChain(table: string) {
  const capturedFilters: Record<string, any> = {};

  /** SELECT chain — resolved by .single() */
  const buildSelectChain = () => {
    const sc: any = {
      eq: jest.fn((col: string, val: any) => { capturedFilters[col] = val; return sc; }),
      single: jest.fn(async () => {
        if (table === "transactions") {
          return txSelectData
            ? { data: txSelectData, error: null }
            : { data: null, error: { message: "Transaction introuvable" } };
        }
        if (table === "products") {
          const id = capturedFilters["id"];
          return { data: { stock_quantity: productStock[id] ?? 10 }, error: null };
        }
        if (table === "product_variants") {
          const id = capturedFilters["id"];
          return { data: { stock_quantity: variantStock[id] ?? 5 }, error: null };
        }
        return { data: null, error: null };
      }),
    };
    return sc;
  };

  /** UPDATE chain — thenable (code does `await .update(...).eq(...).eq(...)`) */
  const buildUpdateChain = (data: any) => {
    const call: { table: string; data: any; filters: Record<string, any> } = {
      table,
      data,
      filters: {},
    };
    updateCalls.push(call);
    const uc: any = {
      eq: jest.fn((col: string, val: any) => { call.filters[col] = val; return uc; }),
    };
    Object.defineProperty(uc, "then", {
      get: () => (ok: any, fail: any) =>
        Promise.resolve({ data: null, error: null }).then(ok, fail),
    });
    return uc;
  };

  /** INSERT chain — .select().single() for transactions, thenable for stock_movements */
  const buildInsertChain = (rows: any) => {
    const row = Array.isArray(rows) ? rows[0] : rows;
    insertCalls.push({ table, data: row });
    const ic: any = {
      select: jest.fn(() => ic),
      single: jest.fn(async () => ({ data: { ...row }, error: null })),
    };
    Object.defineProperty(ic, "then", {
      get: () => (ok: any, fail: any) =>
        Promise.resolve({ data: row, error: null }).then(ok, fail),
    });
    return ic;
  };

  return {
    select: jest.fn(() => buildSelectChain()),
    update: jest.fn((data: any) => buildUpdateChain(data)),
    insert: jest.fn((rows: any) => buildInsertChain(rows)),
  };
}

function buildMockSupabase() {
  return { from: (table: string) => buildTableChain(table) };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(
  transactionId: string,
  body: object = {},
  tenantId = "tenant-1"
): [any, { params: Promise<{ tenantId: string; transactionId: string }> }] {
  const req = new MockNextRequest(
    `http://localhost/api/tenants/${tenantId}/transactions/${transactionId}/refund`,
    { method: "POST", body: JSON.stringify(body) }
  );
  return [req, { params: Promise.resolve({ tenantId, transactionId }) }];
}

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const TX_BASE = {
  id:                 "tx-001",
  tenant_id:          "tenant-1",
  status:             "COMPLETED",
  cashier_id:         "cashier-1",
  cashier_name:       "Carlos",
  items:              [{ productId: "prod-cafe", name: "Café", quantity: 2, price: 50 }],
  subtotal:           100,
  discount:            10,
  tax:                 13.5,
  tax_breakdown:      [{ name: "IVA", rate: 15, amount: 13.5 }],
  total:              103.5,
  cost_of_goods_sold:  40,
  profit:              63.5,
  payment_method:     "CASH",
  currency_paid:      "NIO",
};

// ─── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  txSelectData = { ...TX_BASE, items: [...TX_BASE.items] };
  productStock  = { "prod-cafe": 10, "prod-pan": 5 };
  variantStock  = { "var-grande": 8 };
  updateCalls.length = 0;
  insertCalls.length = 0;
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /transactions/[id]/refund", () => {

  describe("Happy path — response & refund transaction", () => {
    test("returns 201 with the refund transaction", async () => {
      const [req, ctx] = makeRequest("tx-001");
      const res = await POST(req, ctx);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBe("REFUND-tx-001");
    });

    test("refund id = REFUND-{transactionId}", async () => {
      const [req, ctx] = makeRequest("tx-001");
      await POST(req, ctx);
      const insert = insertCalls.find(c => c.table === "transactions");
      expect(insert?.data.id).toBe("REFUND-tx-001");
    });

    test("negates all financial fields in refund transaction", async () => {
      const [req, ctx] = makeRequest("tx-001");
      await POST(req, ctx);
      const insert = insertCalls.find(c => c.table === "transactions");
      expect(insert?.data).toMatchObject({
        subtotal:           -100,
        discount:           -10,
        tax:                -13.5,
        total:              -103.5,
        cost_of_goods_sold: -40,
        profit:             -63.5,
      });
    });

    test("refund items have negative quantities and totals", async () => {
      const [req, ctx] = makeRequest("tx-001");
      await POST(req, ctx);
      const insert = insertCalls.find(c => c.table === "transactions");
      const items = insert?.data.items;
      expect(items[0].quantity).toBe(-2);
      // total = -(price × |qty|) = -(50 × 2) = -100
      expect(items[0].total).toBe(-100);
    });

    test("amount_received and change are 0 in refund transaction", async () => {
      const [req, ctx] = makeRequest("tx-001");
      await POST(req, ctx);
      const insert = insertCalls.find(c => c.table === "transactions");
      expect(insert?.data.amount_received).toBe(0);
      expect(insert?.data.change).toBe(0);
    });

    test("preserves payment_method and currency_paid from original", async () => {
      const [req, ctx] = makeRequest("tx-001");
      await POST(req, ctx);
      const insert = insertCalls.find(c => c.table === "transactions");
      expect(insert?.data.payment_method).toBe("CASH");
      expect(insert?.data.currency_paid).toBe("NIO");
    });

    test("status in refund transaction is REFUND (not REFUNDED)", async () => {
      const [req, ctx] = makeRequest("tx-001");
      await POST(req, ctx);
      const insert = insertCalls.find(c => c.table === "transactions");
      expect(insert?.data.status).toBe("REFUND");
    });
  });

  describe("Marking original as REFUNDED", () => {
    test("marks original transaction as REFUNDED", async () => {
      const [req, ctx] = makeRequest("tx-001");
      await POST(req, ctx);
      const txUpdate = updateCalls.find(c => c.table === "transactions");
      expect(txUpdate?.data).toEqual({ status: "REFUNDED" });
    });

    test("update targets the correct transaction and tenant", async () => {
      const [req, ctx] = makeRequest("tx-001");
      await POST(req, ctx);
      const txUpdate = updateCalls.find(c => c.table === "transactions");
      expect(txUpdate?.filters).toMatchObject({ id: "tx-001", tenant_id: "tenant-1" });
    });
  });

  describe("Cashier name", () => {
    test("defaults to 'Remboursement de {id}' when no reason given", async () => {
      const [req, ctx] = makeRequest("tx-001");
      await POST(req, ctx);
      const insert = insertCalls.find(c => c.table === "transactions");
      expect(insert?.data.cashier_name).toBe("Remboursement de tx-001");
    });

    test("prefixes reason when body.reason is provided", async () => {
      const [req, ctx] = makeRequest("tx-001", { reason: "Produit défectueux" });
      await POST(req, ctx);
      const insert = insertCalls.find(c => c.table === "transactions");
      expect(insert?.data.cashier_name).toBe("Remboursement: Produit défectueux");
    });

    test("ignores whitespace-only reason (treated as empty)", async () => {
      const [req, ctx] = makeRequest("tx-001", { reason: "   " });
      await POST(req, ctx);
      const insert = insertCalls.find(c => c.table === "transactions");
      expect(insert?.data.cashier_name).toBe("Remboursement de tx-001");
    });
  });

  describe("Stock restoration", () => {
    test("restores product stock for a non-variant item", async () => {
      // prod-cafe had 10, qty returned = 2 → 12
      const [req, ctx] = makeRequest("tx-001");
      await POST(req, ctx);
      const update = updateCalls.find(c => c.table === "products");
      expect(update?.data).toEqual({ stock_quantity: 12 });
      expect(update?.filters).toMatchObject({ id: "prod-cafe" });
    });

    test("restores variant stock when variantId is present", async () => {
      // var-grande had 8, qty returned = 3 → 11
      txSelectData = {
        ...TX_BASE,
        items: [{ productId: "prod-cafe", variantId: "var-grande", name: "Café Grande", quantity: 3, price: 60 }],
      };
      const [req, ctx] = makeRequest("tx-001");
      await POST(req, ctx);
      const update = updateCalls.find(c => c.table === "product_variants");
      expect(update?.data).toEqual({ stock_quantity: 11 });
      expect(update?.filters).toMatchObject({ id: "var-grande" });
    });

    test("does NOT update products table when item has a variantId", async () => {
      txSelectData = {
        ...TX_BASE,
        items: [{ productId: "prod-cafe", variantId: "var-grande", name: "Café Grande", quantity: 3, price: 60 }],
      };
      const [req, ctx] = makeRequest("tx-001");
      await POST(req, ctx);
      const productUpdate = updateCalls.find(c => c.table === "products");
      expect(productUpdate).toBeUndefined();
    });

    test("restores each product stock independently in multi-item sale", async () => {
      // cafe: 10+2=12, pan: 5+5=10
      txSelectData = {
        ...TX_BASE,
        items: [
          { productId: "prod-cafe", name: "Café", quantity: 2, price: 50 },
          { productId: "prod-pan",  name: "Pan",  quantity: 5, price: 20 },
        ],
      };
      const [req, ctx] = makeRequest("tx-001");
      await POST(req, ctx);
      const cafeUpdate = updateCalls.find(c => c.table === "products" && c.filters?.id === "prod-cafe");
      const panUpdate  = updateCalls.find(c => c.table === "products" && c.filters?.id === "prod-pan");
      expect(cafeUpdate?.data).toEqual({ stock_quantity: 12 });
      expect(panUpdate?.data).toEqual({ stock_quantity: 10 });
    });

    test("skips items with no productId and no variantId without crashing", async () => {
      txSelectData = {
        ...TX_BASE,
        items: [{ name: "Service de livraison", quantity: 1, price: 100 }],
      };
      const [req, ctx] = makeRequest("tx-001");
      const res = await POST(req, ctx);
      expect(res.status).toBe(201);
      expect(updateCalls.filter(c => c.table === "products")).toHaveLength(0);
      expect(updateCalls.filter(c => c.table === "product_variants")).toHaveLength(0);
    });
  });

  describe("Error cases", () => {
    test("returns 404 when transaction not found", async () => {
      txSelectData = null;
      const [req, ctx] = makeRequest("tx-nonexistent");
      const res = await POST(req, ctx);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toMatch(/introuvable/i);
    });

    test("returns 400 when original status is REFUNDED", async () => {
      txSelectData = { ...TX_BASE, status: "REFUNDED" };
      const [req, ctx] = makeRequest("tx-001");
      const res = await POST(req, ctx);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/REFUNDED/);
    });

    test("returns 400 when original status is PENDING", async () => {
      txSelectData = { ...TX_BASE, status: "PENDING" };
      const [req, ctx] = makeRequest("tx-001");
      const res = await POST(req, ctx);
      expect(res.status).toBe(400);
    });

    test("does NOT create refund tx when original is not found", async () => {
      txSelectData = null;
      const [req, ctx] = makeRequest("tx-nonexistent");
      await POST(req, ctx);
      expect(insertCalls).toHaveLength(0);
    });

    test("does NOT update any stock when original is not found", async () => {
      txSelectData = null;
      const [req, ctx] = makeRequest("tx-nonexistent");
      await POST(req, ctx);
      expect(updateCalls).toHaveLength(0);
    });

    test("does NOT mark any transaction REFUNDED when status check fails", async () => {
      txSelectData = { ...TX_BASE, status: "VOID" };
      const [req, ctx] = makeRequest("tx-001");
      await POST(req, ctx);
      expect(updateCalls.filter(c => c.table === "transactions")).toHaveLength(0);
    });
  });
});
