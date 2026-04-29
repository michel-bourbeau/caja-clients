"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  /**
   * sm  — w-4 h-4, pour les petits espaces inline (ex: à l'intérieur d'une card)
   * md  — w-6 h-6, pour les sections (défaut)
   * lg  — w-10 h-10, pour les états pleine page
   */
  size?: "sm" | "md" | "lg";
  /** Texte affiché sous le spinner. Par défaut "Cargando..." */
  text?: string;
  /** Si false, le texte est masqué */
  showText?: boolean;
}

const SIZE_CLASS: Record<NonNullable<LoadingSpinnerProps["size"]>, string> = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-10 h-10",
};

const TEXT_CLASS: Record<NonNullable<LoadingSpinnerProps["size"]>, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

/**
 * Composant de chargement réutilisable.
 *
 * Usage :
 * ```tsx
 * // Pleine page (div parente h-screen flex items-center justify-center)
 * <LoadingSpinner size="lg" />
 *
 * // Section (ex: tableau en chargement)
 * <LoadingSpinner size="md" />
 *
 * // Inline dans une card
 * <LoadingSpinner size="sm" />
 * ```
 */
export function LoadingSpinner({
  size = "md",
  text = "Cargando...",
  showText = true,
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
      <Loader2 className={`${SIZE_CLASS[size]} animate-spin text-blue-500`} />
      {showText && <p className={`${TEXT_CLASS[size]} font-medium`}>{text}</p>}
    </div>
  );
}
