// Shared helpers for the payroll pages (periods, receipts).

export function fmtHours(h: number): string {
  const hrs = Math.floor(h);
  const min = Math.round((h - hrs) * 60);
  if (min === 0) return `${hrs}h`;
  return `${hrs}h ${String(min).padStart(2, "0")}m`;
}
