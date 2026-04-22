// ============================================================
// lib/members/filters.ts
// Constants and types for member filtering.
// ============================================================

export type MemberFilterStatus = "all" | "active" | "expiring" | "overdue" | "pending" | "inactive";

export const MEMBER_FILTERS: { key: MemberFilterStatus; label: string }[] = [
  { key: "all", label: "All members" },
  { key: "active", label: "Active" },
  { key: "expiring", label: "Expiring soon" },
  { key: "overdue", label: "Overdue" },
  { key: "pending", label: "Pending" },
  { key: "inactive", label: "Inactive" },
];
