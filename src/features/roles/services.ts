// Role Management Service

import { Role, RoleWithCount, DEFAULT_PERMISSIONS } from "@/lib/types/roles";

export class RoleService {
  /**
   * Create a new role
   */
  static async createRole(
    name: string,
    description: string,
    permissions: string[]
  ): Promise<Role> {
    // Validate
    if (!name || name.trim().length === 0) {
      throw new Error("El nombre del rol es requerido");
    }

    if (permissions.length === 0) {
      throw new Error("El rol debe tener al menos un permiso");
    }

    const role: Role = {
      id: this.generateRoleId(),
      name,
      description,
      permissions,
      createdAt: new Date(),
      updatedAt: new Date(),
      isSystem: false,
    };

    // TODO: Send to API
    return role;
  }

  /**
   * Update existing role
   */
  static async updateRole(
    roleId: string,
    name?: string,
    description?: string,
    permissions?: string[]
  ): Promise<Role> {
    // Prevent modifying system roles
    if (["admin", "manager", "cashier"].includes(roleId)) {
      throw new Error("No se pueden modificar roles del sistema");
    }

    const updatedRole: Partial<Role> = {
      updatedAt: new Date(),
    };

    if (name) updatedRole.name = name;
    if (description) updatedRole.description = description;
    if (permissions) updatedRole.permissions = permissions;

    // TODO: Send to API
    return {
      id: roleId,
      name: name || "",
      permissions: permissions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...updatedRole,
    } as Role;
  }

  /**
   * Delete a role
   */
  static async deleteRole(roleId: string): Promise<void> {
    // Prevent deleting system roles
    if (["admin", "manager", "cashier"].includes(roleId)) {
      throw new Error("No se pueden eliminar roles del sistema");
    }

    // TODO: Send to API
  }

  /**
   * Get all roles
   */
  static async getAllRoles(): Promise<Role[]> {
    // TODO: Fetch from API
    return [];
  }

  /**
   * Get role by ID
   */
  static async getRoleById(roleId: string): Promise<Role | null> {
    // TODO: Fetch from API
    return null;
  }

  /**
   * Check if user has permission
   */
  static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission);
  }

  /**
   * Check if user has any of multiple permissions
   */
  static hasAnyPermission(userPermissions: string[], permissions: string[]): boolean {
    return permissions.some((perm) => userPermissions.includes(perm));
  }

  /**
   * Check if user has all permissions
   */
  static hasAllPermissions(userPermissions: string[], permissions: string[]): boolean {
    return permissions.every((perm) => userPermissions.includes(perm));
  }

  /**
   * Get permissions by category
   */
  static getPermissionsByCategory(
    category: "POS" | "INVENTORY" | "EMPLOYEES" | "PAYROLL" | "SCHEDULES" | "SETTINGS" | "REPORTS"
  ) {
    return DEFAULT_PERMISSIONS.filter((p) => p.category === category);
  }

  /**
   * Generate unique role ID
   */
  static generateRoleId(): string {
    return `role-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`.toLowerCase();
  }

  /**
   * Validate role permissions
   */
  static validatePermissions(permissions: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validPermissions = DEFAULT_PERMISSIONS.map((p) => p.id);

    permissions.forEach((perm) => {
      if (!validPermissions.includes(perm)) {
        errors.push(`Permiso inválido: ${perm}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
