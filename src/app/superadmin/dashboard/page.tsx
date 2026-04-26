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
  is_paid?: boolean;
  trial_ends_at?: string | null;
}

const AVAILABLE_MODULES = [
  { id: "pos", label: "Point of Sale (Cajas)", icon: "🛒", description: "Caja, Transacciones, Cierre de Caja" },
  { id: "inventory", label: "Gestión de Inventario", icon: "📦", description: "Gestion de productos y stock" },
  { id: "employees", label: "Gestión de Empleados", icon: "👥", description: "Empleados, Gestionar de Roles" },
  { id: "schedules", label: "Horarios y Turnos", icon: "📅", description: "Asistencia y horarios" },
  { id: "payroll", label: "Nómina", icon: "💰", description: "Recibos, Períodos de Pago" },
  { id: "reports", label: "Reportes de Ventas", icon: "📊", description: "Análisis y reportes" },
  { id: "loyalty", label: "Clientes Fieles", icon: "💳", description: "Programa de fidelización" },
  { id: "expenses", label: "Gastos y Proveedores", icon: "💸", description: "Registro de gastos" },
  { id: "taxes", label: "Impuestos", icon: "📋", description: "Gestión de impuestos" },
  { id: "contacts", label: "Contactos", icon: "📋", description: "Gestión de contactos importantes" },
];

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  basic: { label: "Básico", color: "bg-slate-100 text-slate-700" },
  professional: { label: "Profesional", color: "bg-blue-100 text-blue-700" },
  enterprise: { label: "Empresarial", color: "bg-purple-100 text-purple-700" },
  custom: { label: "Personnalisé", color: "bg-orange-100 text-orange-700" },
};

// Precios mensuales en NIO (Nicaragua)
const PLAN_PRICES: Record<string, number> = {
  basic: 475,
  professional: 1150,
  enterprise: 2050,
  custom: 0,
};

const PLAN_PRESETS: Record<string, Record<string, boolean>> = {
  basic: {
    pos: true,
    inventory: true,
    employees: false,
    schedules: false,
    payroll: false,
    reports: false,
    loyalty: false,
    expenses: false,
    taxes: false,
    contacts: false,
  },
  professional: {
    pos: true,
    inventory: true,
    employees: true,
    schedules: true,
    payroll: false,
    reports: true,
    loyalty: true,
    expenses: true,
    taxes: true,
    contacts: true,
  },
  enterprise: {
    pos: true,
    inventory: true,
    employees: true,
    schedules: true,
    payroll: true,
    reports: true,
    loyalty: true,
    expenses: true,
    taxes: true,
    contacts: true,
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
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showManagePlans, setShowManagePlans] = useState(false);
  const [planConfigs, setPlanConfigs] = useState<Record<string, Record<string, boolean>>>(PLAN_PRESETS);
  const [planPrices, setPlanPrices] = useState<Record<string, number>>(PLAN_PRICES);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalTenant, setPaymentModalTenant] = useState<Tenant | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({ amount: "", paid_until: "", payment_method: "", notes: "" });
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);

  // Generate dynamic plan description based on enabled modules
  const getPlanDescription = (planId: string): string => {
    const modules = planConfigs[planId];
    if (!modules) return "";
    
    const enabledCount = Object.values(modules).filter(Boolean).length;
    const enabledModules = Object.entries(modules)
      .filter(([_, enabled]) => enabled)
      .map(([moduleId]) => AVAILABLE_MODULES.find(m => m.id === moduleId)?.label)
      .filter(Boolean);
    
    if (enabledCount === 0) return "Aucun module";
    return `${enabledCount} module${enabledCount > 1 ? 's' : ''} — ${enabledModules.slice(0, 2).join(', ')}${enabledCount > 2 ? '...' : ''}`;
  };

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
    loyalty: false,
    expenses: false,
    taxes: false,
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
    loadPlanConfigs();
  }, []);

  const loadPlanConfigs = async () => {
    try {
      const res = await fetch("/api/superadmin/plan-configs");
      if (res.ok) {
        const data = await res.json();
        if (data.configs) {
          setPlanConfigs(data.configs);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des configs:", error);
    }
  };

  const savePlanConfigs = async () => {
    try {
      const res = await fetch("/api/superadmin/plan-configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: planConfigs }),
      });

      if (res.ok) {
        setMessage("✅ Configuration des forfaits sauvegardée avec succès");
        // Reload from server to confirm persistence
        await loadPlanConfigs();
        setShowManagePlans(false);
        return true;
      } else {
        const error = await res.json();
        setMessage(`❌ Erreur: ${error.error || "Impossible de sauvegarder"}`);
        return false;
      }
    } catch (error) {
      setMessage(`❌ Erreur: ${error instanceof Error ? error.message : "Erreur serveur"}`);
      return false;
    }
  };

  const savePlanPrices = async () => {
    try {
      const res = await fetch("/api/superadmin/plan-prices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices: planPrices }),
      });

      if (res.ok) {
        setMessage("✅ Prix des forfaits sauvegardés avec succès");
        setTimeout(() => setMessage(""), 3000);
        return true;
      } else {
        const error = await res.json();
        setMessage(`❌ Erreur: ${error.error || "Impossible de sauvegarder"}`);
        return false;
      }
    } catch (error) {
      setMessage(`❌ Erreur: ${error instanceof Error ? error.message : "Erreur serveur"}`);
      return false;
    }
  };

  const openPaymentModal = async (tenant: Tenant & { paid_until?: string | Date | null }) => {
    setPaymentModalTenant(tenant as any);
    setPaymentFormData({ 
      amount: String(PLAN_PRICES[tenant.plan] || ""), 
      paid_until: (tenant.paid_until) ? new Date(tenant.paid_until).toISOString().split('T')[0] : "",
      payment_method: "",
      notes: ""
    });
    setPaymentHistory([]);
    setLoadingPaymentHistory(true);
    
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}/payment`);
      if (res.ok) {
        const data = await res.json();
        setPaymentHistory(data.history || []);
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoadingPaymentHistory(false);
    }
    
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!paymentModalTenant || !paymentFormData.paid_until) {
      setMessage("❌ Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      const res = await fetch(`/api/superadmin/tenants/${paymentModalTenant.id}/payment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: paymentModalTenant.plan,
          amount: Number(paymentFormData.amount),
          paid_until: paymentFormData.paid_until,
          payment_method: paymentFormData.payment_method,
          notes: paymentFormData.notes,
        }),
      });

      if (res.ok) {
        setMessage("✅ Paiement enregistré avec succès");
        setTimeout(() => setMessage(""), 3000);
        setShowPaymentModal(false);
        fetchTenants();
      } else {
        const error = await res.json();
        setMessage(`❌ Erreur: ${error.error || "Impossible d'enregistrer"}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur: ${error instanceof Error ? error.message : "Erreur serveur"}`);
    }
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/superadmin/tenants");
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {

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
          features: { ...selectedModules, settings: true },
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
          features: { ...selectedModules, settings: true },
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

  const handleSyncTenant = async (tenant: Tenant) => {
    try {
      // Get modules for this tenant's plan
      const planModules = planConfigs[tenant.plan] || planConfigs.basic;
      
      const response = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features: { ...planModules, settings: true },
          plan: tenant.plan,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setTenants(tenants.map((t) => (t.id === updated.id ? updated : t)));
        setMessage(`✅ Les modules de ${tenant.name} ont été synchronisés avec le plan ${PLAN_LABELS[tenant.plan]?.label || tenant.plan}`);
        setTimeout(() => setMessage(""), 3000);
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.message}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur: ${error instanceof Error ? error.message : "Erreur serveur"}`);
    }
  };

  const markAsPaid = async (tenant: Tenant) => {
    try {
      const response = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_paid: true,
          trial_ends_at: null, // Supprimer la date d'expiration
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setTenants(tenants.map((t) => (t.id === updated.id ? updated : t)));
        setMessage(`✅ ${tenant.name} marqué comme payé`);
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

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (deleteConfirmation !== tenant.name) {
      setMessage("❌ Erreur: veuillez confirmer en tapant le nom du tenant");
      return;
    }

    try {
      setDeletingTenantId(tenant.id);
      const response = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage(`✅ Tenant "${tenant.name}" et toutes ses données ont été supprimés`);
        setTenants((prev) => prev.filter((t) => t.id !== tenant.id));
        setDeletingTenantId(null);
        setDeleteConfirmation("");
      } else {
        const error = await response.json();
        setMessage(`❌ Erreur: ${error.message}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur: ${error instanceof Error ? error.message : "Erreur serveur"}`);
    } finally {
      setDeletingTenantId(null);
    }
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
          <Button onClick={() => setShowManagePlans(!showManagePlans)} className="bg-orange-600">
            {showManagePlans ? "❌ Fermer" : "🎯 Gérer les Plans"}
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
                      setSelectedModules(planConfigs[plan] ?? planConfigs.basic);
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                  >
                    {Object.entries(PLAN_LABELS).map(([planId, planInfo]) => (
                      <option key={planId} value={planId}>
                        {planInfo.label} — {getPlanDescription(planId)}
                      </option>
                    ))}
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
                            const preset = planConfigs[formData.plan];
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

        {/* Manage Plans Form */}
        {showManagePlans && (
          <Card className="p-6 mb-8 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300">
            <h2 className="text-2xl font-bold mb-6 text-orange-900">🎯 Gérer les Types de Forfaits</h2>
            <p className="text-sm text-orange-800 mb-6">
              Activez ou désactivez les modules pour chaque type de forfait. Ces paramètres seront appliqués à tous les nouveaux tenants.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(PLAN_LABELS).map(([planId, planInfo]) => (
                <Card key={planId} className="p-4 border-2 border-orange-200 bg-white">
                  <div className="mb-4">
                    <h3 className="font-bold text-lg text-orange-900 mb-1">{planInfo.label}</h3>
                    <p className="text-xs text-orange-700">ID: {planId}</p>
                  </div>

                  {/* Pricing Section */}
                  {planId !== "custom" && (
                    <div className="mb-4 pb-4 border-b-2 border-orange-100">
                      <label className="block text-xs font-semibold text-orange-800 mb-2">💵 Prix fixe (NIO/mois)</label>
                      <input
                        type="number"
                        placeholder="Montant"
                        value={planPrices[planId] ?? 0}
                        onChange={(e) =>
                          setPlanPrices((prev) => ({
                            ...prev,
                            [planId]: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2 py-1 border border-orange-300 rounded text-sm"
                      />
                      <p className="text-xs text-orange-600 mt-1">
                        💰 {planPrices[planId] ?? 0} NIO/mes
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2 mb-4 border-t-2 border-orange-100 pt-4">
                    {AVAILABLE_MODULES.map((module) => (
                      <label key={module.id} className="flex items-center gap-2 cursor-pointer hover:bg-orange-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={planConfigs[planId]?.[module.id] ?? false}
                          onChange={(e) => {
                            setPlanConfigs((prev) => ({
                              ...prev,
                              [planId]: {
                                ...prev[planId],
                                [module.id]: e.target.checked,
                              },
                            }));
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-700">
                          {module.icon} {module.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  
                  <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                    ✓ {Object.values(planConfigs[planId] || {}).filter(Boolean).length} modules activés
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="mt-6 flex gap-3">
              <Button 
                onClick={async () => {
                  await savePlanConfigs();
                  await savePlanPrices();
                }}
                className="bg-orange-600"
              >
                💾 Enregistrer les modifications
              </Button>
              <Button 
                onClick={() => {
                  setPlanConfigs(PLAN_PRESETS);
                  setPlanPrices(PLAN_PRICES);
                }}
                className="bg-slate-500"
              >
                ↺ Réinitialiser
              </Button>
            </div>
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
                      <span className="inline-block px-3 py-1 rounded text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
                        💵 {PLAN_PRICES[tenant.plan] || 0} NIO/mes
                      </span>
                      {tenant.is_paid ? (
                        <span className="inline-block px-3 py-1 rounded text-sm font-semibold bg-green-100 text-green-700">
                          ✅ Payé
                        </span>
                      ) : tenant.trial_ends_at ? (
                        <span className="inline-block px-3 py-1 rounded text-sm font-semibold bg-yellow-100 text-yellow-700">
                          ⏳ Essai (Expire: {new Date(tenant.trial_ends_at).toLocaleDateString()})
                        </span>
                      ) : null}
                      <div className="flex gap-2">
                        <button
                          onClick={() => enterTenant(tenant)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                          Accéder
                        </button>
                        {!tenant.is_paid && (
                          <button
                            onClick={() => markAsPaid(tenant)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            ✅ Payer
                          </button>
                        )}
                        <button
                          onClick={() => openPaymentModal(tenant)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          💳 Historique paiement
                        </button>
                      </div>
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
                          if (planConfigs[plan]) setSelectedModules(planConfigs[plan]);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm mb-3"
                        >
                          {Object.entries(PLAN_LABELS).map(([planId, planInfo]) => (
                            <option key={planId} value={planId}>
                              {planInfo.label} — {getPlanDescription(planId)}
                            </option>
                          ))}
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
                                  const preset = planConfigs[editingPlan];
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
                  ) : deletingTenantId === tenant.id ? (
                    <div className="bg-red-50 border border-red-300 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm font-bold text-red-900 mb-3">
                          ⚠️ Attention: Cela supprimera le tenant "{tenant.name}" et TOUTES ses données (employés, transactions, configurations, etc.).
                        </p>
                        <p className="text-xs text-red-700 mb-3">
                          Tapez le nom du tenant pour confirmer:
                        </p>
                        <input
                          type="text"
                          placeholder={tenant.name}
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          className="w-full px-3 py-2 border border-red-300 rounded-lg bg-white text-red-900 mb-3 font-mono text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDeleteTenant(tenant)}
                          disabled={deleteConfirmation !== tenant.name}
                          className="bg-red-600 disabled:opacity-50"
                        >
                          🗑️ Supprimer Définitivement
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            setDeletingTenantId(null);
                            setDeleteConfirmation("");
                          }}
                          className="bg-slate-400"
                        >
                          ❌ Annuler
                        </Button>
                      </div>
                    </div>
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
                      <div className="flex gap-2">
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
                        <Button
                          onClick={() => handleSyncTenant(tenant)}
                          className="bg-amber-600"
                        >
                          🔄 Synchroniser
                        </Button>
                        <Button
                          onClick={() => {
                            setDeletingTenantId(tenant.id);
                            setDeleteConfirmation("");
                          }}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          🗑️ Supprimer
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && paymentModalTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-white">
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-300 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-blue-900">💳 Gérer Paiements</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-3xl text-slate-500 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Tenant Info */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600"><strong>Client:</strong> {paymentModalTenant.name}</p>
                <p className="text-sm text-slate-600"><strong>Plan:</strong> {PLAN_LABELS[paymentModalTenant.plan]?.label}</p>
                <p className="text-sm text-slate-600"><strong>Statut:</strong> {paymentModalTenant.is_paid ? "✅ Payé" : "⏳ Essai"}</p>
                {((paymentModalTenant as any).paid_until) && (
                  <p className="text-sm text-slate-600">
                    <strong>Payé jusqu'au:</strong> {new Date((paymentModalTenant as any).paid_until).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>

              {/* Payment Form */}
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">📝 Enregistrer un paiement</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Montant (NIO/mois)</label>
                    <input
                      type="number"
                      value={paymentFormData.amount}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg text-slate-900 bg-white"
                      placeholder="Montant"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Payé jusqu'au</label>
                    <input
                      type="date"
                      value={paymentFormData.paid_until}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paid_until: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Méthode de paiement</label>
                    <input
                      type="text"
                      value={paymentFormData.payment_method}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg text-slate-900 bg-white"
                      placeholder="ex: Virement, PayPal, Carte..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Notes</label>
                    <textarea
                      value={paymentFormData.notes}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg text-slate-900 bg-white h-20"
                      placeholder="Notes optionnelles..."
                    />
                  </div>

                  <Button
                    onClick={handleRecordPayment}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    💾 Enregistrer le paiement
                  </Button>
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">📊 Historique des paiements</h3>
                {loadingPaymentHistory ? (
                  <p className="text-slate-600">Chargement...</p>
                ) : paymentHistory.length === 0 ? (
                  <p className="text-slate-600">Aucun paiement enregistré</p>
                ) : (
                  <div className="space-y-3">
                    {paymentHistory.map((payment: any) => (
                      <div key={payment.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-slate-900">
                              💰 {payment.amount} NIO - {payment.plan}
                            </p>
                            <p className="text-xs text-slate-600">
                              Enregistré le: {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                            </p>
                            <p className="text-xs text-slate-600">
                              Payé jusqu'au: {new Date(payment.paid_until).toLocaleDateString('fr-FR')}
                            </p>
                            {payment.payment_method && (
                              <p className="text-xs text-slate-600">Méthode: {payment.payment_method}</p>
                            )}
                            {payment.notes && (
                              <p className="text-xs text-slate-600 italic">Note: {payment.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-slate-500 hover:bg-slate-600"
                >
                  ❌ Fermer
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
