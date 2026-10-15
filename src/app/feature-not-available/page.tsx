"use client";

import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";

export default function FeatureNotAvailablePage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="max-w-md mx-auto flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("featureNotAvailable.title")}</h1>
          <p className="text-gray-700 mb-6">{t("featureNotAvailable.message")}</p>
          <Link href="/dashboard">
            <Button className="w-full bg-blue-600">{t("featureNotAvailable.backToDashboard")}</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
