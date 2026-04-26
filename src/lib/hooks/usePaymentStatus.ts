import { useState, useEffect } from 'react';

export interface PaymentStatus {
  paid_until: string | null;
  daysUntilExpiration: number;
  isExpired: boolean;
  isExpiredMoreThan3Days: boolean;
  isExpiringWithin7Days: boolean;
  isSuspended: boolean;
  status: 'active' | 'expiring-soon' | 'expired' | 'suspended';
}

function calculateStatus(paidUntilStr: string | null): PaymentStatus {
  // If paid_until is NULL, tenant is suspended (payment cancelled)
  if (!paidUntilStr) {
    return {
      paid_until: null,
      daysUntilExpiration: -1,
      isExpired: true,
      isExpiredMoreThan3Days: true,
      isExpiringWithin7Days: false,
      isSuspended: true,  // ✅ SUSPENDED
      status: 'suspended' as const,  // ✅ SUSPENDED
    };
  }

  const paidUntil = new Date(paidUntilStr);
  const now = new Date();
  const diffTime = paidUntil.getTime() - now.getTime();
  const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isExpired = daysUntilExpiration < 0;
  const isExpiredMoreThan3Days = daysUntilExpiration < -3;
  const isExpiringWithin7Days = daysUntilExpiration >= 0 && daysUntilExpiration <= 7;
  const isSuspended = isExpiredMoreThan3Days;

  let status: 'active' | 'expiring-soon' | 'expired' | 'suspended' = 'active';
  if (isSuspended) status = 'suspended';
  else if (isExpiringWithin7Days || isExpired) status = 'expiring-soon';

  return {
    paid_until: paidUntilStr,
    daysUntilExpiration,
    isExpired,
    isExpiredMoreThan3Days,
    isExpiringWithin7Days,
    isSuspended,
    status,
  };
}

export function usePaymentStatus(tenantId: string | null) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchPaymentStatus = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tenants/${tenantId}/payment`, { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch payment status');

        const data = await res.json();
        if (isMounted) {
          const status = calculateStatus(data.paid_until);
          setPaymentStatus(status);
        }
      } catch (error) {
        // Ignore abort errors (component unmounted)
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error fetching payment status:', error);
        if (isMounted) {
          // Default to SUSPENDED to be safe (require manual verification)
          setPaymentStatus(calculateStatus(null));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPaymentStatus();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tenantId]);

  return { paymentStatus, loading, refetch: () => {} };
}
