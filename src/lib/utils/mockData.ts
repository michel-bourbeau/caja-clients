// Mock data service - Replace with actual API calls

import { Product, Employee, Transaction, Payroll } from "@/lib/types";

// Products
export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Laptop Dell XPS 13",
    sku: "DELL-XPS-001",
    price: 1200.0,
    cost_price: 720.0,
    quantity: 5,
    category: "Electrónica",
    description: "Laptop ultradelgada de alto rendimiento",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-08-20"),
  },
  {
    id: "2",
    name: "Mouse Logitech MX",
    sku: "LOG-MX-001",
    price: 49.99,
    cost_price: 29.99,
    quantity: 50,
    category: "Accesorios",
    description: "Mouse inalámbrico de precisión",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-08-19"),
  },
  {
    id: "3",
    name: "Teclado Mecánico Corsair",
    sku: "COR-K70-001",
    price: 159.99,
    cost_price: 95.99,
    quantity: 15,
    category: "Accesorios",
    description: "Teclado mecánico RGB gaming",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-08-18"),
  },
];

// Employees
export const mockEmployees: Employee[] = [
  {
    id: "1",
    firstName: "Juan",
    lastName: "García López",
    email: "juan@ejemplo.com",
    phone: "1123456789",
    roleId: "role-cashier",
    hireDate: new Date("2023-01-15"),
    salary: 45000,
    status: "ACTIVE",
    createdAt: new Date("2023-01-15"),
    updatedAt: new Date("2024-08-20"),
  },
  {
    id: "2",
    firstName: "María",
    lastName: "Rodríguez Martínez",
    email: "maria@ejemplo.com",
    phone: "1198765432",
    roleId: "role-manager",
    hireDate: new Date("2022-06-01"),
    salary: 65000,
    status: "ACTIVE",
    createdAt: new Date("2022-06-01"),
    updatedAt: new Date("2024-08-20"),
  },
  {
    id: "3",
    firstName: "Carlos",
    lastName: "Sánchez Pérez",
    email: "carlos@ejemplo.com",
    phone: "1156789012",
    roleId: "role-cashier",
    hireDate: new Date("2023-03-10"),
    salary: 42000,
    status: "ACTIVE",
    createdAt: new Date("2023-03-10"),
    updatedAt: new Date("2024-08-20"),
  },
];

// Get all products
export const getProducts = async (): Promise<Product[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockProducts), 500);
  });
};

// Get single product
export const getProduct = async (id: string): Promise<Product | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const product = mockProducts.find((p) => p.id === id);
      resolve(product || null);
    }, 300);
  });
};

// Get all employees
export const getEmployees = async (): Promise<Employee[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockEmployees), 500);
  });
};

// Get single employee
export const getEmployee = async (id: string): Promise<Employee | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const employee = mockEmployees.find((e) => e.id === id);
      resolve(employee || null);
    }, 300);
  });
};

// TODO: Replace these with actual API calls
export const services = {
  products: { getAll: getProducts, getById: getProduct },
  employees: { getAll: getEmployees, getById: getEmployee },
};
