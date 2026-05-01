"use client";

import { useTrialStatus } from "@/hooks/useTrialStatus";
import { AlertCircle, AlertTriangle, Clock } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Composant affichant une bannière d'alerte si l'essai approche ou a expiré
 */
export function TrialExpiredBanner() {
  const { isTrialExpired, daysRemaining, isPaid } = useTrialStatus();
  const { t } = useLanguage();

  // Si le client a payé, pas d'affichage
  if (isPaid) return null;

  // Si l'essai a expiré
  if (isTrialExpired) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 p-4 mb-6 rounded-lg shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-red-900">
              {t("trialBanner.expiredTitle")}
            </h3>
            <p className="text-sm text-red-700 mt-1">
              {t("trialBanner.expiredDesc")}
            </p>
            <a
              href="/dashboard/settings?tab=billing"
              className="mt-3 inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {t("trialBanner.upgradeCta")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Si l'essai approche de son expiration (moins de 7 jours)
  if (daysRemaining && daysRemaining <= 7 && daysRemaining > 0) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-100 border-l-4 border-amber-500 p-4 mb-6 rounded-lg shadow-sm">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-amber-900">
              {t("trialBanner.warningTitle", { n: daysRemaining })}
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {t("trialBanner.warningDesc")}
            </p>
            <a
              href="/dashboard/settings?tab=billing"
              className="mt-3 inline-block px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {t("trialBanner.upgradeCta")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Si l'essai approche bientôt (moins de 3 jours)
  if (daysRemaining && daysRemaining <= 3 && daysRemaining > 0) {
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-amber-100 border-l-4 border-yellow-500 p-4 mb-6 rounded-lg shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-yellow-900">
              {t("trialBanner.urgentTitle", { n: daysRemaining })}
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              {t("trialBanner.urgentDesc")}
            </p>
            <a
              href="/dashboard/settings?tab=billing"
              className="mt-3 inline-block px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {t("trialBanner.upgradeCta")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
