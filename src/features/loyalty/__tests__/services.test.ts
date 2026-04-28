import { LoyaltyService } from "../services";

// ─── Helpers ────────────────────────────────────────────────────────────────

const TENANT = "tenant-abc";
const CUSTOMER_ID = "cust-123";

const mockOk = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);

const mockFail = (data: unknown = { error: "Server error" }) =>
  Promise.resolve({ ok: false, json: () => Promise.resolve(data) } as Response);

beforeEach(() => {
  global.fetch = jest.fn();
});

// ─── getLoyaltySettings ──────────────────────────────────────────────────────

describe("LoyaltyService.getLoyaltySettings", () => {
  const SETTINGS = {
    loyalty_module_enabled: true,
    loyalty_reward_threshold: 2000,
    loyalty_reward_type: "DISCOUNT",
    loyalty_reward_value: 100,
  };

  it("appelle GET /loyalty/settings et retourne les données", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockOk(SETTINGS));
    const result = await LoyaltyService.getLoyaltySettings(TENANT);
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/tenants/${TENANT}/loyalty/settings`
    );
    expect(result).toEqual(SETTINGS);
  });

  it("lève une erreur si la réponse n'est pas ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockFail());
    await expect(LoyaltyService.getLoyaltySettings(TENANT)).rejects.toThrow(
      "Failed to fetch loyalty settings"
    );
  });
});

// ─── updateLoyaltySettings ───────────────────────────────────────────────────

describe("LoyaltyService.updateLoyaltySettings", () => {
  const SETTINGS = {
    loyalty_module_enabled: false,
    loyalty_reward_threshold: 3000,
    loyalty_reward_type: "GIFT",
    loyalty_reward_value: 50,
  };

  it("appelle PUT /loyalty/settings avec le bon body", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockOk({ success: true }));
    await LoyaltyService.updateLoyaltySettings(TENANT, SETTINGS);
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/tenants/${TENANT}/loyalty/settings`,
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(SETTINGS),
      })
    );
  });

  it("lève une erreur si la réponse n'est pas ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockFail());
    await expect(
      LoyaltyService.updateLoyaltySettings(TENANT, SETTINGS)
    ).rejects.toThrow("Failed to update loyalty settings");
  });
});

// ─── createCustomer ──────────────────────────────────────────────────────────

describe("LoyaltyService.createCustomer", () => {
  const CUSTOMER_DATA = { card_number: "CARD-001", name: "Juan García", phone: "505-1234" };
  const CREATED = { id: CUSTOMER_ID, tenant_id: TENANT, ...CUSTOMER_DATA, total_accumulated: 0, total_visits: 0 };

  it("appelle POST /loyalty/customers et retourne le client créé", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockOk(CREATED));
    const result = await LoyaltyService.createCustomer(TENANT, CUSTOMER_DATA);
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/tenants/${TENANT}/loyalty/customers`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(CUSTOMER_DATA),
      })
    );
    expect(result).toEqual(CREATED);
  });

  it("lève l'erreur du serveur si disponible", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockFail({ error: "Card number already exists" })
    );
    await expect(
      LoyaltyService.createCustomer(TENANT, CUSTOMER_DATA)
    ).rejects.toThrow("Card number already exists");
  });

  it("lève une erreur générique si pas de message serveur", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response)
    );
    await expect(
      LoyaltyService.createCustomer(TENANT, CUSTOMER_DATA)
    ).rejects.toThrow("Failed to create customer");
  });
});

// ─── getCustomers ─────────────────────────────────────────────────────────────

describe("LoyaltyService.getCustomers", () => {
  const LIST = [{ id: CUSTOMER_ID, name: "Ana López" }];

  it("appelle GET /loyalty/customers sans search", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockOk(LIST));
    const result = await LoyaltyService.getCustomers(TENANT);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/tenants/${TENANT}/loyalty/customers`)
    );
    expect(result).toEqual(LIST);
  });

  it("ajoute le paramètre search dans l'URL", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockOk(LIST));
    await LoyaltyService.getCustomers(TENANT, "juan");
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("search=juan");
  });

  it("lève une erreur si la réponse n'est pas ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockFail());
    await expect(LoyaltyService.getCustomers(TENANT)).rejects.toThrow(
      "Failed to fetch customers"
    );
  });
});

// ─── getCustomerDetails ──────────────────────────────────────────────────────

describe("LoyaltyService.getCustomerDetails", () => {
  const STATS = { id: CUSTOMER_ID, name: "Ana", current_counter: 500 };

  it("appelle GET /loyalty/customers/:id", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockOk(STATS));
    const result = await LoyaltyService.getCustomerDetails(TENANT, CUSTOMER_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/tenants/${TENANT}/loyalty/customers/${CUSTOMER_ID}`
    );
    expect(result).toEqual(STATS);
  });

  it("lève une erreur si la réponse n'est pas ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockFail());
    await expect(
      LoyaltyService.getCustomerDetails(TENANT, CUSTOMER_ID)
    ).rejects.toThrow("Failed to fetch customer details");
  });
});

// ─── updateCustomer ───────────────────────────────────────────────────────────

describe("LoyaltyService.updateCustomer", () => {
  const PATCH = { name: "Ana López Martínez" };
  const UPDATED = { id: CUSTOMER_ID, ...PATCH };

  it("appelle PUT /loyalty/customers/:id avec le body", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockOk(UPDATED));
    const result = await LoyaltyService.updateCustomer(TENANT, CUSTOMER_ID, PATCH);
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/tenants/${TENANT}/loyalty/customers/${CUSTOMER_ID}`,
      expect.objectContaining({ method: "PUT", body: JSON.stringify(PATCH) })
    );
    expect(result).toEqual(UPDATED);
  });

  it("lève une erreur si la réponse n'est pas ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockFail());
    await expect(
      LoyaltyService.updateCustomer(TENANT, CUSTOMER_ID, PATCH)
    ).rejects.toThrow("Failed to update customer");
  });
});

// ─── deleteCustomer ───────────────────────────────────────────────────────────

describe("LoyaltyService.deleteCustomer", () => {
  it("appelle DELETE /loyalty/customers/:id et résout sans valeur", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
    );
    await expect(
      LoyaltyService.deleteCustomer(TENANT, CUSTOMER_ID)
    ).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/tenants/${TENANT}/loyalty/customers/${CUSTOMER_ID}`,
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("lève une erreur si la réponse n'est pas ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockFail());
    await expect(
      LoyaltyService.deleteCustomer(TENANT, CUSTOMER_ID)
    ).rejects.toThrow("Failed to delete customer");
  });
});

// ─── recordPurchase ───────────────────────────────────────────────────────────

describe("LoyaltyService.recordPurchase", () => {
  const PURCHASE_DATA = { amount: 500, transaction_id: "TX-1", description: "Café" };
  const PURCHASE_RESULT = { id: "LP-1", loyal_customer_id: CUSTOMER_ID, amount: 500 };

  it("appelle POST .../record-purchase avec le body", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockOk(PURCHASE_RESULT));
    const result = await LoyaltyService.recordPurchase(TENANT, CUSTOMER_ID, PURCHASE_DATA);
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/tenants/${TENANT}/loyalty/customers/${CUSTOMER_ID}/record-purchase`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(PURCHASE_DATA),
      })
    );
    expect(result).toEqual(PURCHASE_RESULT);
  });

  it("lève une erreur si la réponse n'est pas ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockFail());
    await expect(
      LoyaltyService.recordPurchase(TENANT, CUSTOMER_ID, PURCHASE_DATA)
    ).rejects.toThrow("Failed to record purchase");
  });
});

// ─── awardReward ──────────────────────────────────────────────────────────────

describe("LoyaltyService.awardReward", () => {
  const REWARD_DATA = { reward_type: "DISCOUNT", reward_value: 100, notes: "Félicitations" };

  it("appelle POST .../award-reward avec le body", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockOk({ success: true }));
    await LoyaltyService.awardReward(TENANT, CUSTOMER_ID, REWARD_DATA);
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/tenants/${TENANT}/loyalty/customers/${CUSTOMER_ID}/award-reward`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(REWARD_DATA),
      })
    );
  });

  it("lève l'erreur du serveur si disponible", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockFail({ error: "Customer not eligible" })
    );
    await expect(
      LoyaltyService.awardReward(TENANT, CUSTOMER_ID, REWARD_DATA)
    ).rejects.toThrow("Customer not eligible");
  });

  it("lève une erreur générique si pas de message serveur", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response)
    );
    await expect(
      LoyaltyService.awardReward(TENANT, CUSTOMER_ID, REWARD_DATA)
    ).rejects.toThrow("Failed to award reward");
  });
});

// ─── getRewardHistory ─────────────────────────────────────────────────────────

describe("LoyaltyService.getRewardHistory", () => {
  const REWARDS = [{ id: "RW-1", reward_type: "DISCOUNT", reward_value: 100 }];

  it("appelle GET .../rewards et retourne la liste", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockOk(REWARDS));
    const result = await LoyaltyService.getRewardHistory(TENANT, CUSTOMER_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/tenants/${TENANT}/loyalty/customers/${CUSTOMER_ID}/rewards`
    );
    expect(result).toEqual(REWARDS);
  });

  it("lève une erreur si la réponse n'est pas ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockFail());
    await expect(
      LoyaltyService.getRewardHistory(TENANT, CUSTOMER_ID)
    ).rejects.toThrow("Failed to fetch reward history");
  });
});

// ─── getPurchaseHistory ───────────────────────────────────────────────────────

describe("LoyaltyService.getPurchaseHistory", () => {
  const PURCHASES = [{ id: "LP-1", amount: 500 }];

  it("appelle GET .../purchases et retourne la liste", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockOk(PURCHASES));
    const result = await LoyaltyService.getPurchaseHistory(TENANT, CUSTOMER_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/tenants/${TENANT}/loyalty/customers/${CUSTOMER_ID}/purchases`
    );
    expect(result).toEqual(PURCHASES);
  });

  it("lève une erreur si la réponse n'est pas ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockFail());
    await expect(
      LoyaltyService.getPurchaseHistory(TENANT, CUSTOMER_ID)
    ).rejects.toThrow("Failed to fetch purchase history");
  });
});

// ─── calculateCurrentCounter ─────────────────────────────────────────────────

describe("LoyaltyService.calculateCurrentCounter", () => {
  const mkReward = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `RW-${i}` } as any));

  it("retourne totalAccumulated si aucune récompense", () => {
    expect(LoyaltyService.calculateCurrentCounter(1060, [], 2000)).toBe(1060);
  });

  it("soustrait (nb récompenses × seuil)", () => {
    expect(LoyaltyService.calculateCurrentCounter(7060, mkReward(2), 2000)).toBe(3060);
  });

  it("ne descend jamais en dessous de 0", () => {
    expect(LoyaltyService.calculateCurrentCounter(500, mkReward(3), 2000)).toBe(0);
  });

  it("utilise le seuil par défaut de 2000", () => {
    expect(LoyaltyService.calculateCurrentCounter(5000, mkReward(2))).toBe(1000);
  });

  it("rewards null/undefined → traité comme 0 récompenses", () => {
    expect(LoyaltyService.calculateCurrentCounter(1500, null as any, 2000)).toBe(1500);
  });
});

// ─── calculateRewardProgress ──────────────────────────────────────────────────

describe("LoyaltyService.calculateRewardProgress", () => {
  it("retourne 100% si counter >= seuil", () => {
    expect(LoyaltyService.calculateRewardProgress(5060, 2000)).toEqual({
      percentage: 100,
      remainingAmount: 0,
    });
  });

  it("retourne 100% si counter === seuil exactement", () => {
    expect(LoyaltyService.calculateRewardProgress(2000, 2000)).toEqual({
      percentage: 100,
      remainingAmount: 0,
    });
  });

  it("calcule le pourcentage et le montant restant correctement", () => {
    const result = LoyaltyService.calculateRewardProgress(1000, 2000);
    expect(result.percentage).toBeCloseTo(50, 1);
    expect(result.remainingAmount).toBe(1000);
  });

  it("retourne 0% si counter === 0", () => {
    expect(LoyaltyService.calculateRewardProgress(0, 2000)).toEqual({
      percentage: 0,
      remainingAmount: 2000,
    });
  });

  it("cas réaliste: 1060 / 2000 ≈ 53%", () => {
    const result = LoyaltyService.calculateRewardProgress(1060, 2000);
    expect(result.percentage).toBeCloseTo(53, 0);
    expect(result.remainingAmount).toBe(940);
  });
});
