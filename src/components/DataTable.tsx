"use client";

import React from "react";

interface DataTableProps<T> {
  columns: Array<{
    key: keyof T;
    label: string;
    format?: (value: any) => React.ReactNode;
  }>;
  data: T[];
  actions?: (item: T) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  actions,
  loading = false,
  emptyMessage = "No hay datos",
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-800">Cargando...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-800">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className="px-6 py-3 text-left font-semibold text-slate-900">
                {col.label}
              </th>
            ))}
            {actions && <th className="px-6 py-3 text-left font-semibold text-slate-900">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              {columns.map((col) => (
                <td key={String(col.key)} className="px-6 py-3 text-slate-700">
                  {col.format ? col.format(item[col.key]) : String(item[col.key])}
                </td>
              ))}
              {actions && (
                <td className="px-6 py-3">
                  <div className="flex gap-2">{actions(item)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
