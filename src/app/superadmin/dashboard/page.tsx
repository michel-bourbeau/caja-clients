"use client";

import React, { useState, useEffect } from "react";
import { useSuperAdmin } from "@/context/SuperAdminContext";
import { Button, Input, Card } from "@/components/ui";
import { useRouter } from "next/navigation";
import { SUPERADMIN_IMPERSONATION_KEY } from "@/context/AuthContext";

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

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  basic: { label: "Básico", color: "bg-slate-100 text-slate-700" },
  professional: { label: "Profesional", color: "bg-blue-100 text-blue-700" },
  enterprise: { label: "Empresarial", color: "bg-purple-100 text-purple-700" },
  custom: { label: "Personnalisé", color: "bg-orange-100 text-orange-700" },
};

const PLAN_PRESETS: Record<string, Record<string, boolean>> = {
  basic: {
    pos: true,
    inventory: true,
    employees: false,
    schedules: false,
    payroll: false,
    reports: false,
    settings: true,
  },
  professional: {
    pos: true,
    inventory: true,
    employees: true,
    schedules: true,
    payroll: false,
    reports: true,
    settings: true,
  },
  enterprise: {
    pos: true,
    inventory: true,
    employees: true,
    schedules: true,
    payroll: true,
    reports: true,
    settings: true,
  },
};

export default function SuperAdminDashboard() {
  const { isSuperAdmin, logout } = useSuperAdmin();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editingPlan, setEditingPlan] = useState<string>("basic");
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    plan: "basic",
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPassword: "",
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
          adminEmail: formData.adminEmail || undefined,
          adminPassword: formData.adminPassword || undefined,
          adminFirstName: formData.adminFirstName || undefined,
          adminLastName: formData.adminLastName || undefined,
        }),
      });

      if (response.ok) {
        const newTenant = await response.json();
        setTenants([newTenant, ...tenants]);
        const adminMsg = newTenant.adminCreated ? ` — Admin: ${newTenant.adminEmail}` : "";
        setMessage(`✅ Tenant créé: ${newTenant.id}${adminMsg}`);
        setFormData({ name: "", slug: "", plan: "basic", adminFirstName: "", adminLastName: "", adminEmail: "", adminPassword: "" });
        setShowCreateForm(false);
        setTimeout(() => setMessage(""), 6000);
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
          plan: editingPlan,
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

  const enterTenant = (tenant: Tenant) => {
    sessionStorage.setItem(
      SUPERADMIN_IMPERSONATION_KEY,
      JSON.stringify({ tenantId: tenant.id, tenantName: tenant.name, superadmin: true })
    );
    sessionStorage.setItem("defaultTenantId", tenant.id);
    // Full reload so AuthContext re-initialises and detects the impersonation key
    window.location.href = "/dashboard";
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
            <p className="text-gray-700 mt-2">Gestion des Tenants et Modules</p>
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

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-purple-600">
            {showCreateForm ? "❌ Annuler" : "➕ Créer un Tenant"}
          </Button>
          <Button onClick={() => router.push("/superadmin/users")} className="bg-indigo-600">
            👥 Gestion des Utilisateurs
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
                    onChange={(e) => {
                      const plan = e.target.value;
                      setFormData({ ...formData, plan });
                      setSelectedModules(PLAN_PRESETS[plan] ?? PLAN_PRESETS.basic);
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                  >
                    <option value="basic">Básico — POS + Inventario</option>
                    <option value="professional">Profesional — + Empleados, Horarios, Reportes</option>
                    <option value="enterprise">Empresarial — Tout inclus</option>
                    <option value="custom">Personnalisé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Modules</label>
                <p className="text-xs text-slate-500 mb-3">
                  Pré-sélectionnés selon le plan — vous pouvez ajuster manuellement.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {AVAILABLE_MODULES.map((module) => (
                    <label key={module.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedModules[module.id]}
                        onChange={(e) =>
                          setSelectedModules((prev) => {
                            const updated = { ...prev, [module.id]: e.target.checked };
                            // If result no longer matches the current plan preset, switch to custom
                            const preset = PLAN_PRESETS[formData.plan];
                            if (preset) {
                              const matchesPreset = AVAILABLE_MODULES.every((m) => updated[m.id] === preset[m.id]);
                              if (!matchesPreset) setFormData((f) => ({ ...f, plan: "custom" }));
                            }
                            return updated;
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

              {/* Admin Account */}
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <h3 className="font-bold text-purple-800 mb-3">👤 Compte Admin du Tenant</h3>
                <p className="text-xs text-purple-600 mb-3">
                  Facultatif — si renseigné, un compte admin sera créé avec tous les droits dans ce tenant.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Prénom Admin"
                    placeholder="Jean"
                    value={formData.adminFirstName}
                    onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                  />
                  <Input
                    label="Nom Admin"
                    placeholder="Dupont"
                    value={formData.adminLastName}
                    onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                  />
                  <Input
                    label="Email Admin"
                    type="email"
                    placeholder="admin@entreprise.com"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  />
                  <Input
                    label="Mot de passe (min 6 car.)"
                    type="password"
                    placeholder="••••••••"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  />
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
            <p className="text-gray-800">Chargement...</p>
          ) : tenants.length === 0 ? (
            <Card className="p-8 text-center text-gray-800">
              Aucun tenant créé. Cliquez sur "Créer un Tenant" pour commencer.
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {tenants.map((tenant) => (
                <Card key={tenant.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{tenant.name}</h3>
                      <p className="text-sm text-gray-700">
                        Slug: <code className="bg-slate-100 px-2 py-1 rounded">{tenant.slug}</code>
                      </p>
                      <p className="text-xs text-gray-700 mt-1">
                        ID: {tenant.id}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${PLAN_LABELS[tenant.plan]?.color || "bg-slate-100 text-slate-700"}`}>
                        {PLAN_LABELS[tenant.plan]?.label || tenant.plan}
                      </span>
                      <button
                        onClick={() => enterTenant(tenant)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Accéder
                      </button>
                    </div>
                  </div>

                  {editingTenant?.id === tenant.id ? (
                    <form onSubmit={handleUpdateTenant} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-slate-900">Plan</label>
                        <select
                          value={editingPlan}
                          onChange={(e) => {
                            const plan = e.target.value;
                            setEditingPlan(plan);
                            if (PLAN_PRESETS[plan]) setSelectedModules(PLAN_PRESETS[plan]);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm mb-3"
                        >
                          <option value="basic">Básico — POS + Inventario</option>
                          <option value="professional">Profesional — + Empleados, Horarios, Reportes</option>
                          <option value="enterprise">Empresarial — Tout inclus</option>
                          <option value="custom">Personnalisé</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-3 text-slate-900">Modules</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {AVAILABLE_MODULES.map((module) => (
                            <label key={module.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedModules[module.id] || false}
                                onChange={(e) => {
                                  const updated = { ...selectedModules, [module.id]: e.target.checked };
                                  const preset = PLAN_PRESETS[editingPlan];
                                  if (preset) {
                                    const matchesPreset = AVAILABLE_MODULES.every((m) => updated[m.id] === preset[m.id]);
                                    if (!matchesPreset) setEditingPlan("custom");
                                  }
                                  setSelectedModules(updated);
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-slate-900">{module.icon} {module.label}</span>
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
                          Modules:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {AVAILABLE_MODULES.map((module) =>
                            tenant.features?.[module.id] ? (
                              <span
                                key={module.id}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium"
                              >
                                {module.icon} {module.label}
                              </span>
                            ) : (
                              <span
                                key={module.id}
                                className="px-3 py-1 bg-slate-100 text-slate-400 rounded text-sm line-through"
                              >
                                {module.icon} {module.label}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setEditingTenant(tenant);
                          setSelectedModules(tenant.features || {});
                          setEditingPlan(tenant.plan || "basic");
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
