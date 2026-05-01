"use client";

import { Alert, Button } from "@/components/StripeUIComponents";
import Link from "next/link";
import { AlertTriangle, Clock, AlertCircle, CreditCard } from "lucide-react";
import { PaymentStatus } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";

interface PlanExpirationAlertProps {
  status: PaymentStatus | null;
  isLoading?: boolean;
}

export function PlanExpirationAlert({ status, isLoading }: PlanExpirationAlertProps) {
  const { t } = useLanguage();
  if (isLoading || !status) return null;

  // Suspended - Expired more than 3 days - COMPLETE BLOCK
  if (status.isSuspended) {
    return (
      <Alert 
        variant="error" 
        title={t("planExpiration.suspendedTitle")}
        className="border-2 border-red-500 bg-red-50"
      >
        <div className="space-y-3">
          <p className="font-bold text-red-900 text-base">
            {t("planExpiration.suspendedExpiredDays", { n: Math.abs(status.daysUntilExpiration) })}
          </p>
          <p className="text-sm text-red-800 font-medium">
            {t("planExpiration.suspendedModulesOff")}
          </p>
          <p className="text-sm text-red-800 mb-4">
            {t("planExpiration.suspendedContact")}
          </p>
          <div className="flex gap-2">
            <Link href="/dashboard/settings" className="flex-1">
              <Button variant="primary" size="sm" className="w-full">
                <CreditCard className="w-4 h-4 mr-2" />
                {t("planExpiration.viewPaymentStatus")}
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
        title={t("planExpiration.expiringTitle")}
        className="border-2 border-yellow-500"
      >
        <div className="space-y-3">
          <p className="font-semibold text-yellow-900">
            {t("planExpiration.expiringDays", { n: status.daysUntilExpiration })}
          </p>
          <p className="text-sm text-yellow-800">
            {t("planExpiration.expiringWarning")}
          </p>
          <Link href="/dashboard/settings">
            <Button variant="primary" size="sm" className="mt-2">
              <Clock className="w-4 h-4 mr-2" />
              {t("planExpiration.renewNow")}
            </Button>
          </Link>
        </div>
      </Alert>
    );
  }

  return null;
}
