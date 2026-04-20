"use client";

import React, { useState, useEffect } from "react";
import { useSuperAdmin } from "@/context/SuperAdminContext";
import { Button, Input, Card } from "@/components/ui";
import { useRouter } from "next/navigation";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  features: Record<string, boolean>;
  created_at: string;
}

const AVAILABLE_MODULES = [
  { id: "pos", label: "Point of Sale (Cajas)", icon: "🛒" },
  { id: "inventory", label: "Gestión de Inventario", icon: "📦" },
  { id: "employees", label: "Gestión de Empleados", icon: "👥" },
  { id: "schedules", label: "Horarios y Turnos", icon: "📅" },
  { id: "payroll", label: "Nómina", icon: "💰" },
  { id: "reports", label: "Reportes", icon: "📊" },
  { id: "settings", label: "Configuración", icon: "⚙️" },
];

export default function SuperAdminDashboard() {
  const { isSuperAdmin, logout } = useSuperAdmin();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    plan: "basic",
  });

  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({
    pos: true,
    inventory: true,
    employees: false,
    schedules: false,
    payroll: false,
    reports: false,
    settings: false,
  });

  // Redirect if not superadmin
  useEffect(() => {
    if (!isSuperAdmin) {
      router.push("/superadmin/login");
    }
  }, [isSuperAdmin, router]);

  // Load tenants
  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/superadmin/tenants");
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {
      console.error("Erreur chargement tenants:", error);
      setMessage("❌ Erreur lors du chargement des tenants");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug) {
      setMessage("❌ Nom et slug requis");
      return;
    }

    try {
      const response = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          plan: formData.plan,
          features: selectedModules,
        }),
      });

      if (response.ok) {
        const newTenant = await response.json();
        setTenants([newTenant, ...tenants]);
        setMessage(`✅ Tenant créé: ${newTenant.id}`);
        setFormData({ name: "", slug: "", plan: "basic" });
        setShowCreateForm(false);
        setTimeout(() => setMessage(""), 3000);
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.message}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur: ${error instanceof Error ? error.message : "Erreur serveur"}`);
    }
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingTenant) return;

    try {
      const response = await fetch(`/api/superadmin/tenants/${editingTenant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features: selectedModules,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setTenants(tenants.map((t) => (t.id === updated.id ? updated : t)));
        setMessage(`✅ Modules actualisés pour ${editingTenant.name}`);
        setEditingTenant(null);
        setTimeout(() => setMessage(""), 3000);
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.message}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur: ${error instanceof Error ? error.message : "Erreur serveur"}`);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/superadmin/login");
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-purple-600">🔐 SuperAdmin Console</h1>
            <p className="text-slate-600 mt-2">Gestion des Tenants et Modules</p>
          </div>
          <Button onClick={handleLogout} className="bg-red-600">
            Déconnexion
          </Button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded mb-6 ${
              message.includes("✅")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* Create Button */}
        <div className="mb-6">
          <Button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-purple-600">
            {showCreateForm ? "❌ Annuler" : "➕ Créer un Tenant"}
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card className="p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Créer un Nouveau Tenant</h2>
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Nom du Tenant"
                  placeholder="Mi Negocio S.A."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  label="Slug (URL)"
                  placeholder="mi-negocio"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-sm font-semibold mb-2">Plan</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="basic">Básico</option>
                    <option value="professional">Profesional</option>
                    <option value="enterprise">Empresarial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-4">Modules</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {AVAILABLE_MODULES.map((module) => (
                    <label key={module.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedModules[module.id]}
                        onChange={(e) =>
                          setSelectedModules({
                            ...selectedModules,
                            [module.id]: e.target.checked,
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span>
                        {module.icon} {module.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full bg-purple-600">
                Créer le Tenant
              </Button>
            </form>
          </Card>
        )}

        {/* Tenants List */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Tenants Actifs</h2>
          {loading ? (
            <p className="text-slate-600">Chargement...</p>
          ) : tenants.length === 0 ? (
            <Card className="p-8 text-center text-slate-600">
              Aucun tenant créé. Cliquez sur "Créer un Tenant" pour commencer.
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {tenants.map((tenant) => (
                <Card key={tenant.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{tenant.name}</h3>
                      <p className="text-sm text-slate-600">
                        Slug: <code className="bg-slate-100 px-2 py-1 rounded">{tenant.slug}</code>
                      </p>
                      <p className="text-xs text-gray-700 mt-1">
                        ID: {tenant.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm font-semibold">
                        Plan: {tenant.plan}
                      </span>
                    </div>
                  </div>

                  {editingTenant?.id === tenant.id ? (
                    <form onSubmit={handleUpdateTenant} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-3">Modules</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {AVAILABLE_MODULES.map((module) => (
                            <label key={module.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedModules[module.id] || false}
                                onChange={(e) =>
                                  setSelectedModules({
                                    ...selectedModules,
                                    [module.id]: e.target.checked,
                                  })
                                }
                                className="w-4 h-4"
                              />
                              <span className="text-sm">{module.icon} {module.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="bg-green-600">
                          ✅ Sauvegarder
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setEditingTenant(null)}
                          className="bg-slate-400"
                        >
                          ❌ Annuler
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <div className="mb-4">
                        <label className="text-sm font-semibold text-slate-900 block mb-2">
                          Modules Actifs:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {AVAILABLE_MODULES.map((module) =>
                            tenant.features?.[module.id] ? (
                              <span
                                key={module.id}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm"
                              >
                                {module.icon} {module.label}
                              </span>
                            ) : null
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setEditingTenant(tenant);
                          setSelectedModules(tenant.features || {});
                        }}
                        className="bg-blue-600"
                      >
                        ✏️ Modifier Modules
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
