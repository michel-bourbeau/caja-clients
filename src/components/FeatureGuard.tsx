"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";
import { Card } from "@/components/ui";

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
}

export function FeatureGuard({ feature, children }: FeatureGuardProps) {
  const { features, loading } = useTenantFeatures();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !features[feature]) {
      router.push("/feature-not-available");
    }
  }, [feature, features, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="p-6 text-center">
          <p className="text-slate-600">Chargement des modules...</p>
        </Card>
      </div>
    );
  }

  if (!features[feature]) {
    return null;
  }

  return <>{children}</>;
}
