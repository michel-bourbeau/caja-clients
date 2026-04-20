"use client";

import { Card, Button, Input } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import { Transaction } from "@/lib/types";

export default function TransactionsPage() {
  const mockTransactions: Transaction[] = [
    {
      id: "TX001",
      items: [],
      subtotal: 200,
      tax: 42,
      total: 242,
      paymentMethod: "CASH",
      timestamp: new Date(),
      cashierId: "1",
      status: "COMPLETED",
    },
    {
      id: "TX002",
      items: [],
      subtotal: 500,
      tax: 105,
      total: 605,
      paymentMethod: "CARD",
      timestamp: new Date(),
      cashierId: "2",
      status: "COMPLETED",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Transacciones</h1>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Input type="date" placeholder="Desde" />
          <Input type="date" placeholder="Hasta" />
          <select className="px-3 py-2 border border-slate-300 rounded text-slate-900">
            <option>Todos los métodos</option>
            <option>EFECTIVO</option>
            <option>TARJETA</option>
            <option>TRANSFERENCIA</option>
          </select>
          <Button>Buscar</Button>
        </div>

        <DataTable<Transaction>
          columns={[
            { key: "id", label: "ID Transacción" },
            {
              key: "timestamp",
              label: "Fecha/Hora",
              format: (value) => formatDateTime(value as Date),
            },
            {
              key: "total",
              label: "Total",
              format: (value) => formatCurrency(value),
            },
            { key: "paymentMethod", label: "Método de Pago" },
            { key: "status", label: "Estado" },
          ]}
          data={mockTransactions}
          actions={(item) => (
            <>
              <Button size="sm" variant="secondary">
                Ver Detalle
              </Button>
              <Button size="sm" variant="danger">
                Revertir
              </Button>
            </>
          )}
        />
      </Card>
    </div>
  );
}
