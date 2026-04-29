"use client";

import { useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { FlashVariant, FlashState } from "@/lib/types";

// ─── Styles ───────────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<FlashVariant, { container: string; icon: string }> = {
  success: {
    container: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: "✅",
  },
  error: {
    container: "bg-red-50 text-red-700 border border-red-200",
    icon: "❌",
  },
  warning: {
    container: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: "⚠️",
  },
  info: {
    container: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: "ℹ️",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface FlashMessageProps {
  flash: FlashState | null;
  onDismiss?: () => void;
  /** Durée en ms avant auto-dismiss. 0 = pas d'auto-dismiss. Défaut : 4000 */
  duration?: number;
  className?: string;
}

export function FlashMessage({ flash, onDismiss, duration = 4000, className = "" }: FlashMessageProps) {
  useEffect(() => {
    if (!flash || duration === 0) return;
    const t = setTimeout(() => onDismiss?.(), duration);
    return () => clearTimeout(t);
  }, [flash, duration, onDismiss]);

  if (!flash) return null;

  const { container, icon } = VARIANT_STYLES[flash.variant];

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg mb-4 text-sm font-medium ${container} ${className}`}
      role="alert"
    >
      <span className="flex items-center gap-2">
        <span>{icon}</span>
        <span>{flash.message}</span>
      </span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook utilitaire pour gérer l'état d'un FlashMessage.
 *
 * Usage :
 * ```tsx
 * const { flash, showFlash, clearFlash } = useFlash();
 *
 * showFlash("success", "Guardado con éxito");
 * showFlash("error", "Error al guardar");
 *
 * <FlashMessage flash={flash} onDismiss={clearFlash} />
 * ```
 */
export function useFlash() {
  const [flash, setFlash] = useState<FlashState | null>(null);

  const showFlash = useCallback((variant: FlashVariant, message: string) => {
    setFlash({ variant, message });
  }, []);

  const clearFlash = useCallback(() => setFlash(null), []);

  return { flash, showFlash, clearFlash };
}
