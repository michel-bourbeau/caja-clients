"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { LoyaltyService } from "@/features/loyalty/services";
import { LoyalCustomer } from "@/lib/types";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useTenantId } from "@/lib/utils/tenant";

export default function LoyaltyPage() {
  const tenantId = useTenantId();
  const { fmt } = useCurrency();
  const [customers, setCustomers] = useState<LoyalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  // Form state for new customer
  const [formData, setFormData] = useState({
    card_number: "",
    name: "",
    phone: "",
    email: "",
  });

  // Generate random 5-digit card number
  const generateCardNumber = () => {
    const randomNumber = Math.floor(Math.random() * 90000) + 10000; // 5 digits from 10000-99999
    return randomNumber.toString();
  };

  // Reset form and generate new card number when modal opens
  const handleOpenAddModal = () => {
    setFormData({
      card_number: generateCardNumber(),
      name: "",
      phone: "",
      email: "",
    });
    setShowAddModal(true);
  };

  useEffect(() => {
    if (!tenantId) return;
    loadCustomers();
  }, [tenantId]);

  const loadCustomers = async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const data = await LoyaltyService.getCustomers(tenantId, search || undefined);
      setCustomers(data);
    } catch (error) {
      console.error("Error loading customers:", error);
      setMessage("Error cargando clientes fideles");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, tenantId]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    try {
      await LoyaltyService.createCustomer(tenantId, formData);
      setMessage("✓ Cliente fiel creado exitosamente");
      setMessageType("success");
      setFormData({ card_number: "", name: "", phone: "", email: "" });
      setShowAddModal(false);
      await loadCustomers();

      setTimeout(() => {
        setMessage(null);
        setMessageType(null);
      }, 3000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Error creando cliente";
      setMessage(errorMsg);
      setMessageType("error");
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!tenantId) return;

    try {
      await LoyaltyService.deleteCustomer(tenantId, customerId);
      setMessage("✓ Cliente eliminado");
      setMessageType("success");
      setShowDeleteConfirm(null);
      await loadCustomers();

      setTimeout(() => {
        setMessage(null);
        setMessageType(null);
      }, 3000);
    } catch (error) {
      setMessage("Error eliminando cliente");
      setMessageType("error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes Fieles</h1>
          <p className="text-gray-600">Gestiona tu programa de fidelización</p>
        </div>
        <Button onClick={handleOpenAddModal} className="bg-blue-600 hover:bg-blue-700">
          + Nuevo Cliente
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded border ${
          messageType === "success"
            ? "border-green-300 bg-green-50 text-green-900"
            : "border-red-300 bg-red-50 text-red-900"
        }`}>
          {message}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o tarjeta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {/* Customers table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {search ? "No hay clientes que coincidan" : "No hay clientes fideles todavía"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Tarjeta</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 hidden md:table-cell">Teléfono</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Gastado</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Visitas</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/loyalty/${customer.id}`} className="text-blue-600 hover:underline font-medium">
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{customer.card_number}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{customer.phone || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(customer.total_accumulated)}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{customer.total_visits}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setShowDeleteConfirm(customer.id)}
                      className="text-red-600 hover:text-red-800 text-xs font-semibold hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Agregar Cliente Fiel</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Tarjeta</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={formData.card_number}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, card_number: generateCardNumber() })}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition"
                    title="Generar nuevo número"
                  >
                    🔄
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="+505 8765 4321"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="juan@ejemplo.com"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Confirmar eliminación</h2>
            </div>

            <div className="px-6 py-4">
              <p className="text-gray-700">¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.</p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
