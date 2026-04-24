"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface SuperAdminContextType {
  isSuperAdmin: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

// Super admin password - EN PRODUCTION, utiliser une variable d'environnement
const SUPER_ADMIN_PASSWORD = "chocorico9848";
const SUPER_ADMIN_SESSION_KEY = "superadmin_session";

export const SuperAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(SUPER_ADMIN_SESSION_KEY);
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        if (Date.now() <= session.expiresAt) {
          setIsSuperAdmin(true);
        } else {
          localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
        }
      } catch (e) {
        localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      if (password !== SUPER_ADMIN_PASSWORD) {
        throw new Error("Mot de passe incorrect");
      }

      // Session valide pour 24 heures
      const session = {
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      localStorage.setItem(SUPER_ADMIN_SESSION_KEY, JSON.stringify(session));
      setIsSuperAdmin(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur d'authentification";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
    setIsSuperAdmin(false);
    setError(null);
  }, []);

  return (
    <SuperAdminContext.Provider
      value={{
        isSuperAdmin,
        isLoading,
        login,
        logout,
        error,
      }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
};

export function useSuperAdmin() {
  const context = useContext(SuperAdminContext);
  if (!context) {
    throw new Error("useSuperAdmin must be used within SuperAdminProvider");
  }
  return context;
}
