import { Card, Button, Input } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Configuración</h1>

      <div className="space-y-6 max-w-2xl">
        {/* Company Settings */}
        <Card title="Información de la Empresa">
          <div className="space-y-4">
            <Input label="Nombre de Empresa" defaultValue="Mi Negocio SRL" />
            <Input label="CUIT" defaultValue="20-12345678-9" />
            <Input label="Email" defaultValue="contacto@minegocio.com" />
            <Input label="Teléfono" defaultValue="011-1234-5678" />
            <div className="text-right">
              <Button>Guardar Cambios</Button>
            </div>
          </div>
        </Card>

        {/* Tax Settings */}
        <Card title="Configuración de Impuestos">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-2">
                Tasa de IVA (%)
              </label>
              <Input type="number" defaultValue="21" step="0.01" />
            </div>
            <div className="text-right">
              <Button>Guardar Cambios</Button>
            </div>
          </div>
        </Card>

        {/* POS Settings */}
        <Card title="Configuración de Cajas">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="roundTotal" className="w-4 h-4" defaultChecked />
              <label htmlFor="roundTotal" className="text-sm font-medium text-slate-900">
                Redondear totales al número entero
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="printReceipt" className="w-4 h-4" defaultChecked />
              <label htmlFor="printReceipt" className="text-sm font-medium text-slate-900">
                Imprimir comprobante automáticamente
              </label>
            </div>
            <div className="text-right">
              <Button>Guardar Cambios</Button>
            </div>
          </div>
        </Card>

        {/* Backup */}
        <Card title="Datos y Seguridad" className="border border-amber-200 bg-amber-50">
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Realiza copias de seguridad regulares de tus datos.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary">📥 Descargar Backup</Button>
              <Button variant="secondary">⬆️ Restaurar Backup</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
