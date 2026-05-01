/**
 * POS Flow — API Integration Tests
 *
 * Tests the complete POST /api/tenants/[tenantId]/transactions handler:
 *   1. Happy path: validate stock → calculate totals/taxes/COGS → insert tx → decrement inventory
 *   2. Edge cases: empty cart, insufficient stock, discount, taxes, variants
 *   3. Error handling: plan expired
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

  constructor(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
    this.url = url;
    this.method = init?.method ?? "POST";
    this._body = init?.body ? JSON.parse(init.body) : undefined;
  }

  async json() { return this._body; }
  headers = { get: (_k: string) => null };
}

jest.mock("next/server", () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}));

import { POST } from "../route";

// ─── Shared mutable state (reset in beforeEach) ───────────────────────────────

let productsMockData: any[] = [];
let variantsMockData: any[] = [];
let taxesMockData: any[] = [];
let planValid = true;
const updateCalls: { table: string; data: any; filters: Record<string, any> }[] = [];
const insertCalls: { table: string; data: any }[] = [];

// ─── Mock: Supabase ────────────────────────────────────────────────────────────

jest.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => buildMockSupabase(),
}));

function buildTableChain(table: string) {
  let pendingInIds: string[] = [];

  const resolve = async (): Promise<{ data: any; error: any }> => {
    if (table === "tenants") return { data: { paid_until: null }, error: null };
    if (table === "products") {
      const rows = pendingInIds.length
        ? productsMockData.filter((p) => pendingInIds.includes(p.id))
        : productsMockData;
      return { data: rows, error: null };
    }
    if (table === "product_variants") {
      const rows = pendingInIds.length
        ? variantsMockData.filter((v) => pendingInIds.includes(v.id))
        : variantsMockData;
      return { data: rows, error: null };
    }
    if (table === "tenant_taxes") return { data: taxesMockData, error: null };
    if (table === "stock_movements") return { data: {}, error: null };
    return { data: null, error: null };
  };

  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq:     jest.fn().mockReturnThis(),
    gte:    jest.fn().mockReturnThis(),
    lte:    jest.fn().mockReturnThis(),
    lt:     jest.fn().mockReturnThis(),
    order:  jest.fn().mockReturnThis(),
    range:  jest.fn().mockReturnThis(),
    in: jest.fn().mockImplementation((_col: string, ids: string[]) => {
      pendingInIds = ids;
      return chain;
    }),
    single: jest.fn().mockImplementation(resolve),
    insert: jest.fn().mockImplementation((rows: any) => {
      const row = Array.isArray(rows) ? rows[0] : rows;
      insertCalls.push({ table, data: row });
      return {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: "TX-TEST-123", ...row }, error: null }),
      };
    }),
    update: jest.fn().mockImplementation((data: any) => {
      const call: { table: string; data: any; filters: Record<string, any> } = { table, data, filters: {} };
      updateCalls.push(call);
      const eqC: any = { eq: jest.fn().mockImplementation((c: string, v: any) => { call.filters[c] = v; return eqC; }) };
      return eqC;
    }),
  };

  Object.defineProperty(chain, "then", {
    get() { return (ok: any, fail: any) => resolve().then(ok, fail); },
  });

  return chain;
}

function buildMockSupabase() {
  return { from: (table: string) => buildTableChain(table) };
}

// ─── Mock: planStatusCheck ─────────────────────────────────────────────────────

jest.mock("@/lib/utils/planStatusCheck", () => ({
  checkPlanStatus: jest.fn(async () => ({ isValid: planValid })),
  respondWithExpiredPlan: jest.fn(() =>
    MockNextResponse.json({ error: "Plan expired" }, { status: 402 })
  ),
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(
  body: object,
  tenantId = "tenant-1"
): [any, { params: Promise<{ tenantId: string }> }] {
  const req = new MockNextRequest(
    `http://localhost/api/tenants/${tenantId}/transactions`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  return [req, { params: Promise.resolve({ tenantId }) }];
}

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const PRODUCT_CAFE = { id: "prod-cafe", tenant_id: "tenant-1", stock_quantity: 10, price: 50, cost_price: 20 };
const PRODUCT_PAN  = { id: "prod-pan",  tenant_id: "tenant-1", stock_quantity: 5,  price: 20, cost_price: 8  };
const VARIANT_GRANDE = { id: "var-grande", product_id: "prod-cafe", tenant_id: "tenant-1", stock_quantity: 8, price: 60, cost_price: 22 };
const TAX_IVA      = { id: "t1", name: "IVA", rate: 15, is_active: true  };
const TAX_ISC      = { id: "t2", name: "ISC", rate: 2,  is_active: true  };
const TAX_INACTIVE = { id: "t3", name: "OFF", rate: 10, is_active: false };

// ─── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  planValid = true;
  productsMockData = [PRODUCT_CAFE, PRODUCT_PAN];
  variantsMockData = [VARIANT_GRANDE];
  taxesMockData    = [];
  updateCalls.length = 0;
  insertCalls.length = 0;
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/tenants/[tenantId]/transactions — POS Flow", () => {

  // ── Happy path ──────────────────────────────────────────────────────────────

  describe("Happy path — CARD payment", () => {
    it("returns 200 with created transaction id", async () => {
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 2, price: 50, total: 100 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      const res = await POST(req, ctx);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBeDefined();
    });

    it("inserts transaction with correct totals (no tax)", async () => {
      const [req, ctx] = makeRequest({
        items: [
          { productId: "prod-cafe", name: "Cafe", quantity: 2, price: 50, total: 100 },
          { productId: "prod-pan",  name: "Pan",  quantity: 1, price: 20, total: 20  },
        ],
        paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0,
      });
      await POST(req, ctx);
      const tx = insertCalls.find((c) => c.table === "transactions");
      expect(tx).toBeDefined();
      expect(tx!.data.subtotal).toBe(120);
      expect(tx!.data.tax).toBe(0);
      expect(tx!.data.total).toBe(120);
      expect(tx!.data.payment_method).toBe("CARD");
    });

    it("decrements stock for each product sold", async () => {
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 3, price: 50, total: 150 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      await POST(req, ctx);
      const upd = updateCalls.find((c) => c.table === "products" && c.data.stock_quantity === 10 - 3);
      expect(upd).toBeDefined();
    });

    it("stores correct COGS and profit", async () => {
      // cost=20 x2 = 40, revenue=100, profit=60
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 2, price: 50, total: 100 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      await POST(req, ctx);
      const tx = insertCalls.find((c) => c.table === "transactions");
      expect(tx!.data.cost_of_goods_sold).toBe(40);
      expect(tx!.data.profit).toBe(60);
    });
  });

  // ── CASH payment ────────────────────────────────────────────────────────────

  describe("CASH payment & change", () => {
    it("records amount_received and computes correct change", async () => {
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 1, price: 50, total: 50 }], paymentMethod: "CASH", cashierId: "u1", cashierName: "Juan", discount: 0, amountReceived: 100 });
      await POST(req, ctx);
      const tx = insertCalls.find((c) => c.table === "transactions");
      expect(tx!.data.amount_received).toBe(100);
      expect(tx!.data.change).toBe(50);
    });

    it("stores 0 change for CARD payment even when amountReceived provided", async () => {
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 1, price: 50, total: 50 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0, amountReceived: 100 });
      await POST(req, ctx);
      const tx = insertCalls.find((c) => c.table === "transactions");
      expect(tx!.data.change).toBe(0);
    });
  });

  // ── Discount ────────────────────────────────────────────────────────────────

  describe("Discount", () => {
    it("applies discount before total", async () => {
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 2, price: 50, total: 100 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 20 });
      await POST(req, ctx);
      const tx = insertCalls.find((c) => c.table === "transactions");
      expect(tx!.data.discount).toBe(20);
      expect(tx!.data.total).toBe(80);
    });

    it("caps discount at subtotal — total is 0 not negative", async () => {
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 1, price: 50, total: 50 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 999 });
      await POST(req, ctx);
      const tx = insertCalls.find((c) => c.table === "transactions");
      expect(tx!.data.discount).toBe(50);
      expect(tx!.data.total).toBe(0);
    });
  });

  // ── Taxes ───────────────────────────────────────────────────────────────────

  describe("Taxes", () => {
    it("applies a single active tax", async () => {
      taxesMockData = [TAX_IVA];
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 2, price: 50, total: 100 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      await POST(req, ctx);
      const tx = insertCalls.find((c) => c.table === "transactions");
      expect(tx!.data.tax).toBe(15);
      expect(tx!.data.total).toBe(115);
    });

    it("applies multiple active taxes additively", async () => {
      taxesMockData = [TAX_IVA, TAX_ISC];
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 2, price: 50, total: 100 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      await POST(req, ctx);
      const tx = insertCalls.find((c) => c.table === "transactions");
      expect(tx!.data.tax).toBe(17);
      expect(tx!.data.total).toBe(117);
    });

    it("ignores inactive taxes", async () => {
      taxesMockData = [TAX_INACTIVE];
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 1, price: 50, total: 50 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      await POST(req, ctx);
      const tx = insertCalls.find((c) => c.table === "transactions");
      expect(tx!.data.tax).toBe(0);
      expect(tx!.data.total).toBe(50);
    });

    it("applies tax AFTER discount", async () => {
      // subtotal=100, discount=20, taxable=80, IVA=12, total=92
      taxesMockData = [TAX_IVA];
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 2, price: 50, total: 100 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 20 });
      await POST(req, ctx);
      const tx = insertCalls.find((c) => c.table === "transactions");
      expect(tx!.data.discount).toBe(20);
      expect(tx!.data.tax).toBe(12);
      expect(tx!.data.total).toBe(92);
    });

    it("stores tax_breakdown with per-tax amounts", async () => {
      taxesMockData = [TAX_IVA, TAX_ISC];
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 2, price: 50, total: 100 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      await POST(req, ctx);
      const tx = insertCalls.find((c) => c.table === "transactions");
      expect(tx!.data.tax_breakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "IVA", rate: 15, amount: 15 }),
          expect.objectContaining({ name: "ISC", rate: 2,  amount: 2  }),
        ])
      );
    });
  });

  // ── Product variants ─────────────────────────────────────────────────────────

  describe("Product variants", () => {
    it("decrements variant stock when variantId is present", async () => {
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", variantId: "var-grande", name: "Cafe Grande", quantity: 2, price: 60, total: 120 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      await POST(req, ctx);
      const varUpd = updateCalls.find((c) => c.table === "product_variants" && c.data.stock_quantity === 8 - 2);
      expect(varUpd).toBeDefined();
      const prodUpd = updateCalls.find((c) => c.table === "products");
      expect(prodUpd).toBeUndefined();
    });

    it("uses variant cost_price for COGS", async () => {
      // variant cost=22 x2 = 44, revenue=120, profit=76
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", variantId: "var-grande", name: "Cafe Grande", quantity: 2, price: 60, total: 120 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      await POST(req, ctx);
      const tx = insertCalls.find((c) => c.table === "transactions");
      expect(tx!.data.cost_of_goods_sold).toBe(44);
      expect(tx!.data.profit).toBe(76);
    });
  });

  // ── Validation errors ─────────────────────────────────────────────────────────

  describe("Validation errors", () => {
    it("returns 400 when cart is empty", async () => {
      const [req, ctx] = makeRequest({ items: [], paymentMethod: "CARD", cashierId: "u1" });
      const res = await POST(req, ctx);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/panier/i);
    });

    it("returns 400 when items field is missing", async () => {
      const [req, ctx] = makeRequest({ paymentMethod: "CARD", cashierId: "u1" });
      const res = await POST(req, ctx);
      expect(res.status).toBe(400);
    });

    it("returns 400 when stock is insufficient", async () => {
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-pan", name: "Pan", quantity: 10, price: 20, total: 200 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      const res = await POST(req, ctx);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/stock/i);
    });

    it("returns 400 when variant stock is insufficient", async () => {
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", variantId: "var-grande", name: "Cafe Grande", quantity: 20, price: 60, total: 1200 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      const res = await POST(req, ctx);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/stock/i);
    });

    it("returns 400 when quantity is 0", async () => {
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 0, price: 50, total: 0 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      const res = await POST(req, ctx);
      expect(res.status).toBe(400);
    });

    it("returns 400 when product not found in DB", async () => {
      productsMockData = [];
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 1, price: 50, total: 50 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      const res = await POST(req, ctx);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/introuvable/i);
    });
  });

  // ── Plan gating ───────────────────────────────────────────────────────────────

  describe("Plan gating", () => {
    it("returns 402 when plan is expired", async () => {
      planValid = false;
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 1, price: 50, total: 50 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      const res = await POST(req, ctx);
      expect(res.status).toBe(402);
    });

    it("does NOT insert transaction when plan is expired", async () => {
      planValid = false;
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 1, price: 50, total: 50 }], paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0 });
      await POST(req, ctx);
      expect(insertCalls.find((c) => c.table === "transactions")).toBeUndefined();
    });
  });

  // ── Multi-item ────────────────────────────────────────────────────────────────

  describe("Multi-item sale", () => {
    it("decrements each product stock independently", async () => {
      const [req, ctx] = makeRequest({
        items: [
          { productId: "prod-cafe", name: "Cafe", quantity: 3, price: 50, total: 150 },
          { productId: "prod-pan",  name: "Pan",  quantity: 2, price: 20, total: 40  },
        ],
        paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0,
      });
      await POST(req, ctx);
      expect(updateCalls.find((c) => c.table === "products" && c.data.stock_quantity === 10 - 3)).toBeDefined();
      expect(updateCalls.find((c) => c.table === "products" && c.data.stock_quantity === 5 - 2)).toBeDefined();
    });

    it("aggregates COGS across all items", async () => {
      // Cafe: 20x3=60 | Pan: 8x2=16 | total COGS=76 | revenue=190 | profit=114
      const [req, ctx] = makeRequest({
        items: [
          { productId: "prod-cafe", name: "Cafe", quantity: 3, price: 50, total: 150 },
          { productId: "prod-pan",  name: "Pan",  quantity: 2, price: 20, total: 40  },
        ],
        paymentMethod: "CARD", cashierId: "u1", cashierName: "Juan", discount: 0,
      });
      await POST(req, ctx);
      const tx = insertCalls.find((c) => c.table === "transactions");
      expect(tx!.data.cost_of_goods_sold).toBe(76);
      expect(tx!.data.profit).toBe(114);
    });
  });

  // ── USD multi-currency ────────────────────────────────────────────────────────

  describe("USD currency", () => {
    it("stores currency_paid and usd_amount_received", async () => {
      const [req, ctx] = makeRequest({ items: [{ productId: "prod-cafe", name: "Cafe", quantity: 1, price: 50, total: 50 }], paymentMethod: "CASH", cashierId: "u1", cashierName: "Juan", discount: 0, amountReceived: 50, currency_paid: "USD", usd_amount_received: 1.35, usd_exchange_rate: 37 });
      await POST(req, ctx);
      const tx = insertCalls.find((c) => c.table === "transactions");
      expect(tx!.data.currency_paid).toBe("USD");
      expect(tx!.data.usd_amount_received).toBeCloseTo(1.35);
    });
  });
});