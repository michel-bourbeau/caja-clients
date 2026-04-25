"use client";

import React from "react";
import { 
  Pencil, 
  Package, 
  Trash2, 
  X, 
  Search, 
  Plus, 
  Eye, 
  FileText, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Loader,
  RefreshCw
} from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}) => {
  const baseStyles =
    "font-medium rounded transition cursor-pointer";

  const variantStyles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-slate-200 hover:bg-slate-300 text-slate-900",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    ghost: "hover:bg-slate-100 text-slate-900",
  };

  const sizeStyles = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: "edit" | "stock" | "delete" | "close" | "search" | "plus" | "eye" | "print" | "check" | "chevron-down" | "chevron-up" | "alert" | "loader" | "refresh";
  size?: "sm" | "md" | "lg";
  color?: "slate" | "blue" | "red" | "green" | "amber";
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = "md",
  color = "slate",
  className,
  ...props
}) => {
  const sizeStyles = {
    sm: "p-1 w-8 h-8",
    md: "p-2 w-10 h-10",
    lg: "p-3 w-12 h-12",
  };

  const iconSizes = {
    sm: 14,
    md: 20,
    lg: 28,
  };

  const colorStyles = {
    slate: "hover:bg-slate-100 text-slate-600 hover:text-slate-700 transition-colors",
    blue: "hover:bg-slate-100 text-slate-600 hover:text-slate-700 transition-colors",
    red: "text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors",
    green: "text-green-600 hover:bg-green-100 hover:text-green-700 transition-colors",
    amber: "text-amber-600 hover:bg-amber-100 hover:text-amber-700 transition-colors",
  };

  const renderIcon = (iconType: string, iconSize: number) => {
    switch (iconType) {
      case "edit":
        return <Pencil size={iconSize} />;
      case "stock":
        return <Package size={iconSize} />;
      case "delete":
        return <Trash2 size={iconSize} />;
      case "close":
        return <X size={iconSize} />;
      case "search":
        return <Search size={iconSize} />;
      case "plus":
        return <Plus size={iconSize} />;
      case "eye":
        return <Eye size={iconSize} />;
      case "print":
        return <FileText size={iconSize} />;
      case "check":
        return <CheckCircle size={iconSize} />;
      case "chevron-down":
        return <ChevronDown size={iconSize} />;
      case "chevron-up":
        return <ChevronUp size={iconSize} />;
      case "alert":
        return <AlertCircle size={iconSize} />;
      case "loader":
        return <Loader size={iconSize} className="animate-spin" />;
      case "refresh":
        return <RefreshCw size={iconSize} className="group-hover:animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <button
      className={`inline-flex items-center justify-center ${sizeStyles[size]} ${colorStyles[color]} rounded-lg transition-colors ${className}`}
      {...props}
    >
      {renderIcon(icon, iconSizes[size])}
    </button>
  );
};

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
    {title && <h2 className="text-lg font-bold mb-4 text-slate-900">{title}</h2>}
    {children}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-bold text-gray-900 mb-1">{label}</label>}
    <input
      className={`w-full px-3 py-2 border rounded bg-white text-gray-900 placeholder-gray-600 font-medium ${
        error ? "border-red-500" : "border-gray-400"
      } focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...props}
    />
    {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, options, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-bold text-gray-900 mb-1">{label}</label>}
    <select
      className={`w-full px-3 py-2 border rounded bg-white text-gray-900 font-medium ${
        error ? "border-red-500" : "border-gray-400"
      } focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...props}
    >
      <option value="">Seleccionar...</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
  </div>
);
