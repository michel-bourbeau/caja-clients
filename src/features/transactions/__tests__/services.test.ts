/**
 * TransactionService — Tests unitaires
 *
 * Couvre :
 *  - fetchTransactions (GET, avec/sans filtres de dates)
 *  - createTransaction (POST, succès + erreurs)
 *  - deleteTransaction (DELETE, succès + erreur)
 *  - updateTransaction (PUT, succès + erreur)
 *  - Mapping API → Transaction (champs manquants, valeurs par défaut)
 */

import { TransactionService } from "../services";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const RAW_TX = {
  id: "TX-001",
  items: [{ productId: "p1", quantity: 2, price: 50, total: 100 }],
  subtotal: 100,
  discount: 0,
  tax: 0,
  total: 100,
  payment_method: "CASH",
  created_at: "2026-04-28T10:00:00Z",
  cashier_id: "cashier-1",
  cashier_name: "Juan",
  status: "COMPLETED",
  amount_received: 120,
  change: 20,
  cash_closing_id: "cc-1",
};

const RAW_TX_MINIMAL = {
  id: "TX-002",
  items: [],
  subtotal: 50,
  tax: 0,
  total: 50,
  // pas de payment_method, cashier_id, cashier_name, status, etc.
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetchOk(body: unknown, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status < 400,
    status,
    statusText: status < 400 ? "OK" : "Error",
    json: async () => body,
  });
}

function mockFetchError(statusText = "Internal Server Error", status = 500) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    json: async () => ({ error: statusText }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TransactionService", () => {

  afterEach(() => jest.resetAllMocks());

  // ══════════════════════════════════════════════════════════════════
  // fetchTransactions
  // ══════════════════════════════════════════════════════════════════
  describe("fetchTransactions", () => {
    it("appelle l'URL correcte sans filtres de dates", async () => {
      mockFetchOk([RAW_TX]);
      await TransactionService.fetchTransactions("tenant-1");
      expect(global.fetch).toHaveBeenCalledWith("/api/tenants/tenant-1/transactions");
    });

    it("appelle l'URL correcte avec filtres de dates", async () => {
      mockFetchOk([RAW_TX]);
      await TransactionService.fetchTransactions("tenant-1", "2026-04-01", "2026-04-28");
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/tenants/tenant-1/transactions?from=2026-04-01&to=2026-04-28"
      );
    });

    it("retourne un tableau de Transaction correctement mappé", async () => {
      mockFetchOk([RAW_TX]);
      const result = await TransactionService.fetchTransactions("tenant-1");
      expect(result).toHaveLength(1);
      const tx = result[0];
      expect(tx.id).toBe("TX-001");
      expect(tx.subtotal).toBe(100);
      expect(tx.total).toBe(100);
      expect(tx.paymentMethod).toBe("CASH");
      expect(tx.cashierId).toBe("cashier-1");
      expect(tx.cashierName).toBe("Juan");
      expect(tx.status).toBe("COMPLETED");
      expect(tx.amount_received).toBe(120);
      expect(tx.change).toBe(20);
      expect(tx.cash_closing_id).toBe("cc-1");
    });

    it("convertit created_at en objet Date", async () => {
      mockFetchOk([RAW_TX]);
      const [tx] = await TransactionService.fetchTransactions("tenant-1");
      expect(tx.timestamp).toBeInstanceOf(Date);
      expect(tx.timestamp.toISOString()).toBe("2026-04-28T10:00:00.000Z");
    });

    it("utilise les valeurs par défaut pour les champs manquants", async () => {
      mockFetchOk([RAW_TX_MINIMAL]);
      const [tx] = await TransactionService.fetchTransactions("tenant-1");
      expect(tx.paymentMethod).toBe("CASH");
      expect(tx.cashierId).toBe("unknown");
      expect(tx.cashierName).toBe("Admin");
      expect(tx.status).toBe("COMPLETED");
      expect(tx.amount_received).toBe(0);
      expect(tx.change).toBe(0);
      expect(tx.cash_closing_id).toBeUndefined();
    });

    it("retourne un tableau vide si l'API retourne un non-array", async () => {
      mockFetchOk({ unexpected: "object" });
      const result = await TransactionService.fetchTransactions("tenant-1");
      expect(result).toEqual([]);
    });

    it("retourne un tableau vide si l'API retourne []", async () => {
      mockFetchOk([]);
      const result = await TransactionService.fetchTransactions("tenant-1");
      expect(result).toEqual([]);
    });

    it("lève une erreur si la réponse n'est pas ok", async () => {
      mockFetchError("Service Unavailable", 503);
      await expect(
        TransactionService.fetchTransactions("tenant-1")
      ).rejects.toThrow("Failed to fetch transactions: Service Unavailable");
    });

    it("ne filtre que par from si to est absent", async () => {
      mockFetchOk([]);
      await TransactionService.fetchTransactions("tenant-1", "2026-04-01", undefined);
      // Sans les deux paramètres → URL sans query string
      expect(global.fetch).toHaveBeenCalledWith("/api/tenants/tenant-1/transactions");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // createTransaction
  // ══════════════════════════════════════════════════════════════════
  describe("createTransaction", () => {
    const items = [{ productId: "p1", quantity: 2, price: 50, total: 100 }];

    it("appelle POST sur la bonne URL avec le bon body", async () => {
      mockFetchOk(RAW_TX);
      await TransactionService.createTransaction("tenant-1", items, "CASH", "cashier-1", 10);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/tenants/tenant-1/transactions",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, paymentMethod: "CASH", cashierId: "cashier-1", discount: 10 }),
        })
      );
    });

    it("retourne une Transaction correctement mappée", async () => {
      mockFetchOk(RAW_TX);
      const tx = await TransactionService.createTransaction("tenant-1", items, "CASH");
      expect(tx.id).toBe("TX-001");
      expect(tx.paymentMethod).toBe("CASH");
      expect(tx.cashierName).toBe("Juan");
    });

    it("utilise 'unknown' comme cashierId par défaut", async () => {
      mockFetchOk(RAW_TX);
      await TransactionService.createTransaction("tenant-1", items, "CARD");
      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.cashierId).toBe("unknown");
    });

    it("utilise 0 comme discount par défaut", async () => {
      mockFetchOk(RAW_TX);
      await TransactionService.createTransaction("tenant-1", items, "CASH", "cashier-1");
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.discount).toBe(0);
    });

    it("lève l'erreur de l'API en cas d'échec", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Stock insuffisant" }),
      });
      await expect(
        TransactionService.createTransaction("tenant-1", items, "CASH")
      ).rejects.toThrow("Stock insuffisant");
    });

    it("lève 'Failed to create transaction' si pas de message d'erreur", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });
      await expect(
        TransactionService.createTransaction("tenant-1", items, "CASH")
      ).rejects.toThrow("Failed to create transaction");
    });

    it("supporte CARD comme méthode de paiement", async () => {
      mockFetchOk({ ...RAW_TX, payment_method: "CARD" });
      const tx = await TransactionService.createTransaction("tenant-1", items, "CARD");
      expect(tx.paymentMethod).toBe("CARD");
    });

    it("supporte TRANSFER comme méthode de paiement", async () => {
      mockFetchOk({ ...RAW_TX, payment_method: "TRANSFER" });
      const tx = await TransactionService.createTransaction("tenant-1", items, "TRANSFER");
      expect(tx.paymentMethod).toBe("TRANSFER");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // deleteTransaction
  // ══════════════════════════════════════════════════════════════════
  describe("deleteTransaction", () => {
    it("appelle DELETE sur la bonne URL", async () => {
      mockFetchOk(null);
      await TransactionService.deleteTransaction("tenant-1", "TX-001");
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/tenants/tenant-1/transactions/TX-001",
        { method: "DELETE" }
      );
    });

    it("se résout sans valeur en cas de succès", async () => {
      mockFetchOk(null);
      await expect(
        TransactionService.deleteTransaction("tenant-1", "TX-001")
      ).resolves.toBeUndefined();
    });

    it("lève l'erreur de l'API en cas d'échec", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Transaction introuvable" }),
      });
      await expect(
        TransactionService.deleteTransaction("tenant-1", "TX-999")
      ).rejects.toThrow("Transaction introuvable");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // updateTransaction
  // ══════════════════════════════════════════════════════════════════
  describe("updateTransaction", () => {
    it("appelle PUT avec les mises à jour correctes", async () => {
      const updates = { payment_method: "CARD", amount_received: 200 };
      mockFetchOk(RAW_TX);
      await TransactionService.updateTransaction("tenant-1", "TX-001", updates);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/tenants/tenant-1/transactions/TX-001",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })
      );
    });

    it("retourne la Transaction mise à jour", async () => {
      mockFetchOk({ ...RAW_TX, payment_method: "CARD" });
      const tx = await TransactionService.updateTransaction("tenant-1", "TX-001", {
        payment_method: "CARD",
      });
      expect(tx.paymentMethod).toBe("CARD");
    });

    it("lève l'erreur de l'API en cas d'échec", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Non autorisé" }),
      });
      await expect(
        TransactionService.updateTransaction("tenant-1", "TX-001", {})
      ).rejects.toThrow("Non autorisé");
    });

    it("supporte la mise à jour de created_at", async () => {
      const updates = { created_at: "2026-01-01T00:00:00Z" };
      mockFetchOk({ ...RAW_TX, created_at: "2026-01-01T00:00:00Z" });
      const tx = await TransactionService.updateTransaction("tenant-1", "TX-001", updates);
      expect(tx.timestamp.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Mapping — valeurs par défaut / edge cases
  // ══════════════════════════════════════════════════════════════════
  describe("Mapping API → Transaction", () => {
    it("created_at absent → timestamp = now (approximatif)", async () => {
      const before = new Date();
      mockFetchOk([{ ...RAW_TX_MINIMAL, created_at: undefined }]);
      const [tx] = await TransactionService.fetchTransactions("tenant-1");
      const after = new Date();
      expect(tx.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(tx.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("items absent dans la réponse → items = []", async () => {
      mockFetchOk([{ ...RAW_TX_MINIMAL, items: undefined }]);
      const [tx] = await TransactionService.fetchTransactions("tenant-1");
      expect(tx.items).toEqual([]);
    });

    it("cash_closing_id absent → undefined (pas 0 ou null)", async () => {
      mockFetchOk([RAW_TX_MINIMAL]);
      const [tx] = await TransactionService.fetchTransactions("tenant-1");
      expect(tx.cash_closing_id).toBeUndefined();
    });
  });
});
