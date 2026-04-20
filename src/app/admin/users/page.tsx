"use client";

import React, { useState, useEffect } from "react";
import { Button, Input, Card } from "@/components/ui";

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface Role {
  id: string;
  name: string;
  tenant_id: string;
}

export default function AdminUsersPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    roleId: "",
  });

  // Charger les tenants au démarrage
  useEffect(() => {
    fetchTenants();
  }, []);

  // Charger les rôles quand un tenant est sélectionné
  useEffect(() => {
    if (selectedTenant) {
      fetchRoles(selectedTenant);
    }
  }, [selectedTenant]);

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/admin/tenants");
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
        if (data.length > 0) {
          setSelectedTenant(data[0].id);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des tenants:", error);
      setMessage("❌ Erreur lors du chargement des tenants");
    }
  };

  const fetchRoles = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/roles`);
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, roleId: data[0].id }));
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des rôles:", error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTenant) {
      setMessage("❌ Sélectionne un tenant");
      return;
    }

    if (!formData.email || !formData.password) {
      setMessage("❌ Email et mot de passe requis");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedTenant,
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName || "User",
          lastName: formData.lastName || "User",
          roleId: formData.roleId || null,
        }),
      });

      if (response.ok) {
        const { user } = await response.json();
        setMessage(`✅ Utilisateur créé avec succès! ID: ${user.id}`);
        setFormData({
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          roleId: roles[0]?.id || "",
        });
      } else {
        const error = await response.json();
        setMessage(`❌ Erreur: ${error.message || error.error}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur réseau: ${error instanceof Error ? error.message : "Erreur"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">🔐 Gestion des Utilisateurs</h1>

      <Card className="p-6 space-y-6">
        {/* Sélection du Tenant */}
        <div>
          <label className="block text-sm font-semibold mb-2">Sélectionner le Tenant</label>
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="">-- Choisir un tenant --</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name} ({tenant.slug})
              </option>
            ))}
          </select>
        </div>

        {selectedTenant && (
          <form onSubmit={handleCreateUser} className="space-y-4">
            <h2 className="text-lg font-semibold mt-6 mb-4">📝 Ajouter un Utilisateur</h2>

            {/* Email */}
            <Input
              label="Email *"
              type="email"
              placeholder="utilisateur@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            {/* Mot de passe */}
            <Input
              label="Mot de passe *"
              type="password"
              placeholder="Au moins 8 caractères"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />

            {/* Prénom et Nom */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prénom"
                placeholder="Jean"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
              <Input
                label="Nom"
                placeholder="Dupont"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>

            {/* Rôle */}
            <div>
              <label className="block text-sm font-semibold mb-2">Rôle</label>
              <select
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">-- Aucun rôle --</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Message */}
            {message && (
              <div
                className={`p-3 rounded text-sm ${
                  message.includes("✅")
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {message}
              </div>
            )}

            {/* Bouton */}
            <Button type="submit" disabled={loading} className="w-full bg-blue-600">
              {loading ? "Création en cours..." : "➕ Créer l'Utilisateur"}
            </Button>
          </form>
        )}
      </Card>

      {/* Infos */}
      <Card className="p-4 mt-6 bg-blue-50">
        <h3 className="font-semibold mb-2">ℹ️ Instructions</h3>
        <ul className="text-sm space-y-1">
          <li>✅ Sélectionne un tenant</li>
          <li>✅ Remplis les informations de l'utilisateur</li>
          <li>✅ Le mot de passe doit faire au moins 8 caractères</li>
          <li>✅ L'utilisateur peut se connecter immédiatement</li>
          <li>✅ Les données sont isolées par tenant</li>
        </ul>
      </Card>

      {/* Debug Info */}
      {selectedTenant && (
        <Card className="p-4 mt-6 bg-gray-50">
          <h3 className="font-semibold text-sm mb-2">🔍 Info Tenant Sélectionné</h3>
          <p className="text-xs text-gray-600">
            ID: {selectedTenant}
            <br />
            Rôles disponibles: {roles.length}
          </p>
        </Card>
      )}
    </div>
  );
}
