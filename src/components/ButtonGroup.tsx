"use client";

import React from "react";

interface ButtonGroupOption<T extends string = string> {
  id: T;
  label: string;
  color?: "amber" | "green" | "blue" | "slate";
}

interface ButtonGroupProps<T extends string = string> {
  options: ButtonGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  (
    { options, value, onChange, disabled = false, size = "md" },
    ref
  ) => {
    const sizeClass = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-5 py-2.5 text-base",
    }[size];

    const getColorClasses = (optionColor: string, isActive: boolean) => {
      const colorMap: Record<string, { active: string; inactive: string }> = {
        amber: {
          active: "bg-amber-100 border-amber-300 text-amber-800",
          inactive: "bg-white border-slate-200 text-slate-600 hover:border-amber-200 hover:bg-amber-50",
        },
        green: {
          active: "bg-green-100 border-green-300 text-green-800",
          inactive: "bg-white border-slate-200 text-slate-600 hover:border-green-200 hover:bg-green-50",
        },
        blue: {
          active: "bg-blue-100 border-blue-300 text-blue-800",
          inactive: "bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50",
        },
        slate: {
          active: "bg-slate-200 border-slate-300 text-slate-900",
          inactive: "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
        },
      };

      const color = colorMap[optionColor] || colorMap.slate;
      return isActive ? color.active : color.inactive;
    };

    return (
      <div ref={ref} className="inline-flex rounded-lg border-2 border-slate-200 overflow-hidden bg-white shadow-sm">
        {options.map((option, index) => (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            disabled={disabled}
            className={`
              ${sizeClass}
              font-semibold
              border-r-2 border-slate-200
              transition-all
              duration-200
              ${index === options.length - 1 ? "border-r-0" : ""}
              ${getColorClasses(option.color || "slate", value === option.id)}
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }
);

ButtonGroup.displayName = "ButtonGroup";

export default ButtonGroup;
