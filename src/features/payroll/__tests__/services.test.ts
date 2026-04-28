/**
 * PayrollService — Tests unitaires
 *
 * Couvre :
 *  - calculateMonthlySalary (calcul salarial)
 *  - getHourlyRate (taux horaire)
 *  - validatePayroll (validation avant paiement)
 *  - generatePayroll (génération pour une liste d'employés)
 *  - calculateDeductions (aportes + impuestos)
 *  - generatePayrollId (format ID)
 */

import { PayrollService } from "../services";
import { Employee, PayrollPeriod, Payroll } from "@/lib/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockEmployee: Employee = {
  id: "emp-1",
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan@example.com",
  phone: "123-456",
  roleId: "cashier",
  hireDate: new Date("2024-01-01"),
  salary: 16000,
  status: "ACTIVE",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockPeriod: PayrollPeriod = {
  id: "period-1",
  startDate: new Date("2026-04-01"),
  endDate: new Date("2026-04-30"),
  status: "PENDING",
};

// Payroll valide de base
const validPayroll: Payroll = {
  id: "PR-001",
  employeeId: "emp-1",
  periodId: "period-1",
  baseSalary: 16000,
  hoursWorked: 160,
  bonuses: 0,
  deductions: 1600,
  total: 14400,
  status: "DRAFT",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PayrollService", () => {

  // ══════════════════════════════════════════════════════════════════
  // calculateMonthlySalary
  // ══════════════════════════════════════════════════════════════════
  describe("calculateMonthlySalary", () => {
    it("calcule le salaire mensuel complet (160h, sans bonus ni déduction)", () => {
      // 16000 / 160 * 160 = 16000
      const result = PayrollService.calculateMonthlySalary(16000, 160);
      expect(result).toBe(16000);
    });

    it("calcule avec des heures partielles", () => {
      // 16000 / 160 * 80 = 8000
      const result = PayrollService.calculateMonthlySalary(16000, 80);
      expect(result).toBe(8000);
    });

    it("ajoute les bonus au salaire calculé", () => {
      const result = PayrollService.calculateMonthlySalary(16000, 160, 500);
      expect(result).toBe(16500);
    });

    it("soustrait les déductions du salaire calculé", () => {
      const result = PayrollService.calculateMonthlySalary(16000, 160, 0, 1600);
      expect(result).toBe(14400);
    });

    it("applique bonus ET déductions ensemble", () => {
      const result = PayrollService.calculateMonthlySalary(16000, 160, 500, 1600);
      expect(result).toBe(14900);
    });

    it("ne retourne jamais un montant négatif", () => {
      const result = PayrollService.calculateMonthlySalary(1000, 160, 0, 99999);
      expect(result).toBe(0);
    });

    it("retourne 0 pour 0 heures travaillées", () => {
      const result = PayrollService.calculateMonthlySalary(16000, 0);
      expect(result).toBe(0);
    });

    it("arrondit correctement à 2 décimales", () => {
      // 10000 / 160 * 1 = 62.5
      const result = PayrollService.calculateMonthlySalary(10000, 1);
      expect(result).toBe(62.5);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // getHourlyRate
  // ══════════════════════════════════════════════════════════════════
  describe("getHourlyRate", () => {
    it("calcule le taux horaire mensuel (160h/mois)", () => {
      expect(PayrollService.getHourlyRate(16000)).toBe(100);
    });

    it("arrondit à 2 décimales", () => {
      // 10000 / 160 = 62.5
      expect(PayrollService.getHourlyRate(10000)).toBe(62.5);
    });

    it("retourne 0 pour un salaire de 0", () => {
      expect(PayrollService.getHourlyRate(0)).toBe(0);
    });

    it("taux horaire pour salaire minimum (5000 C$)", () => {
      expect(PayrollService.getHourlyRate(5000)).toBe(31.25);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // validatePayroll
  // ══════════════════════════════════════════════════════════════════
  describe("validatePayroll", () => {
    it("retourne valid=true pour un payroll correct", () => {
      const { valid, errors } = PayrollService.validatePayroll(validPayroll);
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it("erreur si total <= 0", () => {
      const { valid, errors } = PayrollService.validatePayroll({ ...validPayroll, total: 0 });
      expect(valid).toBe(false);
      expect(errors).toContain("El salario total debe ser mayor a 0");
    });

    it("erreur si total négatif", () => {
      const { valid, errors } = PayrollService.validatePayroll({ ...validPayroll, total: -100 });
      expect(valid).toBe(false);
      expect(errors).toContain("El salario total debe ser mayor a 0");
    });

    it("erreur si baseSalary <= 0", () => {
      const { valid, errors } = PayrollService.validatePayroll({ ...validPayroll, baseSalary: 0 });
      expect(valid).toBe(false);
      expect(errors).toContain("El salario base debe ser mayor a 0");
    });

    it("erreur si déductions > salaire de base", () => {
      const { valid, errors } = PayrollService.validatePayroll({
        ...validPayroll,
        deductions: 20000,
      });
      expect(valid).toBe(false);
      expect(errors).toContain("Las deducciones no pueden ser mayores al salario base");
    });

    it("plusieurs erreurs si plusieurs champs invalides", () => {
      const { valid, errors } = PayrollService.validatePayroll({
        ...validPayroll,
        total: -1,
        baseSalary: 0,
        deductions: 999999,
      });
      expect(valid).toBe(false);
      expect(errors).toHaveLength(3);
    });

    it("déductions = salaire de base → valide (seuil strict)", () => {
      const { valid } = PayrollService.validatePayroll({
        ...validPayroll,
        deductions: 16000,
        baseSalary: 16000,
      });
      // deductions === baseSalary → pas > → valide
      expect(valid).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // generatePayroll
  // ══════════════════════════════════════════════════════════════════
  describe("generatePayroll", () => {
    it("génère un payroll par employé", async () => {
      const payrolls = await PayrollService.generatePayroll([mockEmployee], mockPeriod);
      expect(payrolls).toHaveLength(1);
    });

    it("génère un payroll pour chaque employé dans la liste", async () => {
      const employees = [
        mockEmployee,
        { ...mockEmployee, id: "emp-2", salary: 12000 },
      ];
      const payrolls = await PayrollService.generatePayroll(employees, mockPeriod);
      expect(payrolls).toHaveLength(2);
    });

    it("retourne un tableau vide pour une liste vide", async () => {
      const payrolls = await PayrollService.generatePayroll([], mockPeriod);
      expect(payrolls).toEqual([]);
    });

    it("associe le bon employeeId au payroll", async () => {
      const [payroll] = await PayrollService.generatePayroll([mockEmployee], mockPeriod);
      expect(payroll.employeeId).toBe("emp-1");
    });

    it("associe le bon periodId au payroll", async () => {
      const [payroll] = await PayrollService.generatePayroll([mockEmployee], mockPeriod);
      expect(payroll.periodId).toBe("period-1");
    });

    it("le statut initial est DRAFT", async () => {
      const [payroll] = await PayrollService.generatePayroll([mockEmployee], mockPeriod);
      expect(payroll.status).toBe("DRAFT");
    });

    it("calcule 10% de déductions sur le salaire de base", async () => {
      const [payroll] = await PayrollService.generatePayroll([mockEmployee], mockPeriod);
      expect(payroll.deductions).toBeCloseTo(mockEmployee.salary * 0.1, 2);
    });

    it("le total est positif", async () => {
      const [payroll] = await PayrollService.generatePayroll([mockEmployee], mockPeriod);
      expect(payroll.total).toBeGreaterThan(0);
    });

    it("génère des IDs uniques pour chaque payroll", async () => {
      const employees = [
        mockEmployee,
        { ...mockEmployee, id: "emp-2" },
      ];
      const payrolls = await PayrollService.generatePayroll(employees, mockPeriod);
      expect(payrolls[0].id).not.toBe(payrolls[1].id);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // calculateDeductions
  // ══════════════════════════════════════════════════════════════════
  describe("calculateDeductions", () => {
    it("calcule 17% d'aportes", () => {
      const { aportes } = PayrollService.calculateDeductions(10000);
      expect(aportes).toBeCloseTo(1700, 2);
    });

    it("calcule 5% d'impuestos", () => {
      const { impuestos } = PayrollService.calculateDeductions(10000);
      expect(impuestos).toBeCloseTo(500, 2);
    });

    it("le total = aportes + impuestos", () => {
      const { aportes, impuestos, total } = PayrollService.calculateDeductions(10000);
      expect(total).toBeCloseTo(aportes + impuestos, 2);
    });

    it("total = 22% du salaire", () => {
      const { total } = PayrollService.calculateDeductions(10000);
      expect(total).toBeCloseTo(2200, 2);
    });

    it("retourne 0 pour un salaire de 0", () => {
      const { aportes, impuestos, total } = PayrollService.calculateDeductions(0);
      expect(aportes).toBe(0);
      expect(impuestos).toBe(0);
      expect(total).toBe(0);
    });

    it("arrondit à 2 décimales", () => {
      const { aportes } = PayrollService.calculateDeductions(1000);
      // 1000 * 0.17 = 170 → exact
      expect(aportes).toBe(170);
    });

    it("gère les montants avec décimales", () => {
      const { total } = PayrollService.calculateDeductions(15333.33);
      // aportes et impuestos sont arrondis indépendamment → tolérance à 1 décimale
      expect(total).toBeCloseTo(15333.33 * 0.22, 1);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // generatePayrollId
  // ══════════════════════════════════════════════════════════════════
  describe("generatePayrollId", () => {
    it("commence par 'PR-'", () => {
      const id = PayrollService.generatePayrollId();
      expect(id).toMatch(/^PR-/);
    });

    it("est en majuscules", () => {
      const id = PayrollService.generatePayrollId();
      expect(id).toBe(id.toUpperCase());
    });

    it("génère des IDs différents à chaque appel", () => {
      const id1 = PayrollService.generatePayrollId();
      const id2 = PayrollService.generatePayrollId();
      expect(id1).not.toBe(id2);
    });

    it("a le bon format PR-{timestamp}-{random}", () => {
      const id = PayrollService.generatePayrollId();
      expect(id).toMatch(/^PR-\d+-[A-Z0-9]+$/);
    });
  });
});
