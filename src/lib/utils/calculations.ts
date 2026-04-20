// Business calculation utilities
import { TAX_RATE } from "../constants";

export const calculateTax = (amount: number): number => {
  return Math.round(amount * TAX_RATE * 100) / 100;
};

export const calculateTotal = (subtotal: number): { tax: number; total: number } => {
  const tax = calculateTax(subtotal);
  return {
    tax,
    total: Math.round((subtotal + tax) * 100) / 100,
  };
};

export const calculateHoursWorked = (checkIn: Date, checkOut: Date): number => {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  return diffMs / (1000 * 60 * 60); // Convert to hours
};

export const calculatePayrollAmount = (baseSalary: number, hoursWorked: number): number => {
  const hourlyRate = baseSalary / 160; // Assuming 160 working hours per month
  return Math.round(hourlyRate * hoursWorked * 100) / 100;
};
