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

/**
 * Formats an ISO timestamp into a 12-hour time string (Indian locale).
 * e.g. "2024-01-15T09:30:00Z" → "09:30 AM"
 */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Returns a time-of-day greeting string based on the current local hour.
 * Morning: 00–11  → "Good morning"
 * Afternoon: 12–16 → "Good afternoon"
 * Evening: 17–23  → "Good evening"
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17) return "Good evening";
  return "Good morning";
}
