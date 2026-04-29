'use client';

import { useRouter } from 'next/navigation';
import { PageIcon } from './PageIcon';
import { Button } from './ui';
import React from 'react';

type PageIconType = 
  | "transactions" 
  | "inventory" 
  | "pos" 
  | "cierre" 
  | "employees" 
  | "schedules" 
  | "payroll" 
  | "loyalty" 
  | "reports" 
  | "dashboard" 
  | "settings" 
  | "admin"
  | "modules"
  | "periods"
  | "taxes"
  | "roles"
  | "expenses"
  | "contacts";

interface DashboardHeaderProps {
  pageType: PageIconType;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function DashboardHeader({ pageType, title, subtitle, children }: DashboardHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex gap-3 justify-between items-center mb-3 sm:mb-6">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="hidden sm:block flex-shrink-0">
          <PageIcon type={pageType} size="lg" displayType="lucide" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 truncate">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-1 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {/* Actions spécifiques à la page */}
        {children}
      </div>
    </div>
  );
}
