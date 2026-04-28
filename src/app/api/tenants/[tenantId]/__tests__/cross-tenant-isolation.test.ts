/**
 * Tests d'isolation cross-tenant (sécurité)
 *
 * Objectif : vérifier que chaque route API scope ses requêtes Supabase
 * strictement au tenantId issu des paramètres d'URL — jamais d'un autre tenant,
 * jamais du corps de la requête.
 *
 * Routes couvertes :
 *  GET  /api/tenants/[tenantId]/transactions
 *  GET  /api/tenants/[tenantId]/employees
 *  GET  /api/tenants/[tenantId]/products
 *  GET  /api/tenants/[tenantId]/expenses
 *  POST /api/tenants/[tenantId]/products   (body ne doit pas écraser le tenantId URL)
 *  POST /api/tenants/[tenantId]/expenses   (idem)
 */

// ─── Mock next/server (doit précéder tout import de route) ───────────────────

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
  private _headers: Record<string, string>;

  constructor(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
    this.url = url;
    this.method = init?.method ?? "GET";
    this._body = init?.body ? JSON.parse(init.body) : undefined;
    this._headers = init?.headers ?? {};
  }

  async json() { return this._body; }
  headers = { get: (k: string) => this._headers[k] ?? null };
}

jest.mock("next/server", () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}));

// ─── Mock partagé ────────────────────────────────────────────────────────────

jest.mock("@/lib/supabase", () => ({ getSupabaseAdmin: jest.fn() }));
jest.mock("@/lib/utils/planStatusCheck", () => ({
  checkPlanStatus: jest.fn(),
  respondWithExpiredPlan: jest.fn(),
}));

import { getSupabaseAdmin } from "@/lib/supabase";
import { checkPlanStatus } from "@/lib/utils/planStatusCheck";

// ─── Constantes ───────────────────────────────────────────────────────────────

const TENANT_A = "aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa";
const TENANT_B = "bbbbbbbb-0000-0000-0000-bbbbbbbbbbbb";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGet(tenantId: string, path = "", qs = "") {
  return new MockNextRequest(
    `http://localhost/api/tenants/${tenantId}/${path}${qs}`
  );
}

function makePost(tenantId: string, path: string, body: unknown) {
  return new MockNextRequest(
    `http://localhost/api/tenants/${tenantId}/${path}`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

/** Crée un mock Supabase simple qui capture les appels .eq() */
function makeSupaMock(finalResult = { data: [], error: null }) {
  const eqCalls: [string, string][] = [];
  const mock: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn((...args: [string, string]) => { eqCalls.push(args); return mock; }),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(finalResult),
    single: jest.fn().mockResolvedValue(finalResult),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    limit: jest.fn().mockReturnThis(),
    // expose pour assertions
    _eqCalls: eqCalls,
  };
  (getSupabaseAdmin as jest.Mock).mockReturnValue(mock);
  return mock;
}

beforeEach(() => {
  jest.clearAllMocks();
  (checkPlanStatus as jest.Mock).mockResolvedValue({ isValid: true, suspended: false });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET /transactions — isolation par tenant
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-tenant isolation — GET /transactions", () => {
  let GET: Function;

  beforeAll(async () => {
    ({ GET } = await import("../transactions/route"));
  });

  it("scope la requête au TENANT_A quand l'URL contient TENANT_A", async () => {
    const supa = makeSupaMock();
    const req = makeGet(TENANT_A, "transactions");
    await GET(req, { params: Promise.resolve({ tenantId: TENANT_A }) });
    const tenantEq = supa._eqCalls.find(([col]: [string]) => col === "tenant_id");
    expect(tenantEq).toBeDefined();
    expect(tenantEq![1]).toBe(TENANT_A);
  });

  it("scope la requête au TENANT_B quand l'URL contient TENANT_B", async () => {
    const supa = makeSupaMock();
    const req = makeGet(TENANT_B, "transactions");
    await GET(req, { params: Promise.resolve({ tenantId: TENANT_B }) });
    const tenantEq = supa._eqCalls.find(([col]: [string]) => col === "tenant_id");
    expect(tenantEq).toBeDefined();
    expect(tenantEq![1]).toBe(TENANT_B);
  });

  it("TENANT_B ne voit jamais les données de TENANT_A", async () => {
    const supa = makeSupaMock();
    const req = makeGet(TENANT_B, "transactions");
    await GET(req, { params: Promise.resolve({ tenantId: TENANT_B }) });
    const wrongTenant = supa._eqCalls.find(
      ([col, val]: [string, string]) => col === "tenant_id" && val === TENANT_A
    );
    expect(wrongTenant).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET /employees — isolation par tenant (employees + users tables)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-tenant isolation — GET /employees", () => {
  let GET: Function;

  beforeAll(async () => {
    ({ GET } = await import("../employees/route"));
  });

  it("scope les deux requêtes (employees + users) au TENANT_A", async () => {
    const supa = makeSupaMock({ data: [], error: null });
    const req = makeGet(TENANT_A, "employees");
    await GET(req, { params: Promise.resolve({ tenantId: TENANT_A }) });
    // Both the employees and users queries must be scoped
    const tenantEqs = supa._eqCalls.filter(([col]: [string]) => col === "tenant_id");
    expect(tenantEqs.length).toBeGreaterThanOrEqual(2);
    for (const [, val] of tenantEqs) {
      expect(val).toBe(TENANT_A);
    }
  });

  it("scope les requêtes au TENANT_B sans croiser TENANT_A", async () => {
    const supa = makeSupaMock({ data: [], error: null });
    const req = makeGet(TENANT_B, "employees");
    await GET(req, { params: Promise.resolve({ tenantId: TENANT_B }) });
    const wrongTenant = supa._eqCalls.find(
      ([col, val]: [string, string]) => col === "tenant_id" && val === TENANT_A
    );
    expect(wrongTenant).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GET /products — isolation par tenant
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-tenant isolation — GET /products", () => {
  let GET: Function;

  beforeAll(async () => {
    ({ GET } = await import("../products/route"));
  });

  it("scope la requête au TENANT_A", async () => {
    const supa = makeSupaMock();
    const req = makeGet(TENANT_A, "products");
    await GET(req, { params: Promise.resolve({ tenantId: TENANT_A }) });
    const tenantEq = supa._eqCalls.find(([col]: [string]) => col === "tenant_id");
    expect(tenantEq).toBeDefined();
    expect(tenantEq![1]).toBe(TENANT_A);
  });

  it("TENANT_B ne voit jamais les données de TENANT_A", async () => {
    const supa = makeSupaMock();
    const req = makeGet(TENANT_B, "products");
    await GET(req, { params: Promise.resolve({ tenantId: TENANT_B }) });
    const wrongTenant = supa._eqCalls.find(
      ([col, val]: [string, string]) => col === "tenant_id" && val === TENANT_A
    );
    expect(wrongTenant).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. GET /expenses — isolation par tenant
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-tenant isolation — GET /expenses", () => {
  let GET: Function;

  beforeAll(async () => {
    ({ GET } = await import("../expenses/route"));
  });

  /** Mock Supabase étendu pour la route expenses (auth.admin.getUserById) */
  function makeExpenseSupaMock() {
    const supa = makeSupaMock();
    supa.auth = { admin: { getUserById: jest.fn().mockResolvedValue({ data: { user: null } }) } };
    return supa;
  }

  it("scope la requête au TENANT_A", async () => {
    const supa = makeExpenseSupaMock();
    (getSupabaseAdmin as jest.Mock).mockReturnValue(supa);
    const req = makeGet(TENANT_A, "expenses");
    await GET(req as any, { params: Promise.resolve({ tenantId: TENANT_A }) });
    const tenantEq = supa._eqCalls.find(([col]: [string]) => col === "tenant_id");
    expect(tenantEq).toBeDefined();
    expect(tenantEq![1]).toBe(TENANT_A);
  });

  it("TENANT_B ne lit jamais les données de TENANT_A", async () => {
    const supa = makeExpenseSupaMock();
    (getSupabaseAdmin as jest.Mock).mockReturnValue(supa);
    const req = makeGet(TENANT_B, "expenses");
    await GET(req as any, { params: Promise.resolve({ tenantId: TENANT_B }) });
    const wrongTenant = supa._eqCalls.find(
      ([col, val]: [string, string]) => col === "tenant_id" && val === TENANT_A
    );
    expect(wrongTenant).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. POST /products — le tenantId du body ne remplace pas celui de l'URL
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-tenant isolation — POST /products (injection tenantId body)", () => {
  let POST: Function;

  beforeAll(async () => {
    ({ POST } = await import("../products/route"));
  });

  it("utilise le tenantId de l'URL et non celui du body", async () => {
    // Configurer le mock insert().select().single()
    const insertMock: any = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: "p1", tenant_id: TENANT_A, name: "Café", stock_quantity: 0 },
        error: null,
      }),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    (getSupabaseAdmin as jest.Mock).mockReturnValue(insertMock);

    // Corps contient un tenant_id malveillant
    const body = {
      name: "Café",
      sku: "CAF-001",
      price: 50,
      tenant_id: TENANT_B, // injection — doit être ignorée
    };

    const req = makePost(TENANT_A, "products", body);
    await POST(req as any, { params: Promise.resolve({ tenantId: TENANT_A }) });

    // Vérifier que insert a été appelé avec tenant_id = TENANT_A (pas TENANT_B)
    const insertCall = insertMock.insert.mock.calls[0];
    expect(insertCall).toBeDefined();
    const insertedData = insertCall[0][0];
    expect(insertedData.tenant_id).toBe(TENANT_A);
    expect(insertedData.tenant_id).not.toBe(TENANT_B);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. POST /transactions — plan suspendu → 402 pour tout tenant
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-tenant isolation — POST /transactions plan suspendu", () => {
  let POST: Function;

  beforeAll(async () => {
    ({ POST } = await import("../transactions/route"));
  });

  it.each([TENANT_A, TENANT_B])(
    "retourne 402 pour le tenant %s quand le plan est suspendu",
    async (tenantId) => {
      (checkPlanStatus as jest.Mock).mockResolvedValue({ isValid: false, suspended: true });
      const { respondWithExpiredPlan } = await import("@/lib/utils/planStatusCheck");
      (respondWithExpiredPlan as jest.Mock).mockReturnValue(
        MockNextResponse.json({ error: "Plan expiré" }, { status: 402 })
      );

      makeSupaMock(); // nécessaire pour getSupabaseAdmin()
      const req = makePost(tenantId, "transactions", { items: [{ productId: "p1", quantity: 1, price: 10, total: 10 }] });
      const res = await POST(req as any, { params: Promise.resolve({ tenantId }) });
      expect(res.status).toBe(402);
    }
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. GET /expenses sans x-user-id → retourne [] (pas d'accès anonyme)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-tenant isolation — GET /expenses sans authentification", () => {
  let GET: Function;

  beforeAll(async () => {
    ({ GET } = await import("../expenses/route"));
  });

  it("retourne un tableau vide si aucun userId et pas admin", async () => {
    const supa = makeSupaMock({ data: null, error: null });
    supa.auth = { admin: { getUserById: jest.fn().mockResolvedValue({ data: { user: null } }) } };
    (getSupabaseAdmin as jest.Mock).mockReturnValue(supa);

    // Requête sans header x-user-id
    const req = makeGet(TENANT_A, "expenses");
    const res = await GET(req as any, { params: Promise.resolve({ tenantId: TENANT_A }) });
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });
});
