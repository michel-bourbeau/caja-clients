import React from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput = React.forwardRef<HTMLDivElement, SearchInputProps>(
  ({ value, onChange, placeholder = "Buscar...", className = "" }, ref) => {
    return (
      <div ref={ref} className={`relative ${className}`}>
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ paddingLeft: '28px' }}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
