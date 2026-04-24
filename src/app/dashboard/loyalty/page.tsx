"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button as UIButton } from "@/components/ui";
import { Button, Container, Section, Alert } from "@/components/StripeUIComponents";
import { PageIcon, SearchInput } from "@/components";
import { LoyaltyService } from "@/features/loyalty/services";
import { LoyalCustomer } from "@/lib/types";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useTenantId } from "@/lib/utils/tenant";
import { FeatureGuard } from "@/components/FeatureGuard";

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
    return Math.floor(Math.random() * 90000) + 10000; // 5 digits from 10000-99999
  };

  // Check if card number is unique in tenant
  const isCardNumberAvailable = async (cardNumber: string): Promise<boolean> => {
    if (!tenantId) return false;
    try {
      const response = await fetch(`/api/tenants/${tenantId}/loyalty/customers/check-card?card_number=${cardNumber}`);
      const data = await response.json();
      return data.available === true;
    } catch (error) {
      console.error('Error checking card number:', error);
      return false;
    }
  };

  // Generate unique card number - keeps trying until finding available one
  const generateUniqueCardNumber = async () => {
    let cardNumber = generateCardNumber().toString();
    let attempts = 0;
    const maxAttempts = 10;

    while (!(await isCardNumberAvailable(cardNumber)) && attempts < maxAttempts) {
      cardNumber = generateCardNumber().toString();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      setMessage('⚠️ Could not generate unique card number, please try again');
      setMessageType('error');
      return null;
    }

    return cardNumber;
  };

  // Reset form and generate new unique card number when modal opens
  const handleOpenAddModal = async () => {
    const newCardNumber = await generateUniqueCardNumber();
    if (newCardNumber) {
      setFormData({
        card_number: newCardNumber,
        name: "",
        phone: "",
        email: "",
      });
      setShowAddModal(true);
    }
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
    <FeatureGuard feature="loyalty">
      <Container>
        <Section>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <PageIcon type="loyalty" size="lg" displayType="lucide" />
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Clientes Fieles</h1>
                <p className="text-slate-600 mt-1">Gestiona tu programa de fidelización</p>
              </div>
            </div>
            <Button variant="primary" onClick={handleOpenAddModal}>
              + Nuevo Cliente
            </Button>
          </div>

          {message && (
            <Alert variant={messageType === "success" ? "success" : "error"} title={messageType === "success" ? "Éxito" : "Error"}>
              {message}
            </Alert>
          )}

          {/* Search */}
          <SearchInput
            value={search}
            onChange={(value) => setSearch(value)}
            placeholder="Buscar por nombre, teléfono o tarjeta..."
            className="flex-1"
          />

          {/* Customers table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Cargando...</div>
            ) : customers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                {search ? "No hay clientes que coincidan" : "No hay clientes fideles todavía"}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-900">
                    <th className="px-4 py-3 text-left font-semibold text-white">Nombre</th>
                    <th className="px-4 py-3 text-left font-semibold text-white">Tarjeta</th>
                    <th className="px-4 py-3 text-left font-semibold text-white hidden md:table-cell">Teléfono</th>
                    <th className="px-4 py-3 text-right font-semibold text-white">Total Gastado</th>
                    <th className="px-4 py-3 text-center font-semibold text-white">Visitas</th>
                    <th className="px-4 py-3 text-center font-semibold text-white">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/loyalty/${customer.id}`} className="text-blue-600 hover:underline font-medium">
                          {customer.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{customer.card_number}</td>
                      <td className="px-4 py-3 text-slate-700 hidden md:table-cell">{customer.phone || "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(customer.total_accumulated)}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{customer.total_visits}</td>
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
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 rounded-t-lg flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-white">Agregar Cliente Fiel</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="close-button"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleAddCustomer} className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">Número de Tarjeta</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={formData.card_number}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-900 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const newCardNumber = await generateUniqueCardNumber();
                          if (newCardNumber) {
                            setFormData({ ...formData, card_number: newCardNumber });
                          }
                        }}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-medium transition"
                        title="Generar nuevo número"
                      >
                        🔄
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Juan Pérez"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">Teléfono</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+505 8765 4321"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">Correo</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="juan@ejemplo.com"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="ghost" onClick={() => setShowAddModal(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button variant="primary" type="submit" className="flex-1">
                      Crear Cliente
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-sm w-full">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 rounded-t-lg">
                  <h2 className="text-lg font-semibold text-white">Confirmar eliminación</h2>
                </div>

                <div className="px-6 py-4">
                  <p className="text-slate-700">¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.</p>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
                  <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(showDeleteConfirm)} className="flex-1">
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Section>
      </Container>
    </FeatureGuard>
  );
}
