"use client";

import { useState } from "react";
import { Card, Button, Input } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { Employee } from "@/lib/types";
import { formatDate } from "@/lib/utils/formatters";
import { DEFAULT_ROLES } from "@/lib/types/roles";
import { useAuth } from "@/context/AuthContext";

export default function EmployeesPage() {
  const { hasPermission } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: "1",
      firstName: "Juan",
      lastName: "García",
      email: "juan@ejemplo.com",
      phone: "1123456789",
      roleId: "cashier",
      hireDate: new Date("2023-01-15"),
      salary: 45000,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "2",
      firstName: "María",
      lastName: "Rodríguez",
      email: "maria@ejemplo.com",
      phone: "1198765432",
      roleId: "manager",
      hireDate: new Date("2022-06-01"),
      salary: 65000,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    roleId: "cashier",
    salary: "",
  });

  const handleAddEmployee = () => {
    if (!hasPermission("employees.create")) {
      alert("No tienes permiso para crear empleados");
      return;
    }
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newEmployee: Employee = {
      id: Date.now().toString(),
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      roleId: formData.roleId,
      hireDate: new Date(),
      salary: parseFloat(formData.salary),
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setEmployees([...employees, newEmployee]);
    setShowForm(false);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      roleId: "cashier",
      salary: "",
    });
  };

  const handleChangeRole = (employeeId: string, newRoleId: string) => {
    if (!hasPermission("employees.edit")) {
      alert("No tienes permiso para editar empleados");
      return;
    }
    setEmployees(
      employees.map((emp) => (emp.id === employeeId ? { ...emp, roleId: newRoleId } : emp))
    );
  };

  const handleDeleteEmployee = (employeeId: string) => {
    if (!hasPermission("employees.delete")) {
      alert("No tienes permiso para eliminar empleados");
      return;
    }
    setEmployees(employees.filter((e) => e.id !== employeeId));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Empleados</h1>
        {hasPermission("employees.create") && (
          <Button onClick={handleAddEmployee}>+ Nuevo Empleado</Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-8 border-2 border-blue-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Crear Nuevo Empleado</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
              <Input
                label="Apellido"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Teléfono"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                label="Salario"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Rol</label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DEFAULT_ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Crear Empleado</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Nombre</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Email</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Rol</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Salario</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Estado</th>
                {(hasPermission("employees.edit") || hasPermission("employees.delete")) && (
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => {
                const role = DEFAULT_ROLES.find((r) => r.id === emp.roleId);
                return (
                  <tr key={emp.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-6 py-3 text-gray-800 font-medium">
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td className="px-6 py-3 text-gray-800">{emp.email}</td>
                    <td className="px-6 py-3">
                      {hasPermission("employees.edit") ? (
                        <select
                          value={emp.roleId}
                          onChange={(e) => handleChangeRole(emp.id, e.target.value)}
                          className="px-2 py-1 border border-slate-300 rounded text-sm text-slate-900"
                        >
                          {DEFAULT_ROLES.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                          {role?.name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-700">${emp.salary.toLocaleString()}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          emp.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {emp.status === "ACTIVE" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {(hasPermission("employees.edit") || hasPermission("employees.delete")) && (
                      <td className="px-6 py-3">
                        <div className="flex gap-2">
                          {hasPermission("employees.edit") && (
                            <Button size="sm" variant="secondary">
                              Editar
                            </Button>
                          )}
                          {hasPermission("employees.delete") && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDeleteEmployee(emp.id)}
                            >
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

