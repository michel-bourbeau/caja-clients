"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { DEFAULT_PERMISSIONS, ADMIN_ONLY_PERMISSIONS, Permission } from "@/lib/types/roles";
import { useTenantId } from "@/lib/utils/tenant";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Button, Container, Section, Alert } from "@/components/StripeUIComponents";
import { IconButton, Dialog, LoadingSpinner } from "@/components";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantRole {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  description: string | null;
  permissions: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  POS:        "bg-blue-100 text-blue-700 border-blue-200",
  INVENTORY:  "bg-green-100 text-green-700 border-green-200",
  EMPLOYEES:  "bg-purple-100 text-purple-700 border-purple-200",
  SCHEDULES:  "bg-orange-100 text-orange-700 border-orange-200",
  PAYROLL:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  REPORTS:    "bg-pink-100 text-pink-700 border-pink-200",
  EXPENSES:   "bg-red-100 text-red-700 border-red-200",
  SETTINGS:   "bg-slate-100 text-slate-700 border-slate-200",
  LOYALTY:    "bg-rose-100 text-rose-700 border-rose-200",
  CONTACTS:   "bg-indigo-100 text-indigo-700 border-indigo-200",
};

const CATEGORIES = ["POS", "INVENTORY", "EMPLOYEES", "SCHEDULES", "PAYROLL", "REPORTS", "EXPENSES", "SETTINGS", "LOYALTY", "CONTACTS"] as const;
type CategoryKey = typeof CATEGORIES[number];

const GROUPED_PERMISSIONS = CATEGORIES.reduce<Record<string, Permission[]>>((acc, cat) => {
  acc[cat] = DEFAULT_PERMISSIONS.filter((p) => p.category === cat && !ADMIN_ONLY_PERMISSIONS.includes(p.id));
  return acc;
}, {});

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: TenantRole }) {
  const { t } = useLanguage();
  const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium";
  if (role.is_system) return <span className={`${base} bg-slate-700 text-white`}>{t("admin.rolesPage.system")}</span>;
  return <span className={`${base} bg-indigo-100 text-indigo-700`}>{t("admin.rolesPage.custom")}</span>;
}

function PermissionCount({ permissions }: { permissions: string[] }) {
  const { t } = useLanguage();
  const visiblePermissionsCount = DEFAULT_PERMISSIONS.filter(
    (p) => !ADMIN_ONLY_PERMISSIONS.includes(p.id)
  ).length;
  const visiblePermissions = permissions.filter(
    (p) => !ADMIN_ONLY_PERMISSIONS.includes(p)
  ).length;
  return (
    <span className="text-xs text-slate-400">
      {visiblePermissions} / {visiblePermissionsCount} {t("admin.rolesPage.rights")}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const tenantId = useTenantId();
  const { refreshPermissions } = useAuth();
  const { t } = useLanguage();

  const [roles, setRoles] = useState<TenantRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // "Draft" permissions for the selected role — pending save
  const [draftPerms, setDraftPerms] = useState<string[]>([]);

  // Add-role modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", description: "" });
  const [addLoading, setAddLoading] = useState(false);

  // Delete confirm modal
  const [confirmDelete, setConfirmDelete] = useState<TenantRole | null>(null);

  // Edit/View modal
  const [showEditModal, setShowEditModal] = useState(false);

  // ── Fetch roles ──────────────────────────────────────────────────────────────

  const fetchRoles = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/roles`);
      if (!res.ok) throw new Error("Error al cargar");
      let data: TenantRole[] = await res.json();
      
      // Sync system roles with current permissions
      const visiblePermissions = DEFAULT_PERMISSIONS.filter(
        (p) => !ADMIN_ONLY_PERMISSIONS.includes(p.id)
      ).map(p => p.id);
      
      data = data.map((role) => {
        if (role.is_system && role.id === "admin") {
          // Admin role should have all visible permissions
          const allPermissions = DEFAULT_PERMISSIONS.map(p => p.id);
          if (role.permissions.length < allPermissions.length) {
            role.permissions = allPermissions;
          }
        }
        return role;
      });
      
      setRoles(data);
      if (data.length > 0) {
        setSelectedRoleId(data[0].id);
        setDraftPerms(data[0].permissions);
      }
    } catch {
      showFlash("error", t("admin.rolesPage.loadError"));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { 
    fetchRoles(); 
  }, [tenantId]); // Use tenantId instead of fetchRoles to avoid infinite loop

  // ── Manage scroll overflow ───────────────────────────────────────────────────

  useEffect(() => {
    const isModalOpen = showEditModal || showAddModal || !!confirmDelete;
    if (isModalOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [showEditModal, showAddModal, confirmDelete]);

  // ── Selected role ────────────────────────────────────────────────────────────

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );

  const isDirty = useMemo(() => {
    if (!selectedRole) return false;
    const a = [...selectedRole.permissions].sort().join(",");
    const b = [...draftPerms].sort().join(",");
    return a !== b;
  }, [selectedRole, draftPerms]);

  const handleSelectRole = (role: TenantRole) => {
    setSelectedRoleId(role.id);
    setDraftPerms(role.permissions);
    setShowEditModal(true);
  };

  // ── Permission toggle ────────────────────────────────────────────────────────

  const togglePerm = (permId: string) => {
    setDraftPerms((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const toggleCategory = (cat: string) => {
    const catPerms = GROUPED_PERMISSIONS[cat].map((p) => p.id);
    const allChecked = catPerms.every((p) => draftPerms.includes(p));
    if (allChecked) {
      setDraftPerms((prev) => prev.filter((p) => !catPerms.includes(p)));
    } else {
      setDraftPerms((prev) => [...new Set([...prev, ...catPerms])]);
    }
  };

  // ── Save permissions ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedRoleId || !tenantId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/roles/${selectedRoleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: draftPerms }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Error");
      }
      const updated: TenantRole = await res.json();
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      
      // Refresh user permissions if their role was updated
      await refreshPermissions();
      
      showFlash("success", t("admin.rolesPage.savedFlash"));
      setShowEditModal(false);
    } catch (e) {
      showFlash("error", e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  // ── Add role ─────────────────────────────────────────────────────────────────

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setAddLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addForm.name, description: addForm.description, permissions: [] }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Error");
      }
      const created: TenantRole = await res.json();
      setRoles((prev) => [...prev, created]);
      setShowAddModal(false);
      setAddForm({ name: "", description: "" });
      showFlash("success", t("admin.rolesPage.createdFlash", { name: created.name }));
    } catch (e) {
      showFlash("error", e instanceof Error ? e.message : t("admin.rolesPage.createError"));
    } finally {
      setAddLoading(false);
    }
  };

  // ── Delete role ──────────────────────────────────────────────────────────────

  const handleDeleteRole = async () => {
    if (!confirmDelete || !tenantId) return;
    try {
      const res = await fetch(`/api/tenants/${tenantId}/roles/${confirmDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Error");
      }
      const remaining = roles.filter((r) => r.id !== confirmDelete.id);
      setRoles(remaining);
      if (selectedRoleId === confirmDelete.id) {
        setSelectedRoleId(null);
        setShowEditModal(false);
      }
      setConfirmDelete(null);
      
      // Refresh user permissions in case their role was deleted
      await refreshPermissions();
      
      showFlash("success", t("admin.rolesPage.deletedFlash", { name: confirmDelete.name }));
    } catch (e) {
      showFlash("error", e instanceof Error ? e.message : t("admin.rolesPage.deleteError"));
      setConfirmDelete(null);
    }
  };

  // ── Flash ────────────────────────────────────────────────────────────────────

  const showFlash = (type: "success" | "error", msg: string) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 4000);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Container>
      <Section>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">{t("admin.rolesPage.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t("admin.rolesPage.subtitle")}
          </p>
        </div>

        {/* Flash */}
        {flash && (
          <Alert variant={flash.type === "success" ? "success" : "error"} className="mb-6">
            {flash.msg}
          </Alert>
        )}

        {/* Add Role Button */}
        <div className="mb-6">
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t("admin.rolesPage.newRole")}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <>
            {/* Desktop Grid View */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="text-left bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-4 group"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{role.name}</p>
                      {role.description && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{role.description}</p>
                      )}
                    </div>
                    <RoleBadge role={role} />
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-3">
                    <PermissionCount permissions={role.permissions} />
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleSelectRole(role)}
                      className="flex items-center gap-2 flex-1 text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                      title={t("admin.rolesPage.configureTitle")}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>{t("admin.rolesPage.configure")}</span>
                    </button>
                    {!role.is_system && (
                      <IconButton
                        icon="delete"
                        color="red"
                        size="sm"
                        onClick={() => setConfirmDelete(role)}
                        title={t("admin.rolesPage.deleteTitle")}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile List View */}
            <div className="md:hidden space-y-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="bg-white rounded-lg border border-slate-200 shadow-sm p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{role.name}</p>
                      {role.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>
                      )}
                    </div>
                    <RoleBadge role={role} />
                  </div>

                  <div className="mb-3">
                    <PermissionCount permissions={role.permissions} />
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleSelectRole(role)}
                      className="flex items-center gap-2 flex-1 text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>{t("admin.rolesPage.configure")}</span>
                    </button>
                    {!role.is_system && (
                      <IconButton
                        icon="delete"
                        color="red"
                        size="sm"
                        onClick={() => setConfirmDelete(role)}
                        title={t("admin.rolesPage.deleteTitle")}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Edit Role Modal ──────────────────────────────────────────────────────── */}
        <Dialog
          isOpen={showEditModal && !!selectedRole}
          title={selectedRole?.name || ""}
          onClose={() => {
            setShowEditModal(false);
            setDraftPerms(selectedRole?.permissions || []);
          }}
          footer={
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEditModal(false);
                  setDraftPerms(selectedRole?.permissions || []);
                }}
              >
                {t("admin.rolesPage.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!isDirty || saving}
              >
                {saving ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {saving ? t("admin.rolesPage.saving") : t("admin.rolesPage.save")}
              </Button>
            </div>
          }
        >
          {isDirty && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 mb-4">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
              </svg>
              {t("admin.rolesPage.unsaved")}
            </div>
          )}

          <div className="space-y-6">
            {CATEGORIES.map((cat) => {
              const catKey = cat as string;
              const perms = GROUPED_PERMISSIONS[catKey];
              if (!perms || perms.length === 0) return null;
              const checkedCount = perms.filter((p) => draftPerms.includes(p.id)).length;
              const allChecked = checkedCount === perms.length;
              const someChecked = checkedCount > 0 && !allChecked;

              return (
                <div key={catKey}>
                  <div className="flex items-center gap-3 mb-3">
                    <button onClick={() => toggleCategory(catKey)} className="flex items-center gap-2 group">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        allChecked
                          ? "bg-slate-900 border-slate-900"
                          : someChecked
                          ? "bg-slate-200 border-slate-400"
                          : "border-slate-300 group-hover:border-slate-500"
                      }`}>
                        {allChecked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {someChecked && <div className="w-2 h-0.5 bg-slate-600 rounded" />}
                      </div>
                    </button>
                    <span className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md border ${CATEGORY_COLORS[catKey] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {t(`admin.categories.${catKey}`) || catKey}
                    </span>
                    <span className="text-xs text-slate-400">{checkedCount}/{perms.length}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                    {perms.map((perm) => {
                      const checked = draftPerms.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            checked ? "bg-slate-50 border-slate-300" : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            <input type="checkbox" checked={checked} onChange={() => togglePerm(perm.id)} className="sr-only" />
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                              checked ? "bg-slate-900 border-slate-900" : "border-slate-300"
                            }`}>
                              {checked && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">{perm.name}</p>
                            {perm.description && (
                              <p className="text-xs text-slate-400 mt-0.5 leading-snug">{perm.description}</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Dialog>

        {/* ── Add Role Modal ──────────────────────────────────────────────────────── */}
        <Dialog
          isOpen={showAddModal}
          title={t("admin.rolesPage.newRole")}
          onClose={() => setShowAddModal(false)}
          footer={
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowAddModal(false)}
              >
                {t("admin.rolesPage.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={handleAddRole}
                disabled={addLoading}
              >
                {addLoading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {addLoading ? t("admin.rolesPage.creating") : t("admin.rolesPage.createRole")}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("admin.rolesPage.nameLabel")}</label>
              <input
                type="text"
                required
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("admin.rolesPage.namePlaceholder")}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("admin.rolesPage.descLabel")}</label>
              <input
                type="text"
                value={addForm.description}
                onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("admin.rolesPage.descPlaceholder")}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <p className="text-xs text-slate-400">
              {t("admin.rolesPage.afterCreate")}
            </p>
          </div>
        </Dialog>

        {/* ── Delete Confirm Modal ────────────────────────────────────────────────── */}
        <Dialog
          isOpen={!!confirmDelete}
          title={t("admin.rolesPage.confirmDeleteTitle")}
          onClose={() => setConfirmDelete(null)}
          footer={
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(null)}
              >
                {t("admin.rolesPage.cancel")}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteRole}
              >
                {t("admin.rolesPage.delete")}
              </Button>
            </div>
          }
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{t("admin.rolesPage.confirmDeleteMsg", { name: confirmDelete?.name ?? "" })}</p>
              <p className="text-sm text-slate-500 mt-1">
                {t("admin.rolesPage.confirmDeleteWarning")}
              </p>
            </div>
          </div>
        </Dialog>
      </Section>
    </Container>
  );
}
