/**
 * GET /api/tenants/[tenantId]/transactions
 * POST /api/tenants/[tenantId]/transactions
 *
 * Couvre :
 *  GET  - lecture filtrée par tenant_id, filtres de dates optionnels
 *  POST - validation panier vide, stock, plan suspendu, calculs totaux/COGS,
 *         décrément stock, création transaction, migration manquante
 */

// ─── Mocks next/server avant tout import ──────────────────────────────────────

class MockNextResponse {
  readonly status: number;
  private body: unknown;

  constructor(body: unknown, init?: { status?: number }) {
    this.body = body;
    this.status = init?.status ?? 200;
  }

  async json() {
    return this.body;
  }

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
    this.method = init?.method ?? "GET";
    this._body = init?.body ? JSON.parse(init.body) : undefined;
  }

  async json() {
    return this._body;
  }
}

jest.mock("next/server", () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}));

// ─── Autres mocks ─────────────────────────────────────────────────────────────

jest.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: jest.fn(),
}));

jest.mock("@/lib/utils/planStatusCheck", () => ({
  checkPlanStatus: jest.fn(),
  respondWithExpiredPlan: jest.fn(),
}));

import { GET, POST } from "../route";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkPlanStatus, respondWithExpiredPlan } from "@/lib/utils/planStatusCheck";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(method: string, url: string, body?: unknown): MockNextRequest {
  return new MockNextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const TENANT = "tenant-abc";
const PARAMS = Promise.resolve({ tenantId: TENANT });

/** Produit de base pour les tests POST */
const PRODUCT = { id: "p1", stock_quantity: 10, price: 50, cost_price: 30 };
const ITEM = { productId: "p1", quantity: 2, price: 50, total: 100 };

// ─── GET Tests ────────────────────────────────────────────────────────────────

describe("GET /api/tenants/[tenantId]/transactions", () => {

  function setupGet(result: { data: unknown; error: unknown }) {
    const mock: any = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue(result),
    };
    (getSupabaseAdmin as jest.Mock).mockReturnValue(mock);
    return mock;
  }

  it("retourne 200 avec la liste des transactions du tenant", async () => {
    setupGet({ data: [{ id: "TX-1", tenant_id: TENANT }], error: null });
    const req = makeRequest("GET", `http://localhost/api/tenants/${TENANT}/transactions`);
    const res = await GET(req as any, { params: PARAMS });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("filtre par tenant_id (eq appelé avec le bon tenantId)", async () => {
    const mock = setupGet({ data: [], error: null });
    const req = makeRequest("GET", `http://localhost/api/tenants/${TENANT}/transactions`);
    await GET(req as any, { params: PARAMS });
    expect(mock.eq).toHaveBeenCalledWith("tenant_id", TENANT);
  });

  it("applique les filtres de date gte/lte quand from et to sont fournis", async () => {
    const mock = setupGet({ data: [], error: null });
    const req = makeRequest(
      "GET",
      `http://localhost/api/tenants/${TENANT}/transactions?from=2026-04-01&to=2026-04-28`
    );
    await GET(req as any, { params: PARAMS });
    expect(mock.gte).toHaveBeenCalledWith("created_at", "2026-04-01T00:00:00Z");
    expect(mock.lte).toHaveBeenCalledWith("created_at", "2026-04-28T23:59:59Z");
  });

  it("n'applique pas gte/lte si seulement from est fourni", async () => {
    const mock = setupGet({ data: [], error: null });
    const req = makeRequest(
      "GET",
      `http://localhost/api/tenants/${TENANT}/transactions?from=2026-04-01`
    );
    await GET(req as any, { params: PARAMS });
    expect(mock.gte).not.toHaveBeenCalled();
    expect(mock.lte).not.toHaveBeenCalled();
  });

  it("retourne 200 avec [] si data est null", async () => {
    setupGet({ data: null, error: null });
    const req = makeRequest("GET", `http://localhost/api/tenants/${TENANT}/transactions`);
    const res = await GET(req as any, { params: PARAMS });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("retourne 500 si Supabase retourne une erreur", async () => {
    setupGet({ data: null, error: new Error("DB error") });
    const req = makeRequest("GET", `http://localhost/api/tenants/${TENANT}/transactions`);
    const res = await GET(req as any, { params: PARAMS });
    expect(res.status).toBe(500);
  });
});

// ─── POST Tests ───────────────────────────────────────────────────────────────

describe("POST /api/tenants/[tenantId]/transactions", () => {

  /** Setup standard : plan valide, produit en stock, taxes vides, insert réussi */
  function setupValidPost(productOverride?: Partial<typeof PRODUCT>) {
    (checkPlanStatus as jest.Mock).mockResolvedValue({ isValid: true });
    const product = { ...PRODUCT, ...productOverride };

    const txRow = {
      id: "TX-NEW",
      tenant_id: TENANT,
      items: [ITEM],
      subtotal: 100,
      discount: 0,
      tax: 0,
      total: 100,
      payment_method: "CASH",
      created_at: "2026-04-28T10:00:00Z",
      cashier_id: "c1",
      cashier_name: "Test",
      status: "COMPLETED",
      amount_received: 100,
      change: 0,
    };

    const mock: any = { from: jest.fn() };
    // Compteur par table pour distinguer SELECT vs UPDATE sur "products"
    const callCounters: Record<string, number> = {};

    mock.from.mockImplementation((table: string) => {
      const idx = (callCounters[table] = (callCounters[table] ?? 0) + 1);

      if (table === "products") {
        if (idx === 1) {
          // 1er appel : SELECT stock → .select().in().eq() resolves
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [product], error: null }),
          };
        }
        // Appels suivants : UPDATE stock → .update().eq("id").eq("tenant_id") resolves
        const upd: any = {};
        upd.update = jest.fn().mockReturnValue(upd);
        upd.eq = jest.fn()
          .mockReturnValueOnce(upd)                                            // premier .eq() → chaîne
          .mockResolvedValueOnce({ data: null, error: null });                 // deuxième .eq() → résout
        return upd;
      }

      if (table === "product_variants") {
        // Variants : idem (select + update)
        if (idx === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        const upd: any = {};
        upd.update = jest.fn().mockReturnValue(upd);
        upd.eq = jest.fn()
          .mockReturnValueOnce(upd)
          .mockResolvedValueOnce({ data: null, error: null });
        return upd;
      }

      if (table === "tenant_taxes") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }

      if (table === "transactions") {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: txRow, error: null }),
        };
      }

      // fallback
      return {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    (getSupabaseAdmin as jest.Mock).mockReturnValue(mock);
    return mock;
  }

  it("retourne 400 si items est un tableau vide", async () => {
    (checkPlanStatus as jest.Mock).mockResolvedValue({ isValid: true });
    const mock: any = { from: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
    (getSupabaseAdmin as jest.Mock).mockReturnValue(mock);

    const req = makeRequest("POST", `http://localhost/api/tenants/${TENANT}/transactions`, {
      items: [], paymentMethod: "CASH",
    });
    const res = await POST(req as any, { params: PARAMS });
    expect(res.status).toBe(400);
  });

  it("retourne 400 si items est absent", async () => {
    (checkPlanStatus as jest.Mock).mockResolvedValue({ isValid: true });
    const mock: any = { from: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
    (getSupabaseAdmin as jest.Mock).mockReturnValue(mock);

    const req = makeRequest("POST", `http://localhost/api/tenants/${TENANT}/transactions`, {
      paymentMethod: "CASH",
    });
    const res = await POST(req as any, { params: PARAMS });
    expect(res.status).toBe(400);
  });

  it("retourne 403 si le plan est suspendu", async () => {
    (checkPlanStatus as jest.Mock).mockResolvedValue({ isValid: false, suspended: true });
    (respondWithExpiredPlan as jest.Mock).mockReturnValue(
      MockNextResponse.json({ error: "Suscripción expirada", code: "SUBSCRIPTION_SUSPENDED" }, { status: 403 })
    );

    const req = makeRequest("POST", `http://localhost/api/tenants/${TENANT}/transactions`, {
      items: [ITEM], paymentMethod: "CASH",
    });
    const res = await POST(req as any, { params: PARAMS });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("SUBSCRIPTION_SUSPENDED");
  });

  it("retourne 200 et la transaction créée pour un POST valide (CASH)", async () => {
    setupValidPost();
    const req = makeRequest("POST", `http://localhost/api/tenants/${TENANT}/transactions`, {
      items: [ITEM], paymentMethod: "CASH", cashierId: "c1", cashierName: "Test",
    });
    const res = await POST(req as any, { params: PARAMS });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("TX-NEW");
  });

  it("retourne 200 pour un POST CARD", async () => {
    setupValidPost();
    const req = makeRequest("POST", `http://localhost/api/tenants/${TENANT}/transactions`, {
      items: [ITEM], paymentMethod: "CARD",
    });
    const res = await POST(req as any, { params: PARAMS });
    expect(res.status).toBe(200);
  });

  it("retourne 400 si le stock est insuffisant", async () => {
    (checkPlanStatus as jest.Mock).mockResolvedValue({ isValid: true });

    const mock: any = { from: jest.fn() };
    mock.from.mockImplementation((table: string) => {
      if (table === "products") {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [{ ...PRODUCT, stock_quantity: 1 }], error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });
    (getSupabaseAdmin as jest.Mock).mockReturnValue(mock);

    const req = makeRequest("POST", `http://localhost/api/tenants/${TENANT}/transactions`, {
      items: [{ ...ITEM, quantity: 2 }], paymentMethod: "CASH",
    });
    const res = await POST(req as any, { params: PARAMS });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/stock/i);
  });

  it("retourne 400 si un produit est introuvable", async () => {
    (checkPlanStatus as jest.Mock).mockResolvedValue({ isValid: true });

    const mock: any = { from: jest.fn() };
    mock.from.mockImplementation((table: string) => {
      if (table === "products") {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }), // aucun produit
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });
    (getSupabaseAdmin as jest.Mock).mockReturnValue(mock);

    const req = makeRequest("POST", `http://localhost/api/tenants/${TENANT}/transactions`, {
      items: [ITEM], paymentMethod: "CASH",
    });
    const res = await POST(req as any, { params: PARAMS });
    expect(res.status).toBe(400);
  });

  it("retourne 400 si une quantité est 0", async () => {
    setupValidPost();
    const req = makeRequest("POST", `http://localhost/api/tenants/${TENANT}/transactions`, {
      items: [{ ...ITEM, quantity: 0 }], paymentMethod: "CASH",
    });
    const res = await POST(req as any, { params: PARAMS });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/quantité|quantit/i);
  });

  it("retourne 503 avec code MIGRATION_REQUIRED si colonne discount manquante", async () => {
    (checkPlanStatus as jest.Mock).mockResolvedValue({ isValid: true });

    const mock: any = { from: jest.fn() };
    mock.from.mockImplementation((table: string) => {
      if (table === "products") {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [PRODUCT], error: null }),
        };
      }
      if (table === "tenant_taxes") {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
      }
      if (table === "transactions") {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Could not find the 'discount' column" },
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });
    (getSupabaseAdmin as jest.Mock).mockReturnValue(mock);

    const req = makeRequest("POST", `http://localhost/api/tenants/${TENANT}/transactions`, {
      items: [ITEM], paymentMethod: "CASH",
    });
    const res = await POST(req as any, { params: PARAMS });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("MIGRATION_REQUIRED");
  });

  it("retourne 500 en cas d'erreur Supabase inattendue (rejet)", async () => {
    (checkPlanStatus as jest.Mock).mockResolvedValue({ isValid: true });

    const mock: any = { from: jest.fn() };
    mock.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockRejectedValue(new Error("Connection timeout")),
    }));
    (getSupabaseAdmin as jest.Mock).mockReturnValue(mock);

    const req = makeRequest("POST", `http://localhost/api/tenants/${TENANT}/transactions`, {
      items: [ITEM], paymentMethod: "CASH",
    });
    const res = await POST(req as any, { params: PARAMS });
    expect(res.status).toBe(500);
  });

  it("calcule le discount et le total après remise", async () => {
    (checkPlanStatus as jest.Mock).mockResolvedValue({ isValid: true });
    let insertedData: any = null;

    const mock: any = { from: jest.fn() };
    mock.from.mockImplementation((table: string) => {
      if (table === "products") {
        return {
          select: jest.fn().mockReturnThis(), in: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [{ id: "p1", stock_quantity: 10, price: 100, cost_price: 0 }], error: null }),
        };
      }
      if (table === "tenant_taxes") {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
      }
      if (table === "transactions") {
        return {
          insert: jest.fn().mockImplementation((rows: any[]) => {
            insertedData = rows[0];
            return { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: "TX-D", ...rows[0] }, error: null }) };
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), update: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: null, error: null }) };
    });
    (getSupabaseAdmin as jest.Mock).mockReturnValue(mock);

    const req = makeRequest("POST", `http://localhost/api/tenants/${TENANT}/transactions`, {
      items: [{ productId: "p1", quantity: 1, price: 100, total: 100 }],
      paymentMethod: "CASH",
      discount: 20,
    });
    await POST(req as any, { params: PARAMS });

    expect(insertedData?.discount).toBe(20);
    expect(insertedData?.total).toBe(80);
  });

  it("calcule le COGS et le profit à partir du cost_price", async () => {
    // cost_price=30, qty=2 → COGS=60, total=100, profit=40
    (checkPlanStatus as jest.Mock).mockResolvedValue({ isValid: true });
    let insertedData: any = null;

    const mock: any = { from: jest.fn() };
    mock.from.mockImplementation((table: string) => {
      if (table === "products") {
        return {
          select: jest.fn().mockReturnThis(), in: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [{ id: "p1", stock_quantity: 10, price: 50, cost_price: 30 }], error: null }),
        };
      }
      if (table === "tenant_taxes") {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
      }
      if (table === "transactions") {
        return {
          insert: jest.fn().mockImplementation((rows: any[]) => {
            insertedData = rows[0];
            return { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: "TX-C", ...rows[0] }, error: null }) };
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), update: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: null, error: null }) };
    });
    (getSupabaseAdmin as jest.Mock).mockReturnValue(mock);

    const req = makeRequest("POST", `http://localhost/api/tenants/${TENANT}/transactions`, {
      items: [{ productId: "p1", quantity: 2, price: 50, total: 100 }],
      paymentMethod: "CASH",
    });
    await POST(req as any, { params: PARAMS });

    expect(insertedData?.cost_of_goods_sold).toBe(60);  // 30 × 2
    expect(insertedData?.profit).toBe(40);              // 100 - 60
  });
});
