"use client";

import React, { useEffect } from "react";
import { IconButton } from "./ui";

interface DialogProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg";
  scrollable?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

/**
 * Standardized Dialog component for the application
 * 
 * Usage:
 * ```tsx
 * <Dialog
 *   isOpen={showDialog}
 *   title="Add Item"
 *   onClose={() => setShowDialog(false)}
 *   footer={
 *     <>
 *       <Button variant="secondary" onClick={() => setShowDialog(false)}>Cancel</Button>
 *       <Button variant="primary" onClick={handleSave}>Save</Button>
 *     </>
 *   }
 * >
 *   Dialog content goes here
 * </Dialog>
 * 
 */
export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  title,
  onClose,
  children,
  footer,
  maxWidth = "md",
  scrollable = true,
}) => {
  // Block body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-[80%] max-w-[800px] p-6 space-y-4 ${
          scrollable ? "max-h-[90vh] overflow-y-auto" : ""
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <IconButton
            icon="close"
            color="slate"
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
          />
        </div>

        {/* Content */}
        <div className="space-y-4">{children}</div>

        {/* Footer */}
        {footer && <div className="flex gap-2 pt-4 justify-end">{footer}</div>}
      </div>
    </div>
  );
};

/**
 * DialogFooter component for standardized footer actions
 */
interface DialogFooterProps {
  onSave: () => void;
  saveLabel?: string;
  isSaving?: boolean;
  disableSave?: boolean;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({
  onSave,
  saveLabel = "Guardar",
  isSaving = false,
  disableSave = false,
}) => {
  return (
    <div className="flex gap-2 pt-4 justify-end">
      <button
        onClick={onSave}
        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg whitespace-nowrap"
        disabled={isSaving || disableSave}
      >
        {isSaving ? "Guardando..." : saveLabel}
      </button>
    </div>
  );
};
