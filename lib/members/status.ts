// ============================================================
// lib/members/status.ts
// Business logic for computing a member's display status.
//
// Pure function — no React, no Supabase deps.
// Safe to import in any component, hook, or utility.
// ============================================================

import { todayISO, sevenDaysFromNow } from "@/lib/utils/date";
import type { StatusKey } from "@/lib/constants/status";
import type { MemberWithMembership } from "@/hooks/useMembers";

/**
 * Derives the display status of a member from their membership record.
 *
 * Priority order (highest → lowest):
 *   inactive → overdue → pending → expiring → active
 */
export function getMemberStatus(m: MemberWithMembership): StatusKey {
  if (!m.is_active) return "inactive";
  if (!m.membership) return "active";

  const today = todayISO();
  const weekFromNow = sevenDaysFromNow();
  const { payment_status, end_date } = m.membership;

  if (payment_status === "overdue") return "overdue";
  if (payment_status === "pending") return "pending";
  if (end_date >= today && end_date <= weekFromNow) return "expiring";
  return "active";
}
