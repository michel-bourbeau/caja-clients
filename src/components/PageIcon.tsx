"use client";

import React from "react";
import {
  ShoppingCart,
  Package,
  Lock,
  Users,
  Clock,
  DollarSign,
  CreditCard,
  TrendingUp,
  LayoutDashboard,
  Settings,
  Key,
  Clipboard,
  Calendar,
  AlertCircle,
  Receipt,
  BookOpen,
} from "lucide-react";

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

type IconDisplayType = "emoji" | "lucide";

interface PageIconProps {
  type: PageIconType;
  size?: "sm" | "md" | "lg";
  displayType?: IconDisplayType;
  className?: string;
}

// Map icon types to emoji
const emojiMap: Record<PageIconType, string> = {
  transactions: "📋",
  inventory: "📦",
  pos: "🛒",
  cierre: "🔒",
  employees: "👥",
  schedules: "🕐",
  payroll: "💰",
  loyalty: "💳",
  reports: "📈",
  dashboard: "📊",
  settings: "⚙️",
  admin: "🔑",
  modules: "⚙️",
  periods: "📆",
  taxes: "💳",
  roles: "🔑",
  expenses: "💸",
  contacts: "📇",
};

// Map icon types to Lucide components
const lucideMap: Record<PageIconType, React.ComponentType<any>> = {
  transactions: Clipboard,
  inventory: Package,
  pos: ShoppingCart,
  cierre: Lock,
  employees: Users,
  schedules: Clock,
  payroll: DollarSign,
  loyalty: CreditCard,
  reports: TrendingUp,
  dashboard: LayoutDashboard,
  settings: Settings,
  admin: Key,
  modules: Settings,
  periods: Calendar,
  taxes: AlertCircle,
  roles: Key,
  expenses: Receipt,
  contacts: BookOpen,
};

// Standardized emoji size mapping
const emojiSizeMap = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
};

// Standardized lucide size mapping (in pixels)
const lucideSizeMap = {
  sm: 18,
  md: 24,
  lg: 32,
};

/**
 * PageIcon Component
 * 
 * Standardizes icon display throughout the application.
 * Supports both emoji and Lucide React icons.
 * Useful for page headers, section titles, navigation, etc.
 * 
 * Usage with Emoji (default):
 * <PageIcon type="transactions" size="md" />
 * <PageIcon type="inventory" size="lg" />
 * 
 * Usage with Lucide (recommended for consistency):
 * <PageIcon type="transactions" size="md" displayType="lucide" />
 * <PageIcon type="inventory" size="lg" displayType="lucide" />
 */
export const PageIcon: React.FC<PageIconProps> = ({
  type,
  size = "md",
  displayType = "emoji",
  className = "",
}) => {
  if (displayType === "lucide") {
    const LucideComponent = lucideMap[type];
    const iconSize = lucideSizeMap[size];
    
    return (
      <LucideComponent
        size={iconSize}
        className={`text-slate-700 flex-shrink-0 ${className}`}
        aria-label={type}
      />
    );
  }

  // Emoji display
  return (
    <span
      className={`inline-flex items-center justify-center ${emojiSizeMap[size]} select-none ${className}`}
      aria-label={type}
      role="img"
    >
      {emojiMap[type]}
    </span>
  );
};

export default PageIcon;

