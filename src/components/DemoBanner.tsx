"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export function DemoBanner() {
  const { isDemoMode, logout } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  if (!isDemoMode) return null;

  const handleExit = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-1.5 bg-amber-400 text-amber-900 text-xs font-semibold z-50">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t("demoBanner.message")}
        </span>
      </div>
      <button
        onClick={handleExit}
        className="px-2 py-0.5 rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors text-xs whitespace-nowrap"
      >
        {t("demoBanner.exit")}
      </button>
    </div>
  );
}
