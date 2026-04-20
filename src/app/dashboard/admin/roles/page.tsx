"use client";

import { useState } from "react";
import { Card, Button, Input } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { DEFAULT_ROLES, DEFAULT_PERMISSIONS, Role } from "@/lib/types/roles";
import { RoleService } from "@/features/roles/services";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>(
    DEFAULT_ROLES.map((r) => ({
      ...r,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );

  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const handleAddRole = () => {
    setEditingRole(null);
    setFormData({ name: "", description: "" });
    setSelectedPermissions([]);
    setShowForm(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description || "" });
    setSelectedPermissions(role.permissions);
    setShowForm(true);
  };

  const handleDeleteRole = (roleId: string) => {
    if (["admin", "manager", "cashier"].includes(roleId)) {
      alert("No se pueden eliminar roles del sistema");
      return;
    }
    setRoles(roles.filter((r) => r.id !== roleId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("El nombre del rol es requerido");
      return;
    }

    if (selectedPermissions.length === 0) {
      alert("Selecciona al menos un permiso");
      return;
    }

    if (editingRole) {
      // Update
      if (["admin", "manager", "cashier"].includes(editingRole.id)) {
        alert("No se pueden modificar roles del sistema");
        return;
      }
      setRoles(
        roles.map((r) =>
          r.id === editingRole.id
            ? {
                ...r,
                name: formData.name,
                description: formData.description,
                permissions: selectedPermissions,
                updatedAt: new Date(),
              }
            : r
        )
      );
    } else {
      // Create
      const newRole: Role = {
        id: RoleService.generateRoleId(),
        name: formData.name,
        description: formData.description,
        permissions: selectedPermissions,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSystem: false,
      };
      setRoles([...roles, newRole]);
    }

    setShowForm(false);
    setFormData({ name: "", description: "" });
    setSelectedPermissions([]);
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group permissions by category
  const categories = ["POS", "INVENTORY", "EMPLOYEES", "PAYROLL", "SCHEDULES", "SETTINGS"] as const;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Roles</h1>
          <p className="text-slate-600 text-sm mt-1">
            Define roles personalizados según las necesidades de tu empresa
          </p>
        </div>
        <Button onClick={handleAddRole}>+ Nuevo Rol</Button>
      </div>

      {showForm && (
        <Card className="mb-8 border-2 border-blue-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {editingRole ? "Editar Rol" : "Crear Nuevo Rol"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre del Rol"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Vendedor, Fabricante, Gerente, etc"
                disabled={editingRole?.isSystem}
              />
              <Input
                label="Descripción"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describa el rol"
                disabled={editingRole?.isSystem}
              />
            </div>

            {/* Permissions by Category */}
            <div>
              <h3 className="font-bold text-slate-900 mb-4">Permisos</h3>
              <div className="space-y-6">
                {categories.map((category) => {
                  const categoryPerms = DEFAULT_PERMISSIONS.filter((p) => p.category === category);
                  return (
                    <div key={category} className="border border-slate-200 rounded p-4">
                      <h4 className="font-semibold text-slate-800 mb-3">📂 {category}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryPerms.map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(perm.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPermissions([...selectedPermissions, perm.id]);
                                } else {
                                  setSelectedPermissions(
                                    selectedPermissions.filter((p) => p !== perm.id)
                                  );
                                }
                              }}
                              className="w-4 h-4 cursor-pointer"
                              disabled={editingRole?.isSystem}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">{perm.name}</p>
                              <p className="text-xs text-gray-700">{perm.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={editingRole?.isSystem}>
                {editingRole ? "Actualizar Rol" : "Crear Rol"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Roles List */}
      <Card>
        <div className="mb-6">
          <Input
            placeholder="Buscar roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {filteredRoles.length === 0 ? (
            <p className="text-gray-800 text-center py-8">No hay roles disponibles</p>
          ) : (
            filteredRoles.map((role) => (
              <div
                key={role.id}
                className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{role.name}</h3>
                      {role.isSystem && (
                        <span className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded font-medium">
                          Sistema
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{role.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleEditRole(role)}
                      disabled={role.isSystem}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteRole(role.id)}
                      disabled={role.isSystem}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>

                {/* Permissions Display */}
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-600 mb-2">
                    {role.permissions.length} permisos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.slice(0, 5).map((perm) => {
                      const permission = DEFAULT_PERMISSIONS.find((p) => p.id === perm);
                      return (
                        <span
                          key={perm}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {permission?.name}
                        </span>
                      );
                    })}
                    {role.permissions.length > 5 && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs rounded">
                        +{role.permissions.length - 5} más
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
