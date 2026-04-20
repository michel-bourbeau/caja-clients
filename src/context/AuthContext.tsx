"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { User, AuthContextType } from "@/lib/types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement actual API call
      // For now, mock data with admin permissions (all permissions)
      const mockPermissions = [
        "pos.create",
        "pos.view",
        "pos.void",
        "pos.configure",
        "inventory.view",
        "inventory.create",
        "inventory.edit",
        "inventory.delete",
        "inventory.adjust",
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

      const mockUser: User = {
        id: "1",
        email,
        firstName: "Admin",
        lastName: "User",
        roleId: "admin",
        permissions: mockPermissions,
      };
      setUser(mockUser);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
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
