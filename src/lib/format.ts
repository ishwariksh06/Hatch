/** Money is always integer paise in the DB. This is the only formatter. */
export function formatINR(paise: number): string {
  const rupees = Math.round(paise) / 100;
  return "₹" + rupees.toLocaleString("en-IN", {
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** Rupees (from a form) -> integer paise for storage. */
export function rupeesToPaise(rupees: number | string): number {
  const n = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

export function formatTime(d: Date | string): string {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
