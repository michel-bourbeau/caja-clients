"use client";

import React from "react";

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
    "font-medium rounded transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

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
