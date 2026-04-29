// Validation utilities

import { ValidationError } from "@/lib/types";

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\d{10,}$/;
  return phoneRegex.test(phone.replace(/\D/g, ""));
};

export const validateCUIT = (cuit: string): boolean => {
  const cleaned = cuit.replace(/\D/g, "");
  return cleaned.length === 11;
};

export const validatePrice = (price: number): boolean => {
  return price > 0 && price <= 999999.99;
};

export const validateQuantity = (quantity: number): boolean => {
  return Number.isInteger(quantity) && quantity > 0;
};

export const validateProductData = (data: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push({ field: "name", message: "El nombre es requerido" });
  }

  if (!data.sku || data.sku.trim().length === 0) {
    errors.push({ field: "sku", message: "El SKU es requerido" });
  }

  if (!validatePrice(data.price)) {
    errors.push({ field: "price", message: "El precio debe ser válido" });
  }

  if (!validateQuantity(data.quantity)) {
    errors.push({ field: "quantity", message: "La cantidad debe ser un número entero positivo" });
  }

  return errors;
};

export const validateEmployeeData = (data: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!data.firstName || data.firstName.trim().length === 0) {
    errors.push({ field: "firstName", message: "El nombre es requerido" });
  }

  if (!data.lastName || data.lastName.trim().length === 0) {
    errors.push({ field: "lastName", message: "El apellido es requerido" });
  }

  if (!validateEmail(data.email)) {
    errors.push({ field: "email", message: "El email no es válido" });
  }

  if (!validatePhone(data.phone)) {
    errors.push({ field: "phone", message: "El teléfono no es válido" });
  }

  if (data.salary <= 0) {
    errors.push({ field: "salary", message: "El salario debe ser mayor a 0" });
  }

  return errors;
};
