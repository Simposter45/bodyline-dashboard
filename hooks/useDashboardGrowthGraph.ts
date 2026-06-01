"use client";

// ============================================================
// hooks/useDashboardGrowthGraph.ts — FEAT-015
//
// Provides cumulative growth data for the Dashboard Graph.
//
// For each calendar month (last 6 or 12):
//   members  → total active members who had joined ON OR BEFORE
//               the end of that month (snapshot-style cumulative count)
//   revenue  → sum of payments collected WITHIN that month
//               (using last_payment_at — the collection date)
//
// Both queries are scoped to the calling user's gym via RLS.
// Client-side aggregation keeps scale toggling instant.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// ── Public types ─────────────────────────────────────────────

export type GrowthScale = "6months" | "year";

export interface GrowthDataPoint {
  /** X-axis label: "Jan", "Feb '25", etc. */
  label: string;
  /** Cumulative count of active members at end of this month */
  members: number;
  /** ₹ collected during this calendar month */
  revenue: number;
  /** Net new members who joined in this specific month */
  newMembers: number;
  /** Month-over-month revenue change (positive = growth) */
  revenueDelta: number;
}

// ── Raw row shapes ───────────────────────────────────────────

interface MemberRow {
  joined_date: string | null;
}

interface PaymentRow {
  amount_paid: number | null;
  last_payment_at: string | null;
}

// ── IST helpers ──────────────────────────────────────────────

function toIST(d: Date): Date {
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
}

function istMonthKey(dateStr: string): string {
  // Extract YYYY-MM from any ISO date/timestamp string using IST
  const d = new Date(dateStr);
  const ist = toIST(d);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// Builds an ordered array of { key:"YYYY-MM", label:"Mon 'YY", start, end } buckets
function buildMonthBuckets(numMonths: number): Array<{
  key: string;
  label: string;
  endISO: string; // ISO timestamp for the last millisecond of this month in IST
}> {
  const now = toIST(new Date());
  const buckets: Array<{ key: string; label: string; endISO: string }> = [];

  for (let i = numMonths - 1; i >= 0; i--) {
    const rawMonth = now.getUTCMonth() - i;
    const month = ((rawMonth % 12) + 12) % 12;
    const yearOffset = Math.floor(rawMonth / 12);
    const year = now.getUTCFullYear() + (rawMonth < 0 ? yearOffset : rawMonth >= 12 ? yearOffset : 0);

    const key = `${year}-${String(month + 1).padStart(2, "0")}`;

    // Short label: "Jan", "Feb" — show year suffix only when it differs from current
    const labelDate = new Date(`${key}-15T12:00:00+05:30`);
    const isCurrentYear = year === now.getUTCFullYear();
    const label = labelDate.toLocaleDateString("en-IN", {
      month: "short",
      year: isCurrentYear ? undefined : "2-digit",
      timeZone: "Asia/Kolkata",
    });

    // End of this month in IST → last millisecond before next month
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const endOfMonth = new Date(
      `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-01T00:00:00+05:30`
    );
    endOfMonth.setMilliseconds(-1);

    buckets.push({ key, label, endISO: endOfMonth.toISOString() });
  }

  return buckets;
}

// ── Aggregation ──────────────────────────────────────────────

function aggregate(
  members: MemberRow[],
  payments: PaymentRow[],
  scale: GrowthScale
): GrowthDataPoint[] {
  const numMonths = scale === "6months" ? 6 : 12;
  const buckets = buildMonthBuckets(numMonths);

  const points: GrowthDataPoint[] = buckets.map(({ key, label, endISO }) => {
    // Cumulative member count: members whose joined_date is on or before
    // the last day of this month. Null joined_date entries are excluded.
    const cumulativeMembers = members.filter((m) => {
      if (!m.joined_date) return false;
      const joinKey = m.joined_date.slice(0, 7); // "YYYY-MM"
      return joinKey <= key;
    }).length;

    // New members this specific month
    const newMembers = members.filter((m) => {
      if (!m.joined_date) return false;
      return m.joined_date.slice(0, 7) === key;
    }).length;

    // Revenue collected in this month (using last_payment_at)
    const revenue = payments
      .filter((p) => {
        if (!p.last_payment_at) return false;
        return istMonthKey(p.last_payment_at) === key;
      })
      .reduce((sum, p) => sum + (p.amount_paid ?? 0), 0);

    return { label, members: cumulativeMembers, newMembers, revenue, revenueDelta: 0 };
  });

  // Calculate month-over-month revenue delta
  return points.map((pt, i) => ({
    ...pt,
    revenueDelta: i === 0 ? 0 : pt.revenue - points[i - 1].revenue,
  }));
}

// ── Fetch ────────────────────────────────────────────────────

interface FetchedData {
  members: MemberRow[];
  payments: PaymentRow[];
}

async function fetchGrowthData(): Promise<FetchedData> {
  // Look back 13 months so we can compute deltas for the 12-month view
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 13);
  const cutoffISO = new Date(
    `${cutoff.toISOString().slice(0, 7)}-01T00:00:00+05:30`
  ).toISOString();

  const [membersRes, paymentsRes] = await Promise.all([
    // All active members (no date filter — we need ALL to compute cumulative snapshot)
    supabase
      .from("members")
      .select("joined_date")
      .eq("is_active", true),

    // Paid rows within our lookback window, using last_payment_at
    supabase
      .from("member_memberships")
      .select("amount_paid, last_payment_at")
      .eq("payment_status", "paid")
      .gte("last_payment_at", cutoffISO)
      .not("last_payment_at", "is", null),
  ]);

  if (membersRes.error) throw membersRes.error;
  if (paymentsRes.error) throw paymentsRes.error;

  return {
    members: (membersRes.data ?? []) as MemberRow[],
    payments: (paymentsRes.data ?? []) as PaymentRow[],
  };
}

// ── Public hook ──────────────────────────────────────────────

/**
 * Returns monthly growth data for the Dashboard Growth Graph.
 *
 * @param scale - "6months" (default on dash) or "year"
 *
 * Query key: ["dashboard-growth"] — single fetch shared across scales.
 * staleTime: 5 minutes (dashboard data is read-mostly).
 */
export function useDashboardGrowthGraph(scale: GrowthScale) {
  return useQuery<FetchedData, Error, GrowthDataPoint[]>({
    queryKey: ["dashboard-growth"],
    queryFn: fetchGrowthData,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    select: (data) => aggregate(data.members, data.payments, scale),
  });
}
