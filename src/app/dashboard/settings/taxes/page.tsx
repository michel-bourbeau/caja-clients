"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/components/ui";

interface Tax {
  id: string;
  name: string;
  rate: number;
  is_active: boolean;
}

export default function TaxesSettingsPage() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const router = useRouter();

  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showAddTax, setShowAddTax] = useState(false);
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    rate: "",
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    // Removido: verificação de permissão para permitir acesso a todos os admins
    fetchTaxes();
  }, [tenantId, user]);

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tenants/${tenantId}/taxes`);
      if (res.ok) {
        setTaxes(await res.json());
      }
    } catch (error) {
      console.error("Error al cargar impuestos:", error);
      setMessage("Error al cargar impuestos");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTax = async () => {
    if (!formData.name.trim() || !formData.rate) {
      setMessage("Por favor, completa todos los campos");
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${tenantId}/taxes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          rate: parseFloat(formData.rate),
          is_active: true,
        }),
      });

      if (res.ok) {
        setMessage("Impuesto creado exitosamente");
        setFormData({ name: "", rate: "" });
        setShowAddTax(false);
        await fetchTaxes();
      } else {
        const error = await res.json();
        setMessage(error.error || "Error al crear");
      }
    } catch (error) {
      setMessage("Error de conexión");
      console.error(error);
    }
  };

  const handleUpdateTax = async (taxId: string) => {
    if (!formData.name.trim() || !formData.rate) {
      setMessage("Por favor, completa todos los campos");
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${tenantId}/taxes/${taxId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          rate: parseFloat(formData.rate),
        }),
      });

      if (res.ok) {
        setMessage("Impuesto actualizado exitosamente");
        setFormData({ name: "", rate: "" });
        setEditingTaxId(null);
        await fetchTaxes();
      } else {
        const error = await res.json();
        setMessage(error.error || "Error al actualizar");
      }
    } catch (error) {
      setMessage("Error de conexión");
      console.error(error);
    }
  };

  const handleDeleteTax = async (taxId: string) => {
    if (!confirm("¿Confirmar la eliminación de este impuesto?")) return;

    try {
      const res = await fetch(`/api/tenants/${tenantId}/taxes/${taxId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage("Impuesto eliminado");
        await fetchTaxes();
      } else {
        setMessage("Error al eliminar");
      }
    } catch (error) {
      setMessage("Erreur réseau");
      console.error(error);
    }
  };

  const toggleTaxActive = async (tax: Tax) => {
    try {
      const res = await fetch(`/api/tenants/${tenantId}/taxes/${tax.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tax.name,
          rate: tax.rate,
          is_active: !tax.is_active,
        }),
      });

      if (res.ok) {
        await fetchTaxes();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Impuestos</h1>
        <Button
          onClick={() => {
            setShowAddTax(!showAddTax);
            setEditingTaxId(null);
            setFormData({ name: "", rate: "" });
          }}
          className="bg-green-600 text-white"
        >
          + Agregar Impuesto
        </Button>
      </div>

      {message && (
        <div className="p-3 bg-blue-100 text-blue-700 rounded">
          {message}
        </div>
      )}

      {/* Add/Edit Tax Form */}
      {(showAddTax || editingTaxId) && (
        <Card className="p-4 bg-white border-2 border-green-400">
          <h2 className="font-bold mb-4 text-gray-900 text-lg">
            {editingTaxId ? "Editar Impuesto" : "Nuevo Impuesto"}
          </h2>
          <div className="space-y-3">
            <Input
              label="Nombre del Impuesto"
              placeholder="Ej: IVA, ISC, Impuesto Municipal, etc."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Tasa (%)"
              type="number"
              placeholder="Ej: 15"
              step="0.01"
              min="0"
              max="100"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
            />
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  editingTaxId
                    ? handleUpdateTax(editingTaxId)
                    : handleAddTax()
                }
                className="bg-green-600 text-white"
              >
                {editingTaxId ? "Actualizar" : "Crear"}
              </Button>
              <Button
                onClick={() => {
                  setShowAddTax(false);
                  setEditingTaxId(null);
                  setFormData({ name: "", rate: "" });
                }}
                className="bg-gray-400"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Taxes List */}
      <div className="space-y-3">
        {taxes.length === 0 ? (
          <Card className="p-6 text-center text-gray-900">
            Sin impuestos configurados. Crea al menos un impuesto para usarlo en las ventas.
          </Card>
        ) : (
          taxes.map((tax) => (
            <Card key={tax.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
              <div>
                <p className="font-semibold text-gray-900">{tax.name}</p>
                <p className="text-sm text-gray-700">Tasa: {tax.rate}%</p>
              </div>
              <div className="flex gap-2 items-center">
                <Button
                  onClick={() => toggleTaxActive(tax)}
                  className={tax.is_active ? "bg-green-600 text-white" : "bg-gray-400"}
                >
                  {tax.is_active ? "✓ Activo" : "Inactivo"}
                </Button>
                <Button
                  onClick={() => {
                    setEditingTaxId(tax.id);
                    setFormData({ name: tax.name, rate: tax.rate.toString() });
                    setShowAddTax(false);
                  }}
                  className="bg-blue-500 text-white"
                >
                  ✎
                </Button>
                <Button
                  onClick={() => handleDeleteTax(tax.id)}
                  className="bg-red-500 text-white"
                >
                  ✕
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="p-4 bg-blue-50 border-2 border-blue-200">
        <h3 className="font-bold text-gray-900 mb-2">ℹ️ Información</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Los impuestos activos aparecerán en la sección "Resumen de Venta" del POS</li>
          <li>• Puedes definir múltiples impuestos (IVA, Impuesto municipal, etc.)</li>
          <li>• El nombre del impuesto es flexible: IVA, ISC, GST, etc.</li>
          <li>• Los impuestos inactivos no se utilizan en los cálculos</li>
        </ul>
      </Card>
    </div>
  );
}
