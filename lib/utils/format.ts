// ============================================================
// lib/utils/format.ts
// Pure formatting utilities — no React, no Supabase deps.
// Safe to import in any page, component, or hook.
// ============================================================

/**
 * Formats a number as Indian Rupees (₹) with no decimal places.
 * e.g. 1500 → "₹1,500"
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats an ISO date string into a human-readable Indian locale date.
 * e.g. "2024-01-15" → "15 Jan 2024"
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Returns up to two initials from a full name.
 * e.g. "Anand Kumar" → "AK", "Pradeep" → "P"
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
