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
  | "expenses";

interface DashboardHeaderProps {
  pageType: PageIconType;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function DashboardHeader({ pageType, title, subtitle, children }: DashboardHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
      <div className="flex items-center gap-3">
        <PageIcon type={pageType} size="lg" displayType="lucide" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {/* Actions spécifiques à la page */}
        {children}
      </div>
    </div>
  );
}
