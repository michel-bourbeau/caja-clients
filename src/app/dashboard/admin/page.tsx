"use client";

import { Card, Button } from "@/components/ui";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function AdminDashboard() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("admin.title")}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Users & Roles */}
        <Card className="border-2 border-blue-200 hover:shadow-lg transition">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t("admin.roles.card_title")}</h2>
              <p className="text-slate-600 text-sm mb-4">
                {t("admin.roles.card_desc")}
              </p>
            </div>
          </div>
          <Link href="/dashboard/admin/roles">
            <Button variant="primary" className="w-full">
              {t("admin.roles.card_btn")}
            </Button>
          </Link>
        </Card>

        {/* System Settings */}
        <Card className="border-2 border-purple-200 hover:shadow-lg transition">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t("admin.settings.card_title")}</h2>
              <p className="text-slate-600 text-sm mb-4">
                {t("admin.settings.card_desc")}
              </p>
            </div>
          </div>
          <Link href="/dashboard/settings">
            <Button variant="primary" className="w-full">
              {t("admin.settings.card_btn")}
            </Button>
          </Link>
        </Card>

        {/* Audit Logs */}
        <Card className="border-2 border-amber-200 hover:shadow-lg transition">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t("admin.audit.card_title")}</h2>
              <p className="text-slate-600 text-sm mb-4">
                {t("admin.audit.card_desc")}
              </p>
            </div>
          </div>
          <Button variant="secondary" className="w-full" disabled>
            {t("admin.comingSoon")}
          </Button>
        </Card>

        {/* Statistics */}
        <Card className="border-2 border-green-200 hover:shadow-lg transition">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t("admin.stats.card_title")}</h2>
              <p className="text-slate-600 text-sm mb-4">
                {t("admin.stats.card_desc")}
              </p>
            </div>
          </div>
          <Button variant="secondary" className="w-full" disabled>
            {t("admin.comingSoon")}
          </Button>
        </Card>
      </div>

      {/* System Info */}
      <Card title={t("admin.sysInfo.title")}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm text-slate-600">{t("admin.sysInfo.version")}</p>
            <p className="text-2xl font-bold text-gray-900">1.0.0</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <p className="text-sm text-slate-600">{t("admin.sysInfo.status")}</p>
            <p className="text-2xl font-bold text-green-600">{t("admin.sysInfo.statusValue")}</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <p className="text-sm text-slate-600">{t("admin.sysInfo.database")}</p>
            <p className="text-2xl font-bold text-gray-900">Mock</p>
          </div>
          <div className="border-l-4 border-amber-500 pl-4">
            <p className="text-sm text-slate-600">{t("admin.sysInfo.lastSync")}</p>
            <p className="text-sm font-bold text-slate-900">{t("admin.sysInfo.lastSyncValue")}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
