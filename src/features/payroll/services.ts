// Payroll Service - Handle salary calculations

import { Employee, PayrollPeriod, Payroll } from "@/lib/types";
import { calculatePayrollAmount } from "@/lib/utils/calculations";

export class PayrollService {
  /**
   * Calculate monthly salary
   */
  static calculateMonthlySalary(
    baseSalary: number,
    hoursWorked: number,
    bonuses = 0,
    deductions = 0
  ): number {
    const hourlySalary = calculatePayrollAmount(baseSalary, hoursWorked);
    return Math.max(0, hourlySalary + bonuses - deductions);
  }

  /**
   * Generate payroll for period
   */
  static async generatePayroll(
    employees: Employee[],
    period: PayrollPeriod
  ): Promise<Payroll[]> {
    const payrolls: Payroll[] = [];

    for (const employee of employees) {
      // TODO: Get actual hours from time entries
      const hoursWorked = 160; // Default monthly hours

      const payroll: Payroll = {
        id: this.generatePayrollId(),
        employeeId: employee.id,
        periodId: period.id,
        baseSalary: employee.salary,
        hoursWorked,
        bonuses: 0,
        deductions: Math.round((employee.salary * 0.1) * 100) / 100, // 10% deductions
        total: this.calculateMonthlySalary(employee.salary, hoursWorked, 0, employee.salary * 0.1),
        status: "DRAFT",
      };

      payrolls.push(payroll);
    }

    return payrolls;
  }

  /**
   * Calculate hourly rate
   */
  static getHourlyRate(monthlySalary: number): number {
    const MONTHLY_HOURS = 160;
    return Math.round((monthlySalary / MONTHLY_HOURS) * 100) / 100;
  }

  /**
   * Validate payroll before payment
   */
  static validatePayroll(payroll: Payroll): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (payroll.total <= 0) {
      errors.push("El salario total debe ser mayor a 0");
    }

    if (payroll.baseSalary <= 0) {
      errors.push("El salario base debe ser mayor a 0");
    }

    if (payroll.deductions > payroll.baseSalary) {
      errors.push("Las deducciones no pueden ser mayores al salario base");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate payroll ID
   */
  static generatePayrollId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 9);
    return `PR-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Calculate deductions (impuestos, aportes, etc)
   */
  static calculateDeductions(salary: number): { aportes: number; impuestos: number; total: number } {
    const aportes = Math.round(salary * 0.17 * 100) / 100; // 17% aportes
    const impuestos = Math.round(salary * 0.05 * 100) / 100; // 5% impuestos aprox.

    return {
      aportes,
      impuestos,
      total: aportes + impuestos,
    };
  }
}
