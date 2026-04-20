"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User, AuthContextType } from "@/lib/types";
import { saveSession, getStoredSession, clearSession, isSessionValid } from "@/lib/utils/session";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_PERMISSIONS = [
  "pos.create",
  "pos.view",
  "pos.void",
  "pos.configure",
  "inventory.view",
  "inventory.create",
  "inventory.edit",
  "inventory.delete",
  "inventory.adjust",
  "manage_products",
  "employees.view",
  "employees.create",
  "employees.edit",
  "employees.delete",
  "schedules.view",
  "schedules.edit",
  "schedules.checkin",
  "payroll.view",
  "payroll.create",
  "payroll.approve",
  "payroll.pay",
  "settings.view",
  "settings.edit",
  "settings.manage_roles",
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Try to restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedSession = getStoredSession();
      if (storedSession && isSessionValid(storedSession)) {
        // Auto-login with stored session
        const mockUser: User = {
          id: "1",
          email: storedSession.email,
          firstName: "User",
          lastName: "Session",
          roleId: "admin",
          permissions: MOCK_PERMISSIONS,
        };
        setUser(mockUser);
      }
      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      // TODO: Implement actual API call to verify credentials
      // For now, mock data with admin permissions (all permissions)
      const mockUser: User = {
        id: "1",
        email,
        firstName: "Admin",
        lastName: "User",
        roleId: "admin",
        permissions: MOCK_PERMISSIONS,
      };
      setUser(mockUser);

      // Store a default tenant ID for feature filtering (hardcoded for now)
      // In production, this would come from the user's profile in Supabase
      const defaultTenantId = "c1d44fe1-a862-4b6b-afbd-8566f61099a2";
      if (typeof window !== "undefined") {
        sessionStorage.setItem("defaultTenantId", defaultTenantId);
      }

      // Save session if "Remember me" is checked
      if (rememberMe) {
        saveSession(email, true);
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearSession();
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      return user.permissions.includes(permission);
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
      return permissions.some((perm) => user.permissions.includes(perm));
    },
    [user]
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
      return permissions.every((perm) => user.permissions.includes(perm));
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
