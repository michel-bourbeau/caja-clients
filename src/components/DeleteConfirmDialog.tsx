"use client";

import React from "react";
import { Dialog } from "./Dialog";
import { Button } from "./ui";
import { Trash2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeleteConfirmDialogProps {
  /** Ouvre ou ferme le dialogue */
  isOpen: boolean;
  /** Titre de la dialog. Défaut : "Confirmar eliminación" */
  title?: string;
  /** Message affiché dans le corps. Défaut : "¿Estás seguro de que deseas eliminar este elemento?" */
  message?: string;
  /** Nom de l'élément à supprimer (affiché en gras dans le message) */
  itemName?: string;
  /** Texte du bouton de confirmation. Défaut : "Eliminar" */
  confirmLabel?: string;
  /** Callback quand l'utilisateur confirme */
  onConfirm: () => void;
  /** Callback quand l'utilisateur annule / ferme */
  onCancel: () => void;
  /** Affiche un spinner sur le bouton pendant l'opération */
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Dialog de confirmation de suppression standardisé.
 *
 * Remplace les window.confirm() et les modals inline de confirmation.
 *
 * Usage :
 * ```tsx
 * <DeleteConfirmDialog
 *   isOpen={!!deleteId}
 *   itemName="Café con leche"
 *   onConfirm={() => handleDelete(deleteId!)}
 *   onCancel={() => setDeleteId(null)}
 * />
 * ```
 */
export function DeleteConfirmDialog({
  isOpen,
  title,
  message,
  itemName,
  confirmLabel,
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteConfirmDialogProps) {
  const { t } = useLanguage();

  const resolvedTitle = title ?? t("deleteDialog.title");
  const resolvedConfirmLabel = confirmLabel ?? t("deleteDialog.confirm");

  const bodyMessage =
    message ??
    (itemName
      ? t("deleteDialog.messageWithName", { name: itemName })
      : t("deleteDialog.message"));

  return (
    <Dialog
      isOpen={isOpen}
      title={resolvedTitle}
      onClose={onCancel}
      maxWidth="sm"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t("deleteDialog.deleting")}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                {resolvedConfirmLabel}
              </span>
            )}
          </Button>
        </div>
      }
    >
      <p className="text-slate-600 text-sm">{bodyMessage}</p>
    </Dialog>
  );
}
