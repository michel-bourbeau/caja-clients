"use client";

import { Card, Button, Input } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { formatDate } from "@/lib/utils/formatters";
import { useCurrency } from "@/lib/utils/useCurrency";
import { Payroll } from "@/lib/types";
import { FeatureGuard } from "@/components/FeatureGuard";

function PayrollContent() {
  const { fmt } = useCurrency();
  const mockPayroll: Payroll[] = [
    {
      id: "1",
      employeeId: "1",
      periodId: "1",
      baseSalary: 45000,
      hoursWorked: 160,
      bonuses: 0,
      deductions: 4500,
      total: 40500,
      status: "PAID",
    },
    {
      id: "2",
      employeeId: "2",
      periodId: "1",
      baseSalary: 65000,
      hoursWorked: 160,
      bonuses: 5000,
      deductions: 6500,
      total: 63500,
      status: "APPROVED",
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nómina</h1>
        <Button>+ Nuevo Período</Button>
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-slate-900 block mb-1">Período</label>
            <select className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900">
              <option>Agosto 2024</option>
              <option>Julio 2024</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-900 block mb-1">Estado</label>
            <select className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900">
              <option>Todos</option>
              <option>PAGADO</option>
              <option>APROBADO</option>
              <option>BORRADOR</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button className="w-full">Filtrar</Button>
          </div>
        </div>

        <DataTable<Payroll>
          columns={[
            { key: "employeeId", label: "Empleado" },
            {
              key: "baseSalary",
              label: "Salario Base",
              format: (value) => fmt(value),
            },
            { key: "hoursWorked", label: "Horas" },
            {
              key: "total",
              label: "Total",
              format: (value) => fmt(value),
            },
            { key: "status", label: "Estado" },
          ]}
          data={mockPayroll}
          actions={(item) => (
            <>
              <Button size="sm" variant="secondary">
                Ver
              </Button>
              <Button size="sm" variant="primary">
                Procesar
              </Button>
            </>
          )}
        />
      </Card>
    </div>
  );
}

export default function PayrollPage() {
  return (
    <FeatureGuard feature="payroll">
      <PayrollContent />
    </FeatureGuard>
  );
}
