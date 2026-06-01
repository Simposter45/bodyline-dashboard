"use client";

// ============================================================
// hooks/useDashboardStats.ts
// TanStack Query hook for the owner dashboard overview.
// Replaces the raw useEffect + Promise.all in dashboard/page.tsx.
// Automatically scoped to the calling user's gym via RLS.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AttendanceWithMember, Trainer } from "@/types";
import {
  todayISO,
  monthStartISO,
  todayRangeIST,
  sevenDaysFromNow,
} from "@/lib/utils/date";

// ── Return type ─────────────────────────────────────────────────────
// Exported so page.tsx can reference it without re-defining.
// Mirrors the shape consumed by the dashboard JSX — single source of truth.

export interface DashboardStats {
  members: {
    totalActive: number;
    newThisMonth: number;
    expiringThisWeek: number; // Fixed: was always 0 in page.tsx
  };
  revenue: {
    totalCollected: number;
    totalPending: number;
    totalOverdue: number;  // Monetary amount owed across all overdue memberships
    overdueCount: number;  // Number of overdue membership records (for sub-label)
  };
  today: {
    todayCheckins: number;
    currentlyInGym: number;
    attendance: AttendanceWithMember[];
  };
  trainers: Trainer[];
}

// ── Fetcher (private to this module) ────────────────────────────────
async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient();
  const { start: todayStart, end: todayEnd } = todayRangeIST();

  const [activeRes, newRes, mmRes, attRes, trainerRes, expiringRes] =
    await Promise.all([
      // 1. Total active members
      supabase
        .from("members")
        .select("id")
        .eq("is_active", true),

      // 2. Members who joined this calendar month
      supabase
        .from("members")
        .select("id")
        .eq("is_active", true)
        .gte("joined_date", monthStartISO()),

      // 3. All memberships — for revenue calculations
      //    We select member_id and created_at to group by latest membership
      supabase
        .from("member_memberships")
        .select("member_id, payment_status, amount_paid, created_at, plan:membership_plans(price)")
        .order("created_at", { ascending: false }),

      // 4. Today's check-ins with member name/photo for the panel list
      supabase
        .from("attendance")
        .select("*, member:members(id, full_name, phone, profile_photo_url)")
        .gte("check_in", todayStart)
        .lte("check_in", todayEnd),

      // 5. Active trainers for the trainers panel
      supabase
        .from("trainers")
        .select("*")
        .eq("is_active", true),

      // 6. Memberships expiring within the next 7 days (paid, not yet overdue)
      //    Uses sevenDaysFromNow() — the stub "0" value is now a real calculation
      supabase
        .from("member_memberships")
        .select("id")
        .gte("end_date", todayISO())
        .lte("end_date", sevenDaysFromNow())
        .eq("payment_status", "paid"),
    ]);

  // Throw on any query error — TanStack Query catches and exposes via .error
  if (activeRes.error)   throw activeRes.error;
  if (newRes.error)      throw newRes.error;
  if (mmRes.error)       throw mmRes.error;
  if (attRes.error)      throw attRes.error;
  if (trainerRes.error)  throw trainerRes.error;
  if (expiringRes.error) throw expiringRes.error;

  // ── Revenue calculations ─────────────────────────────────────────
  // Supabase returns `plan` as a single object for this many-to-one
  // foreign key join (membership_plans). Null if the plan was deleted.
  type MembershipRow = {
    member_id: string;
    payment_status: string;
    amount_paid: number | null;
    plan: { price: number } | null;
  };

  const allMMPayloads = (mmRes.data ?? []) as unknown as MembershipRow[];

  // ── Deduplication: latest membership per member ──────────────────
  // Used for CURRENT STATE metrics (pending/overdue count + amounts).
  // Memberships are already ordered by created_at DESC from the query,
  // so the first occurrence for each member_id is their latest.
  const latestMMMap = new Map<string, MembershipRow>();
  for (const m of allMMPayloads) {
    if (!latestMMMap.has(m.member_id)) {
      latestMMMap.set(m.member_id, m);
    }
  }
  const latestMM = Array.from(latestMMMap.values());
  const overdueRows = latestMM.filter((m) => m.payment_status === "overdue");

  const amountDue = (m: MembershipRow): number =>
    Math.max(0, (m.plan?.price ?? 0) - (m.amount_paid ?? 0));

  // totalCollected: cumulative money received across ALL membership rows.
  // MUST use allMMPayloads (not deduplicated) — a renewed member has
  // multiple paid rows and each represents real money collected.
  // Uses payment_status === "paid" — the original correct semantics.
  const totalCollected = allMMPayloads
    .filter((m) => m.payment_status === "paid")
    .reduce((sum, m) => sum + (m.amount_paid ?? 0), 0);

  // totalPending / totalOverdue: outstanding balance on CURRENT memberships.
  // Uses latest-per-member so superseded old rows don't inflate the figure.
  const totalPending = latestMM
    .filter((m) => m.payment_status === "pending")
    .reduce((sum, m) => sum + amountDue(m), 0);

  const totalOverdue = overdueRows.reduce(
    (sum, m) => sum + amountDue(m),
    0,
  );

  // ── Attendance ───────────────────────────────────────────────────
  const attendance = (attRes.data ?? []) as AttendanceWithMember[];

  return {
    members: {
      totalActive:      activeRes.data?.length ?? 0,
      newThisMonth:     newRes.data?.length ?? 0,
      expiringThisWeek: expiringRes.data?.length ?? 0,
    },
    revenue: {
      totalCollected,
      totalPending,
      totalOverdue,
      overdueCount: overdueRows.length,
    },
    today: {
      todayCheckins:  attendance.length,
      currentlyInGym: attendance.filter((a) => !a.check_out).length,
      attendance,
    },
    trainers: (trainerRes.data ?? []) as Trainer[],
  };
}

/**
 * Fetches all data needed for the owner dashboard overview page.
 *
 * Returns standard TanStack Query shape: { data, isLoading, error, refetch }
 * Automatically scoped to the user's gym via RLS — no gym_id needed client-side.
 */
export function useDashboardStats() {
  return useQuery<DashboardStats, Error>({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    // staleTime: 0 — always refetch on mount so navigating back to the
    // dashboard after recording a payment always shows up-to-date numbers.
    // gcTime keeps the last result in memory to avoid a blank flash.
    staleTime: 0,
    gcTime:    5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}
