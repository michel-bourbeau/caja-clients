// Helper component for permission-based rendering

import React from "react";
import { useAuth } from "@/context/AuthContext";

interface ProtectedComponentProps {
  permission: string | string[]; // Single permission or array
  requireAll?: boolean; // If true, needs all permissions; if false (default), needs any
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Component to conditionally render based on permissions
 *
 * @example
 * // Single permission
 * <ProtectedComponent permission="pos.create">
 *   <CreateSaleButton />
 * </ProtectedComponent>
 *
 * @example
 * // Multiple permissions (any)
 * <ProtectedComponent permission={["pos.create", "pos.view"]}>
 *   <PosModule />
 * </ProtectedComponent>
 *
 * @example
 * // Multiple permissions (all)
 * <ProtectedComponent permission={["inventory.view", "inventory.edit"]} requireAll>
 *   <EditInventoryButton />
 * </ProtectedComponent>
 */
export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  permission,
  requireAll = false,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  let hasAccess = false;

  if (typeof permission === "string") {
    // Single permission
    hasAccess = hasPermission(permission);
  } else if (Array.isArray(permission)) {
    if (requireAll) {
      hasAccess = hasAllPermissions(permission);
    } else {
      hasAccess = hasAnyPermission(permission);
    }
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: string | string[];
  requireAll?: boolean;
  children: React.ReactNode;
}

/**
 * Button that's disabled if user doesn't have permission
 */
export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  requireAll = false,
  children,
  ...props
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  let hasAccess = false;

  if (typeof permission === "string") {
    hasAccess = hasPermission(permission);
  } else if (Array.isArray(permission)) {
    hasAccess = requireAll ? hasAllPermissions(permission) : hasAnyPermission(permission);
  }

  return (
    <button
      {...props}
      disabled={!hasAccess || props.disabled}
      title={!hasAccess ? "No tienes permiso para esta acción" : undefined}
    >
      {children}
    </button>
  );
};

/**
 * Hook to check permissions in custom logic
 */
export function usePermissions() {
  return useAuth();
}
