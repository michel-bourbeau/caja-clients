"use client";

import { useTrialStatus } from "@/hooks/useTrialStatus";
import { AlertCircle, AlertTriangle, Clock } from "lucide-react";

/**
 * Composant affichant une bannière d'alerte si l'essai approche ou a expiré
 */
export function TrialExpiredBanner() {
  const { isTrialExpired, daysRemaining, isPaid } = useTrialStatus();

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
              ⏰ Votre essai gratuit a expiré
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Pour continuer à utiliser l'application, veuillez passer à un plan payant.
            </p>
            <a
              href="/dashboard/settings?tab=billing"
              className="mt-3 inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              💳 Passer à un plan payant
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
              ⚠️ Il vous reste {daysRemaining} jour
              {daysRemaining > 1 ? "s" : ""} d'essai gratuit
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Pensez à passer à un plan payant pour ne pas interrompre votre
              service.
            </p>
            <a
              href="/dashboard/settings?tab=billing"
              className="mt-3 inline-block px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              💳 Passer à un plan payant
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
              ⏳ Derniers {daysRemaining} jour{daysRemaining > 1 ? "s" : ""} d'essai!
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Passez rapidement à un plan payant pour conserver vos données et
              accès.
            </p>
            <a
              href="/dashboard/settings?tab=billing"
              className="mt-3 inline-block px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              💳 Passer à un plan payant
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
