import { Card, Button } from "@/components/ui";

export default function SchedulesPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Horarios</h1>
        <Button>+ Nuevo Horario</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map(
          (day) => (
            <Card key={day} className="p-4">
              <h3 className="font-bold text-slate-900 mb-3">{day}</h3>
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-blue-50 rounded">
                  <p className="font-medium">Juan García</p>
                  <p className="text-xs text-slate-600">09:00 - 17:00</p>
                </div>
                <div className="p-2 bg-green-50 rounded">
                  <p className="font-medium">María Rodríguez</p>
                  <p className="text-xs text-slate-600">13:00 - 21:00</p>
                </div>
              </div>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
