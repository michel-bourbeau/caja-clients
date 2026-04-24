"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSuperAdmin } from "@/context/SuperAdminContext";
import { DEFAULT_ROLES } from "@/lib/types/roles";

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role_id: string;
  status: "ACTIVE" | "INACTIVE";
  hire_date: string | null;
}

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  roleId: "cashier",
  salary: "",
  password: "",
};

export default function SuperAdminUsersPage() {
  const { isSuperAdmin } = useSuperAdmin();
  const router = useRouter();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPassword, setShowPassword] = useState(false);

  const [flash, setFlash] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [search, setSearch] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) router.push("/superadmin/login");
  }, [isSuperAdmin, router]);

  // Load tenants
  useEffect(() => {
    fetch("/api/admin/tenants")
      .then((r) => r.json())
      .then((data) => {
        setTenants(Array.isArray(data) ? data : []);
        if (data.length > 0) setSelectedTenantId(data[0].id);
      })
      .finally(() => setLoadingTenants(false));
  }, []);

  // Load employees when tenant changes
  const loadEmployees = useCallback(async (tenantId: string) => {
    if (!tenantId) return;
    setLoadingEmployees(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/employees`);
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTenantId) loadEmployees(selectedTenantId);
  }, [selectedTenantId, loadEmployees]);

  const showFlash = (type: "success" | "error", msg: string) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 4000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) return;
    
    // Validation du mot de passe
    if (!form.password || form.password.trim().length === 0) {
      showFlash("error", "❌ Le mot de passe est obligatoire");
      return;
    }
    
    if (form.password.length < 8) {
      showFlash("error", `❌ Le mot de passe doit contenir au moins 8 caractères (actuellement: ${form.password.length})`);
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${selectedTenantId}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          roleId: form.roleId,
          salary: parseFloat(form.salary) || 0,
          password: form.password,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Erreur création");
      }
      showFlash("success", `Utilisateur ${form.firstName} ${form.lastName} créé avec succès`);
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      loadEmployees(selectedTenantId);
    } catch (err) {
      showFlash("error", err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedTenantId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${selectedTenantId}/employees/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur suppression");
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      showFlash("success", "Utilisateur supprimé");
    } catch (err) {
      showFlash("error", err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
      setDeleteConfirmId(null);
    }
  };

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      !q ||
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    );
  });

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/superadmin/dashboard")}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Console
            </button>
            <span className="text-slate-300">/</span>
            <h1 className="text-lg font-semibold text-slate-800">Gestion des Utilisateurs</h1>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full">
            SuperAdmin
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Flash */}
        {flash && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-sm ${
            flash.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {flash.type === "success" ? "✅" : "❌"} {flash.msg}
          </div>
        )}

        {/* Tenant selector */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Tenant
          </label>
          {loadingTenants ? (
            <div className="h-10 bg-slate-100 animate-pulse rounded-lg" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {tenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTenantId(t.id); setSearch(""); setShowForm(false); }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedTenantId === t.id
                      ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedTenant && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedTenant.name}</h2>
                <p className="text-sm text-slate-400">{filtered.length} utilisateur{filtered.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <button
                  onClick={() => { setShowForm(true); setForm({ ...EMPTY_FORM }); }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter
                </button>
              </div>
            </div>

            {/* Create form */}
            {showForm && (
              <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-slate-800">Nouvel utilisateur</h3>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Info box */}
                <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <strong>ℹ️ Mot de passe:</strong> Un compte de connexion sera créé automatiquement avec le mot de passe fourni. L'utilisateur pourra se connecter immédiatement après la création.
                  </p>
                </div>
                
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Prénom *</label>
                      <input
                        required
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder="Jean"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Nom *</label>
                      <input
                        required
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder="Dupont"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Email *</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder="jean@exemple.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Téléphone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder="+1 514 000 0000"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Rôle *</label>
                      <select
                        value={form.roleId}
                        onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                      >
                        {DEFAULT_ROLES.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Salaire</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.salary}
                        onChange={(e) => setForm({ ...form, salary: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      🔐 Mot de passe * <span className="text-slate-400">(min. 8 caractères)</span>
                    </label>
                    <div className="relative">
                      <input
                        required
                        minLength={8}
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full px-3 py-2 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Entrer un mot de passe sécurisé"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      {saving ? "Création..." : "Créer l'utilisateur"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Employees list */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {loadingEmployees ? (
                <div className="p-8 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm font-medium">
                    {search ? "Aucun résultat pour cette recherche" : "Aucun utilisateur pour ce tenant"}
                  </p>
                  {!search && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="mt-3 text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      + Ajouter le premier utilisateur
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Utilisateur</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Email</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Rôle</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Statut</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map((emp) => {
                      const role = DEFAULT_ROLES.find((r) => r.id === emp.role_id);
                      const initials = `${emp.first_name[0] ?? ""}${emp.last_name[0] ?? ""}`.toUpperCase();
                      const isSuperUser = emp.is_system_user && emp.role_id === "admin";
                      return (
                        <tr 
                          key={emp.id} 
                          className={`transition-colors ${
                            isSuperUser 
                              ? "bg-amber-50 hover:bg-amber-100 border-l-4 border-amber-400" 
                              : "hover:bg-slate-50 border-l-4 border-transparent"
                          }`}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                                isSuperUser
                                  ? "bg-gradient-to-br from-amber-400 to-orange-500"
                                  : "bg-gradient-to-br from-purple-400 to-indigo-500"
                              }`}>
                                {isSuperUser ? "👑" : initials}
                              </div>
                              <div>
                                <p className={`font-medium ${isSuperUser ? "text-amber-900" : "text-slate-800"}`}>
                                  {emp.first_name} {emp.last_name}
                                  {isSuperUser && <span className="ml-1.5 text-amber-600 text-xs">⭐</span>}
                                </p>
                                <p className="text-xs text-slate-400 sm:hidden">{emp.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">{emp.email}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isSuperUser ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                                  👑 Admin Principal
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                  {role?.name ?? emp.role_id}
                                </span>
                              )}
                              {emp.is_system_user && !isSuperUser && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  🔐 Créé avec Tenant
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                              emp.status === "ACTIVE" ? "text-emerald-600" : "text-slate-400"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${emp.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-300"}`} />
                              {emp.status === "ACTIVE" ? "Actif" : "Inactif"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {deleteConfirmId === emp.id ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-xs text-slate-500">Confirmer ?</span>
                                <button
                                  onClick={() => handleDelete(emp.id)}
                                  disabled={saving}
                                  className="px-3 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                >
                                  Supprimer
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-3 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(emp.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
