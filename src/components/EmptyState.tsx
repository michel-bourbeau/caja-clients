"use client";

import React from "react";
import { Loader2, Inbox } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmptyStateVariant = "loading" | "empty" | "error";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  state: EmptyStateVariant;
  /** Message affiché. Défauts : "Cargando...", "Sin resultados", "Error al cargar" */
  message?: string;
  /** Icône personnalisée (optionnelle) */
  icon?: React.ReactNode;
  /** Bouton d'action optionnel (ex : "Crear el primero") */
  action?: EmptyStateAction;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Composant standardisé pour les états vides, chargement et erreur
 * dans les listes et tableaux.
 *
 * Usage :
 * ```tsx
 * {loading ? (
 *   <EmptyState state="loading" />
 * ) : items.length === 0 ? (
 *   <EmptyState state="empty" message="No hay gastos registrados" action={{ label: "Crear gasto", onClick: openForm }} />
 * ) : (
 *   <ItemsList items={items} />
 * )}
 * ```
 */
export function EmptyState({ state, message, icon, action, className = "" }: EmptyStateProps) {
  const { t } = useLanguage();

  const DEFAULTS: Record<EmptyStateVariant, { message: string; icon: React.ReactNode }> = {
    loading: {
      message: t("emptyState.loading"),
      icon: <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />,
    },
    empty: {
      message: t("emptyState.empty"),
      icon: <Inbox className="w-8 h-8 text-slate-300" />,
    },
    error: {
      message: t("emptyState.error"),
      icon: <span className="text-3xl">⚠️</span>,
    },
  };

  const defaults = DEFAULTS[state];
  const displayIcon = icon ?? defaults.icon;
  const displayMessage = message ?? defaults.message;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 text-center text-slate-500 ${className}`}
    >
      {displayIcon}
      <p className="text-sm font-medium">{displayMessage}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 text-sm font-medium text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
