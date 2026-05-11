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

/**
 * Formats the duration between a check-in and check-out timestamp.
 * If checkOut is null (member still in gym), uses the current time as the end.
 *
 * Examples:
 *   "< 1 min"  — less than 60 seconds
 *   "45 min"   — less than 60 minutes
 *   "1h 30m"   — 90 minutes
 *   "2h"       — exact hours with no minute remainder
 *
 * For still-in members the result refreshes with the 30s attendance poll.
 */
export function formatDuration(checkIn: string, checkOut: string | null): string {
  const end = checkOut ? new Date(checkOut) : new Date();
  const diffMs = end.getTime() - new Date(checkIn).getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 1)  return "< 1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins  = totalMinutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

/**
 * Formats an ISO timestamp as a short weekday + date in IST.
 * e.g. "2026-05-10T09:15:00Z" → "Sat, 10 May"
 * Used in the attendance Date column for multi-day views.
 */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}
