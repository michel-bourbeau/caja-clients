import { Card } from "@/components/ui";
import { UserPermissionsCard } from "@/components/UserPermissionsCard";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Ventas Hoy" value="$2,450.50" change="+12%" color="blue" />
        <StatCard title="Transacciones" value="24" change="+3" color="green" />
        <StatCard title="Inventario" value="1,234 items" change="Normal" color="amber" />
        <StatCard title="Empleados" value="12" change="Activos" color="purple" />
      </div>

      <UserPermissionsCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <Card title="Ventas Recientes" className="lg:col-span-2">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                <div>
                  <p className="font-medium text-slate-900">Venta #{i}</p>
                  <p className="text-sm text-slate-500">Hace 2 horas</p>
                </div>
                <p className="font-semibold text-slate-900">$450.00</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Alertas">
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
              <p className="text-sm font-medium text-yellow-900">Stock bajo</p>
              <p className="text-xs text-yellow-700">3 productos bajo stock</p>
            </div>
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm font-medium text-blue-900">Nómina pendiente</p>
              <p className="text-xs text-blue-700">Período del 1-15 ago</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  color: "blue" | "green" | "amber" | "purple";
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, color }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-900",
    green: "bg-green-100 text-green-900",
    amber: "bg-amber-100 text-amber-900",
    purple: "bg-purple-100 text-purple-900",
  };

  return (
    <Card className={`${colors[color]}`}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-xs font-medium mt-2">{change}</p>
    </Card>
  );
};
