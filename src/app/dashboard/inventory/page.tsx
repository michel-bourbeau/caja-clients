import { Card, Button, Input } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { Product } from "@/lib/types";

export default function InventoryPage() {
  const mockProducts: Product[] = [
    {
      id: "1",
      name: "Laptop Dell",
      sku: "DELL-001",
      price: 1200.0,
      quantity: 5,
      category: "Electrónica",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "2",
      name: "Mouse Logitech",
      sku: "LOG-002",
      price: 25.0,
      quantity: 50,
      category: "Accesorios",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Inventario</h1>
        <Button>+ Nuevo Producto</Button>
      </div>

      <Card className="mb-6">
        <div className="flex gap-4 mb-6">
          <Input placeholder="Buscar productos..." className="flex-1" />
          <select className="px-3 py-2 border border-slate-300 rounded text-slate-900">
            <option>Todas las categorías</option>
            <option>Electrónica</option>
            <option>Accesorios</option>
          </select>
        </div>

        <DataTable<Product>
          columns={[
            { key: "name", label: "Nombre" },
            { key: "sku", label: "SKU" },
            {
              key: "price",
              label: "Precio",
              format: (value) => formatCurrency(value),
            },
            { key: "quantity", label: "Stock" },
            { key: "category", label: "Categoría" },
          ]}
          data={mockProducts}
          actions={(product) => (
            <>
              <Button size="sm" variant="secondary">
                Editar
              </Button>
              <Button size="sm" variant="danger">
                Eliminar
              </Button>
            </>
          )}
        />
      </Card>
    </div>
  );
}
