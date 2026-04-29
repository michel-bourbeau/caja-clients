"use client";

import React, { useState, useEffect } from "react";
import { useSuperAdmin } from "@/context/SuperAdminContext";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Badge,
  Alert,
  Container,
} from "@/components/StripeUIComponents";
import { useRouter } from "next/navigation";
import { SUPERADMIN_IMPERSONATION_KEY } from "@/context/AuthContext";
import {
  Shield,
  Plus,
  Settings,
  Users,
  LogOut,
  RefreshCw,
  Edit2,
  Trash2,
  CreditCard,
  ChevronDown,
  X,
  Check,
  Building2,
} from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  features: Record<string, boolean>;
  created_at: string;
  is_paid?: boolean;
  trial_ends_at?: string | null;
  paid_until?: string | Date | null;
}

const AVAILABLE_MODULES = [
  { id: "pos", label: "Point of Sale (Cajas)", icon: "🛒", description: "Caja, Transacciones, Cierre de Caja" },
  { id: "inventory", label: "Gestión de Inventario", icon: "📦", description: "Gestion de productos y stock" },
  { id: "employees", label: "Gestión de Empleados", icon: "👥", description: "Empleados, Gestionar de Roles" },
  { id: "schedules", label: "Horarios y Turnos", icon: "📅", description: "Asistencia y horarios" },
  { id: "payroll", label: "Nómina", icon: "💰", description: "Recibos, Períodos de Pago" },
  { id: "reports", label: "Reportes de Ventas", icon: "📊", description: "Análisis y reportes" },
  { id: "expenses", label: "Gastos y Proveedores", icon: "💸", description: "Registro de gastos" },
  { id: "taxes", label: "Impuestos", icon: "📋", description: "Gestión de impuestos" },
  { id: "loyalty", label: "Clientes Fieles", icon: "💳", description: "Programa de fidelización" },
  { id: "contacts", label: "Contactos", icon: "📇", description: "Gestión de contactos importantes" },
];

const MODULE_GROUPS = [
  { id: "ventes", label: "🛒 Ventes (Core)", modules: ["pos", "inventory"] },
  { id: "personnel", label: "👥 Personnel", modules: ["employees", "schedules", "payroll"] },
  { id: "finances", label: "📊 Finances", modules: ["reports", "expenses", "taxes"] },
  { id: "clients", label: "🤝 Clients", modules: ["loyalty", "contacts"] },
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
    payroll: true,
    reports: true,
    loyalty: false,
    expenses: false,
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

  // Check if a tenant account is suspended
  const isSuspended = (tenant: Tenant): boolean => {
    if (!tenant.paid_until) {
      return true; // Explicitly cancelled payment
    }
    const paidUntil = new Date(tenant.paid_until);
    const now = new Date();
    const diffTime = paidUntil.getTime() - now.getTime();
    const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return daysUntilExpiration < -3; // Expired more than 3 days ago
  };

  // Check if payment is currently active (paid_until is in the future)
  const isPaymentActive = (tenant: Tenant): boolean => {
    if (!tenant.paid_until) return false;
    return new Date(tenant.paid_until) > new Date();
  };

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

  const openPaymentModal = async (tenant: Tenant) => {
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


  const handleCancelPayment = async (tenant: Tenant) => {
    if (!confirm(`Êtes-vous sûr de vouloir annuler le paiement de ${tenant.name}? Le tenant et tous ses utilisateurs seront suspendus.`)) {
      return;
    }

    try {
      // Call the dedicated payment cancellation endpoint
      const response = await fetch(`/api/superadmin/tenants/${tenant.id}/payment/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ ${result.message} - Accès suspendu!`);
        
        // Close the payment modal if open
        if (paymentModalTenant?.id === tenant.id) {
          setPaymentModalTenant(null);
        }
        
        // Refresh tenants list to get updated paid_until status
        // Add small delay to ensure DB is updated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          const tenantsResponse = await fetch("/api/superadmin/tenants");
          if (tenantsResponse.ok) {
            const updatedTenants = await tenantsResponse.json();
            console.log("Tenants refreshed after payment cancel:", updatedTenants);
            setTenants(updatedTenants);
          }
        } catch (refreshError) {
          console.error("Failed to refresh tenants:", refreshError);
        }
        
        setTimeout(() => setMessage(""), 4000);
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.error || error.message || "Erreur lors de l'annulation"}`);
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
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100">
                <Shield className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">SuperAdmin Console</h1>
                <p className="text-xs text-slate-500">Gestion des Tenants et Modules</p>
              </div>
            </div>
            <Button variant="danger" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Message */}
        {message && (
          <Alert variant={message.includes("✅") ? "success" : "error"}>
            {message}
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setShowCreateForm(!showCreateForm)} variant={showCreateForm ? "secondary" : "primary"}>
            {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showCreateForm ? "Annuler" : "Créer un Tenant"}
          </Button>
          <Button onClick={() => setShowManagePlans(!showManagePlans)} variant={showManagePlans ? "secondary" : "secondary"}>
            <Settings className="w-4 h-4" />
            {showManagePlans ? "Fermer les Plans" : "Gérer les Plans"}
          </Button>
          <Button onClick={() => router.push("/superadmin/users")} variant="secondary">
            <Users className="w-4 h-4" />
            Gestion des Utilisateurs
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Créer un Nouveau Tenant</CardTitle>
            </CardHeader>
            <CardContent>
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
                <div className="space-y-4">
                  {MODULE_GROUPS.map((group) => (
                    <div key={group.id}>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">{group.label}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-2">
                        {group.modules.map((moduleId) => {
                          const module = AVAILABLE_MODULES.find((m) => m.id === moduleId);
                          if (!module) return null;
                          return (
                            <label key={module.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedModules[module.id]}
                                onChange={(e) =>
                                  setSelectedModules((prev) => {
                                    const updated = { ...prev, [module.id]: e.target.checked };
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
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Account */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2"><Users className="w-4 h-4 text-slate-500" /> Compte Admin du Tenant</h3>
                <p className="text-xs text-slate-500 mb-4">
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

              <Button type="submit" className="w-full">
                <Plus className="w-4 h-4" />
                Créer le Tenant
              </Button>
            </form>
            </CardContent>
          </Card>
        )}

        {/* Manage Plans Form */}
        {showManagePlans && (
          <Card>
            <CardHeader>
              <CardTitle>Gérer les Types de Forfaits</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Activez ou désactivez les modules pour chaque type de forfait.
              </p>
            </CardHeader>
            <CardContent>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(PLAN_LABELS).map(([planId, planInfo]) => (
                <div key={planId} className="border border-slate-200 rounded-lg p-4 bg-white">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">{planInfo.label}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${planInfo.color}`}>{planId}</span>
                  </div>

                  {/* Pricing Section */}
                  {planId !== "custom" && (
                    <div className="mb-4 pb-4 border-b border-slate-100">
                      <label className="block text-xs font-semibold text-slate-600 mb-2">Prix (NIO/mois)</label>
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
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {planPrices[planId] ?? 0} NIO/mes
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-3 mb-4 border-t border-slate-100 pt-3">
                    {MODULE_GROUPS.map((group) => (
                      <div key={group.id}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{group.label}</p>
                        <div className="space-y-1 pl-1">
                          {group.modules.map((moduleId) => {
                            const module = AVAILABLE_MODULES.find((m) => m.id === moduleId);
                            if (!module) return null;
                            return (
                              <label key={module.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-1 py-0.5 rounded">
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
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 p-2 rounded">
                    {Object.values(planConfigs[planId] || {}).filter(Boolean).length} modules activés
                  </p>
                </div>
              ))}
            </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={async () => {
                  await savePlanConfigs();
                  await savePlanPrices();
                }}
              >
                <Check className="w-4 h-4" />
                Enregistrer les modifications
              </Button>
              <Button 
                variant="secondary"
                onClick={() => {
                  setPlanConfigs(PLAN_PRESETS);
                  setPlanPrices(PLAN_PRICES);
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Réinitialiser
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Tenants List */}
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            Tenants Actifs ({tenants.length})
          </h2>
          {loading ? (
            <Card>
              <CardContent>
                <p className="text-slate-500 text-center py-4">Chargement...</p>
              </CardContent>
            </Card>
          ) : tenants.length === 0 ? (
            <Card>
              <CardContent>
                <p className="text-slate-500 text-center py-8">Aucun tenant créé. Cliquez sur "Créer un Tenant" pour commencer.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {tenants.map((tenant) => (
                <Card key={tenant.id}>
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-slate-900 truncate">{tenant.name}</h3>
                        {isSuspended(tenant) ? (
                          <Badge variant="error">Suspendu</Badge>
                        ) : isPaymentActive(tenant) ? (
                          <Badge variant="success">Payé</Badge>
                        ) : tenant.paid_until && new Date(tenant.paid_until) <= new Date() ? (
                          <Badge variant="warning">Expiré</Badge>
                        ) : tenant.trial_ends_at ? (
                          <Badge variant="default">Essai</Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                        <span>Slug: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">{tenant.slug}</code></span>
                        <span className={`font-medium ${PLAN_LABELS[tenant.plan]?.color || ""} px-2 py-0.5 rounded`}>{PLAN_LABELS[tenant.plan]?.label || tenant.plan}</span>
                        <span>{PLAN_PRICES[tenant.plan] || 0} NIO/mes</span>
                        {tenant.paid_until && <span>Vence: {new Date(tenant.paid_until).toLocaleDateString('fr-FR')}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      <button
                        onClick={() => enterTenant(tenant)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Accéder
                      </button>
                      <button
                        onClick={() => openPaymentModal(tenant)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Abonnement
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
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
                        <div className="space-y-4">
                          {MODULE_GROUPS.map((group) => (
                            <div key={group.id}>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{group.label}</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-2">
                                {group.modules.map((moduleId) => {
                                  const module = AVAILABLE_MODULES.find((m) => m.id === moduleId);
                                  if (!module) return null;
                                  return (
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
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit">
                          <Check className="w-4 h-4" /> Sauvegarder
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setEditingTenant(null)}
                        >
                          <X className="w-4 h-4" /> Annuler
                        </Button>
                      </div>
                    </form>
                  ) : deletingTenantId === tenant.id ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-semibold text-red-900">
                        Cela supprimera le tenant "{tenant.name}" et TOUTES ses données définitivement.
                      </p>
                      <p className="text-xs text-red-600">Tapez le nom du tenant pour confirmer:</p>
                      <input
                        type="text"
                        placeholder={tenant.name}
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        className="w-full px-3 py-2 border border-red-300 rounded-lg bg-white text-red-900 font-mono text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          onClick={() => handleDeleteTenant(tenant)}
                          disabled={deleteConfirmation !== tenant.name}
                        >
                          <Trash2 className="w-4 h-4" /> Supprimer Définitivement
                        </Button>
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => {
                            setDeletingTenantId(null);
                            setDeleteConfirmation("");
                          }}
                        >
                          <X className="w-4 h-4" /> Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Modules</p>
                        <div className="space-y-1.5">
                          {MODULE_GROUPS.map((group) => (
                            <div key={group.id}>
                              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{group.label}</p>
                              <div className="flex flex-wrap gap-1 pl-2">
                                {group.modules.map((moduleId) => {
                                  const module = AVAILABLE_MODULES.find((m) => m.id === moduleId);
                                  if (!module) return null;
                                  return tenant.features?.[module.id] ? (
                                    <span key={module.id} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                      {module.icon} {module.label}
                                    </span>
                                  ) : (
                                    <span key={module.id} className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-xs line-through">
                                      {module.icon} {module.label}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingTenant(tenant);
                            setSelectedModules(tenant.features || {});
                            setEditingPlan(tenant.plan || "basic");
                          }}
                        >
                          <Edit2 className="w-4 h-4" /> Modifier Plan
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSyncTenant(tenant)}
                        >
                          <RefreshCw className="w-4 h-4" /> Synchroniser
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setDeletingTenantId(tenant.id);
                            setDeleteConfirmation("");
                          }}
                        >
                          <Trash2 className="w-4 h-4" /> Supprimer
                        </Button>
                      </div>
                    </div>
                  )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && paymentModalTenant && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100">
                  <CreditCard className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Gérer l'abonnement</h2>
                  <p className="text-xs text-slate-500">{paymentModalTenant.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Tenant Info */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
                <p className="text-sm text-slate-700"><span className="font-semibold">Plan:</span> {PLAN_LABELS[paymentModalTenant.plan]?.label}</p>
                <p className="text-sm text-slate-700"><span className="font-semibold">Statut:</span> {isPaymentActive(paymentModalTenant) ? "Payé" : "Essai"}</p>
                {((paymentModalTenant as any).paid_until) && (
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">Payé jusqu'au:</span> {new Date((paymentModalTenant as any).paid_until).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>

              {/* Payment Form */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Enregistrer un paiement</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Montant (NIO/mois)</label>
                    <input
                      type="number"
                      value={paymentFormData.amount}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white text-sm"
                      placeholder="Montant"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payé jusqu'au</label>
                    <input
                      type="date"
                      value={paymentFormData.paid_until}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paid_until: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Méthode de paiement</label>
                    <select
                      value={paymentFormData.payment_method}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white text-sm"
                    >
                      <option value="">— Sélectionner —</option>
                      <option value="CASH">Espèces</option>
                      <option value="CARD">Carte de crédit</option>
                      <option value="TRANSFER">Virement bancaire</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes</label>
                    <textarea
                      value={paymentFormData.notes}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white text-sm h-20"
                      placeholder="Notes optionnelles..."
                    />
                  </div>

                  <Button onClick={handleRecordPayment} className="w-full">
                    <Check className="w-4 h-4" />
                    Enregistrer le paiement
                  </Button>
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Historique des paiements</h3>
                {loadingPaymentHistory ? (
                  <p className="text-sm text-slate-500">Chargement...</p>
                ) : paymentHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucun paiement enregistré</p>
                ) : (
                  <div className="space-y-2">
                    {paymentHistory.map((payment: any) => (
                      <div key={payment.id} className="bg-slate-50 px-4 py-3 rounded-lg border border-slate-200">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-slate-900">
                            {payment.amount} NIO — {payment.plan}
                          </p>
                          <p className="text-xs text-slate-500">
                            Enregistré le: {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-xs text-slate-500">
                            Payé jusqu'au: {new Date(payment.paid_until).toLocaleDateString('fr-FR')}
                          </p>
                          {payment.payment_method && (
                            <p className="text-xs text-slate-500">Méthode: {payment.payment_method}</p>
                          )}
                          {payment.notes && (
                            <p className="text-xs text-slate-400 italic">{payment.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setShowPaymentModal(false)} className="flex-1">
                  Fermer
                </Button>
                {isPaymentActive(paymentModalTenant!) && (
                  <Button variant="danger" onClick={() => handleCancelPayment(paymentModalTenant!)} className="flex-1">
                    <X className="w-4 h-4" />
                    Annuler paiement
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
