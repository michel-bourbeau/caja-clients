import { useTenant } from "@/context/TenantContext";

/**
 * Hook pour vérifier le statut d'essai du tenant
 * Retourne si l'essai est expiré et combien de jours restent
 */
export function useTrialStatus() {
  const { tenant } = useTenant();

  // Vérifie si l'essai a expiré
  const isTrialExpired = (): boolean => {
    // Si le client a payé, il n'y a pas d'expiration
    if (tenant?.is_paid) return false;

    // Si pas de date d'expiration, l'essai n'est pas configuré
    if (!tenant?.trial_ends_at) return false;

    // Vérifie si la date d'expiration est passée
    return new Date() > new Date(tenant.trial_ends_at);
  };

  // Calcule les jours restants dans l'essai
  const daysRemaining = (): number | null => {
    // Si le client a payé, pas de limite de jours
    if (tenant?.is_paid) return null;

    // Si pas de date d'expiration
    if (!tenant?.trial_ends_at) return null;

    // Calcul des jours restants
    const now = new Date();
    const expiryDate = new Date(tenant.trial_ends_at);
    const daysLeft = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    return Math.max(0, daysLeft);
  };

  // Retourne l'état du trial
  return {
    isTrialExpired: isTrialExpired(),
    daysRemaining: daysRemaining(),
    isPaid: tenant?.is_paid || false,
    trialEndsAt: tenant?.trial_ends_at ? new Date(tenant.trial_ends_at) : null,
  };
}
