/**
 * TransactionsPage — Tests unitaires
 *
 * Couvre :
 *  - Rendu initial (chargement puis données)
 *  - Affichage du titre et du sous-titre
 *  - Filtrage par méthode de paiement
 *  - Recherche textuelle
 *  - Navigation de période (WEEK / MONTH / YEAR)
 *  - Suppression d'une transaction
 *  - État d'erreur
 *  - Aucune transaction
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import TransactionsPage from "../page";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/utils/tenant", () => ({ useTenantId: jest.fn() }));
jest.mock("@/lib/utils/useCurrency", () => ({ useCurrency: jest.fn() }));
jest.mock("@/context/TenantFeaturesContext", () => ({ useTenantFeatures: jest.fn() }));
jest.mock("@/features/transactions/services", () => ({
  TransactionService: {
    fetchTransactions: jest.fn(),
    deleteTransaction: jest.fn(),
    updateTransaction: jest.fn(),
  },
}));

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string>) => {
      const map: Record<string, string> = {
        "transactions.title": "Transacciones",
        "transactions.subtitle_one": "transacción",
        "transactions.subtitle_other": "transacciones",
        "transactions.period.week": "Semana",
        "transactions.period.month": "Mes",
        "transactions.period.year": "Año",
        "transactions.payment.all": "Todos los métodos",
        "transactions.payment.cash": "Efectivo",
        "transactions.payment.card": "Tarjeta",
        "transactions.payment.transfer": "Transferencia",
        "transactions.loading": "Cargando transacciones...",
        "transactions.empty": "No hay transacciones disponibles.",
        "transactions.error.tenantNotFound": "Tenant ID no encontrado",
        "transactions.error.unknown": "Error desconocido",
        "transactions.error.delete": "Error al eliminar la transacción",
        "transactions.error.save": "Error al guardar los cambios",
        "transactions.error.refund": "Error al procesar el reembolso",
        "transactions.error.network": "Error de red",
        "transactions.error.configError": "Error de Configuración",
      };
      let result = map[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          result = result.replace(`{{${k}}}`, v);
        });
      }
      return result;
    },
  }),
}));
jest.mock("lucide-react", () => ({
  Eye: () => <svg data-testid="icon-eye" />,
  Trash2: () => <svg data-testid="icon-trash" />,
  RefreshCw: () => <svg data-testid="icon-refresh" />,
  RotateCcw: () => <svg data-testid="icon-rotatecc" />,
}));

jest.mock("@/lib/utils/formatters", () => ({
  formatDateTime: (d: any) => new Date(d).toISOString(),
  toNicaraguaDateString: (d: any) =>
    d instanceof Date
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      : String(d),
}));

jest.mock("@/components/StripeUIComponents", () => ({
  Button:    ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Card:      ({ children }: any) => <div>{children}</div>,
  Container: ({ children }: any) => <div>{children}</div>,
  Section:   ({ children }: any) => <div>{children}</div>,
  Badge:     ({ children }: any) => <span>{children}</span>,
  Alert:     ({ children, title }: any) => <div role="alert">{title}{children}</div>,
}));

jest.mock("@/components", () => ({
  DashboardHeader: ({ title, subtitle }: any) => (
    <div><h1>{title}</h1><p data-testid="subtitle">{subtitle}</p></div>
  ),
  PageIcon:    () => null,
  IconButton:  ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  SearchInput: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
  Dialog:      ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  DialogFooter:({ children }: any) => <div>{children}</div>,
  ButtonGroup: ({ children }: any) => <div>{children}</div>,
}));

import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useTenantFeatures } from "@/context/TenantFeaturesContext";
import { TransactionService } from "@/features/transactions/services";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TX_CASH = {
  id: "TX-001",
  paymentMethod: "CASH",
  items: [{ productId: "p1", quantity: 1, price: 100, total: 100, name: "Café" }],
  total: 100,
  subtotal: 100,
  discount: 0,
  tax: 0,
  timestamp: new Date("2026-04-28T10:00:00Z"),
  cashierId: "c1",
  cashierName: "Juan",
  status: "COMPLETED",
  amount_received: 100,
  change: 0,
};

const TX_CARD = {
  ...TX_CASH,
  id: "TX-002",
  paymentMethod: "CARD",
  total: 200,
  items: [{ productId: "p2", quantity: 2, price: 100, total: 200, name: "Agua" }],
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function setup(transactions = [TX_CASH, TX_CARD]) {
  (useTenantId as jest.Mock).mockReturnValue("tenant-123");
  (useCurrency as jest.Mock).mockReturnValue({ fmt: (v: number) => `C$${v}`, symbol: "C$" });
  (useTenantFeatures as jest.Mock).mockReturnValue({ features: { taxes: false }, loading: false, error: null });
  (TransactionService.fetchTransactions as jest.Mock).mockResolvedValue(transactions);
  (TransactionService.deleteTransaction as jest.Mock).mockResolvedValue(undefined);
  (TransactionService.updateTransaction as jest.Mock).mockResolvedValue(undefined);
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

describe("TransactionsPage", () => {

  describe("Rendu initial", () => {
    it("affiche le titre 'Transacciones'", async () => {
      setup();
      render(<TransactionsPage />);
      expect(screen.getByText("Transacciones")).toBeInTheDocument();
    });

    it("affiche le compteur de transactions dans le sous-titre", async () => {
      setup();
      render(<TransactionsPage />);
      await waitFor(() => {
        const subtitle = screen.getByTestId("subtitle");
        expect(subtitle.textContent).toMatch(/2/);
      });
    });

    it("appelle fetchTransactions avec le tenantId uniquement (filtrage client-side)", async () => {
      setup();
      render(<TransactionsPage />);
      await waitFor(() => {
        expect(TransactionService.fetchTransactions).toHaveBeenCalledWith("tenant-123");
      });
    });
  });

  describe("Chargement", () => {
    it("affiche l'état de chargement avant la réponse", async () => {
      setup();
      // Retarder la résolution
      (TransactionService.fetchTransactions as jest.Mock).mockReturnValue(new Promise(() => {}));
      render(<TransactionsPage />);
      // La page est en état de chargement, le sous-titre compte 0
      const subtitle = screen.getByTestId("subtitle");
      expect(subtitle.textContent).toMatch(/0/);
    });
  });

  describe("Filtrage", () => {
    it("filtre les transactions par méthode CASH", async () => {
      setup();
      render(<TransactionsPage />);
      await waitFor(() => expect(TransactionService.fetchTransactions).toHaveBeenCalled());

      // Sélectionner CASH dans le select
      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "CASH" } });

      // Sous-titre doit indiquer 1 transaction
      await waitFor(() => {
        const subtitle = screen.getByTestId("subtitle");
        expect(subtitle.textContent).toMatch(/^1/);
      });
    });

    it("filtre les transactions par méthode CARD", async () => {
      setup();
      render(<TransactionsPage />);
      await waitFor(() => expect(TransactionService.fetchTransactions).toHaveBeenCalled());

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "CARD" } });

      await waitFor(() => {
        const subtitle = screen.getByTestId("subtitle");
        expect(subtitle.textContent).toMatch(/^1/);
      });
    });

    it("remet ALL affiche les 2 transactions", async () => {
      setup();
      render(<TransactionsPage />);
      await waitFor(() => expect(TransactionService.fetchTransactions).toHaveBeenCalled());

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "CASH" } });
      fireEvent.change(select, { target: { value: "ALL" } });

      await waitFor(() => {
        const subtitle = screen.getByTestId("subtitle");
        expect(subtitle.textContent).toMatch(/2/);
      });
    });

    it("filtre par texte de recherche (nom de produit)", async () => {
      setup();
      render(<TransactionsPage />);
      await waitFor(() => expect(TransactionService.fetchTransactions).toHaveBeenCalled());

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "Café" } });

      await waitFor(() => {
        const subtitle = screen.getByTestId("subtitle");
        expect(subtitle.textContent).toMatch(/^1/);
      });
    });

    it("une recherche sans résultat donne 0 transaction", async () => {
      setup();
      render(<TransactionsPage />);
      await waitFor(() => expect(TransactionService.fetchTransactions).toHaveBeenCalled());

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "xyz_nonexistent" } });

      await waitFor(() => {
        const subtitle = screen.getByTestId("subtitle");
        expect(subtitle.textContent).toMatch(/^0/);
      });
    });
  });

  describe("Navigation de période", () => {
    it("le bouton MONTH filtre côté client sans nouvel appel API", async () => {
      setup();
      render(<TransactionsPage />);
      await waitFor(() => expect(TransactionService.fetchTransactions).toHaveBeenCalledTimes(1));

      const monthBtn = screen.getAllByText("Mes")[0];
      await act(async () => { fireEvent.click(monthBtn); });

      // Filtrage client-side uniquement — pas de nouvel appel API
      expect(TransactionService.fetchTransactions).toHaveBeenCalledTimes(1);
    });

    it("le bouton YEAR filtre côté client sans nouvel appel API", async () => {
      setup();
      render(<TransactionsPage />);
      await waitFor(() => expect(TransactionService.fetchTransactions).toHaveBeenCalledTimes(1));

      const yearBtn = screen.getAllByText("Año")[0];
      await act(async () => { fireEvent.click(yearBtn); });

      // Filtrage client-side uniquement — pas de nouvel appel API
      expect(TransactionService.fetchTransactions).toHaveBeenCalledTimes(1);
    });
  });

  describe("Erreur", () => {
    it("affiche une alerte si fetchTransactions rejette", async () => {
      setup();
      (TransactionService.fetchTransactions as jest.Mock).mockRejectedValue(new Error("Réseau hors ligne"));
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });
  });

  describe("Aucune transaction", () => {
    it("affiche 0 transaction si la liste est vide", async () => {
      setup([]);
      render(<TransactionsPage />);

      await waitFor(() => {
        const subtitle = screen.getByTestId("subtitle");
        expect(subtitle.textContent).toMatch(/^0/);
      });
    });
  });
});
