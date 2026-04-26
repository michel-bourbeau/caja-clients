"use client";

import { Alert, Button } from "@/components/StripeUIComponents";
import Link from "next/link";
import { AlertTriangle, Clock, AlertCircle, CreditCard } from "lucide-react";
import { PaymentStatus } from "@/lib/hooks/usePaymentStatus";

interface PlanExpirationAlertProps {
  status: PaymentStatus | null;
  isLoading?: boolean;
}

export function PlanExpirationAlert({ status, isLoading }: PlanExpirationAlertProps) {
  if (isLoading || !status) return null;

  // Suspended - Expired more than 3 days - COMPLETE BLOCK
  if (status.isSuspended) {
    return (
      <Alert 
        variant="error" 
        title="🚨 CUENTA SUSPENDIDA"
        className="border-2 border-red-500 bg-red-50"
      >
        <div className="space-y-3">
          <p className="font-bold text-red-900 text-base">
            Tu suscripción ha expirado hace {Math.abs(status.daysUntilExpiration)} días
          </p>
          <p className="text-sm text-red-800 font-medium">
            ⚠️ TODOS LOS MÓDULOS, USUARIOS Y EMPLEADOS HAN SIDO DESACTIVADOS
          </p>
          <p className="text-sm text-red-800 mb-4">
            Para restaurar el acceso completo, contacta con el administrador del sistema para efectuar el pago de inmediato.
          </p>
          <div className="flex gap-2">
            <Link href="/dashboard/settings" className="flex-1">
              <Button variant="primary" size="sm" className="w-full">
                <CreditCard className="w-4 h-4 mr-2" />
                Ver Estado del Pago
              </Button>
            </Link>
          </div>
        </div>
      </Alert>
    );
  }

  // Expiring within 7 days - WARNING
  if (status.isExpiringWithin7Days && status.daysUntilExpiration >= 0) {
    return (
      <Alert 
        variant="warning" 
        title="⏰ Suscripción Expirando Pronto"
        className="border-2 border-yellow-500"
      >
        <div className="space-y-3">
          <p className="font-semibold text-yellow-900">
            Tu suscripción expira en {status.daysUntilExpiration} días.
          </p>
          <p className="text-sm text-yellow-800">
            Asegúrate de realizar el pago a tiempo para evitar la suspensión de todos los módulos y usuarios.
          </p>
          <Link href="/dashboard/settings">
            <Button variant="primary" size="sm" className="mt-2">
              <Clock className="w-4 h-4 mr-2" />
              Renovar Ahora
            </Button>
          </Link>
        </div>
      </Alert>
    );
  }

  return null;
}
