"use client";

import React from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Clipboard,
  Lock,
  Package,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  CreditCard,
  Key,
  Settings,
  Calendar,
  AlertCircle,
  Receipt,
  BookOpen,
  BarChart3,
} from "lucide-react";

type SidebarIconType =
  | "dashboard"
  | "pos"
  | "transactions"
  | "cierre"
  | "inventory"
  | "employees"
  | "schedules"
  | "payroll"
  | "reports"
  | "loyalty"
  | "admin"
  | "modules"
  | "periods"
  | "taxes"
  | "roles"
  | "settings"
  | "expenses"
  | "bilan"
  | "contacts";

interface SidebarIconProps {
  type: SidebarIconType;
  size?: "md" | "lg";
  className?: string;
}

export const SidebarIcon: React.FC<SidebarIconProps> = ({
  type,
  size = "md",
  className = "",
}) => {
  const sizeClass = size === "lg" ? "w-6 h-6" : "w-5 h-5";
  const iconClasses = `${sizeClass} ${className}`;

  const iconMap: Record<SidebarIconType, React.ReactNode> = {
    dashboard: <LayoutDashboard className={iconClasses} />,
    pos: <ShoppingCart className={iconClasses} />,
    transactions: <Clipboard className={iconClasses} />,
    cierre: <Lock className={iconClasses} />,
    inventory: <Package className={iconClasses} />,
    employees: <Users className={iconClasses} />,
    schedules: <Clock className={iconClasses} />,
    payroll: <DollarSign className={iconClasses} />,
    reports: <TrendingUp className={iconClasses} />,
    loyalty: <CreditCard className={iconClasses} />,
    admin: <Key className={iconClasses} />,
    modules: <Settings className={iconClasses} />,
    periods: <Calendar className={iconClasses} />,
    taxes: <AlertCircle className={iconClasses} />,
    roles: <Key className={iconClasses} />,
    settings: <Settings className={iconClasses} />,
    expenses: <Receipt className={iconClasses} />,
    bilan: <BarChart3 className={iconClasses} />,
    contacts: <BookOpen className={iconClasses} />,
  };

  return iconMap[type];
};
