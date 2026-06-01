"use client";

// ============================================================
// hooks/useRevenueGraph.ts — FEAT-013
// Fetches paid membership data for the Revenue Health Graph.
//
// Strategy: one Supabase query for the trailing 12 months of
// paid memberships; client-side bucketing per TimeScale so
// toggling scales is instant with no extra round trips.
//
// Scoped to the calling user's gym via RLS (no gym_id needed).
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// ── Public types ────────────────────────────────────────────

export type TimeScale = "week" | "month" | "6months" | "year";

export interface RevenueDataPoint {
  /** X-axis label: "Mon", "12 May", "May '26", etc. */
  label: string;
  /** ₹ collected (sum of amount_paid for paid rows in this bucket) */
  revenue: number;
  /** Distinct paying members in this bucket */
  members: number;
}

// ── Raw row shape returned from Supabase ────────────────────

interface PaidRow {
  member_id: string;
  amount_paid: number | null;
  created_at: string;
  payment_status: string;
}

// ── IST offset helper (mirrors lib/utils/date.ts pattern) ───

function toIST(d: Date): Date {
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
}

function istDateString(d: Date): string {
  const ist = toIST(d);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── Aggregation ──────────────────────────────────────────────

/**
 * Groups rows into time buckets matching the selected TimeScale.
 * Returns an array ordered oldest → newest (natural chart order).
 */
function aggregate(rows: PaidRow[], scale: TimeScale): RevenueDataPoint[] {
  const now = new Date();

  // Build ordered bucket keys and their display labels
  const buckets: { key: string; label: string; start: Date; end: Date }[] = [];

  if (scale === "week") {
    // Last 7 days (today + 6 prior) in IST
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = istDateString(d);
      const label = new Date(`${dateStr}T12:00:00+05:30`).toLocaleDateString(
        "en-IN",
        { weekday: "short", timeZone: "Asia/Kolkata" }
      );
      const start = new Date(`${dateStr}T00:00:00+05:30`);
      const end = new Date(`${dateStr}T23:59:59.999+05:30`);
      buckets.push({ key: dateStr, label, start, end });
    }
  } else if (scale === "month") {
    // Last 30 days grouped into 6 × 5-day blocks — keeps X-axis readable
    for (let i = 5; i >= 0; i--) {
      const endD = new Date(now.getTime() - i * 5 * 86400000);
      const startD = new Date(endD.getTime() - 4 * 86400000);
      const startStr = istDateString(startD);
      const endStr = istDateString(endD);
      const label = new Date(`${endStr}T12:00:00+05:30`).toLocaleDateString(
        "en-IN",
        { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }
      );
      const start = new Date(`${startStr}T00:00:00+05:30`);
      const end = new Date(`${endStr}T23:59:59.999+05:30`);
      buckets.push({ key: startStr, label, start, end });
    }
  } else if (scale === "6months") {
    // Last 6 calendar months in IST
    for (let i = 5; i >= 0; i--) {
      const d = toIST(now);
      const month = ((d.getUTCMonth() - i + 120) % 12);
      const year = d.getUTCFullYear() - (d.getUTCMonth() - i < 0 ? 1 : 0);
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      const label = new Date(`${key}-15T12:00:00+05:30`).toLocaleDateString(
        "en-IN",
        { month: "short", timeZone: "Asia/Kolkata" }
      );
      const start = new Date(`${key}-01T00:00:00+05:30`);
      // End = start of next month - 1ms
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const end = new Date(
        `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-01T00:00:00+05:30`
      );
      end.setMilliseconds(-1);
      buckets.push({ key, label, start, end });
    }
  } else {
    // year — last 12 calendar months
    for (let i = 11; i >= 0; i--) {
      const d = toIST(now);
      const month = ((d.getUTCMonth() - i + 120) % 12);
      const year = d.getUTCFullYear() - (d.getUTCMonth() - i < 0 ? 1 : 0);
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      const shortYear = String(year).slice(2);
      const label = new Date(`${key}-15T12:00:00+05:30`).toLocaleDateString(
        "en-IN",
        { month: "short", timeZone: "Asia/Kolkata" }
      ) + ` '${shortYear}`;
      const start = new Date(`${key}-01T00:00:00+05:30`);
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const end = new Date(
        `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-01T00:00:00+05:30`
      );
      end.setMilliseconds(-1);
      buckets.push({ key, label, start, end });
    }
  }

  // Accumulate revenue + distinct member sets per bucket
  return buckets.map(({ label, start, end }) => {
    const memberSet = new Set<string>();
    let revenue = 0;

    for (const row of rows) {
      const ts = new Date(row.created_at);
      if (ts >= start && ts <= end) {
        revenue += row.amount_paid ?? 0;
        memberSet.add(row.member_id);
      }
    }

    return { label, revenue, members: memberSet.size };
  });
}

// ── Fetch function ───────────────────────────────────────────
// Renamed from fetchPaidRows: now fetches ALL non-superseded records so
// partial payments (still "pending" or "overdue") are included in the graph.
async function fetchCollectionRows(): Promise<PaidRow[]> {
  // Trailing 12 months in IST — covers all scales including "year"
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffISO = new Date(
    `${istDateString(cutoff)}T00:00:00+05:30`
  ).toISOString();

  const { data, error } = await supabase
    .from("member_memberships")
    .select("member_id, amount_paid, created_at, payment_status")
    .neq("payment_status", "superseded")  // exclude tombstone rows only
    .gte("created_at", cutoffISO)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PaidRow[];
}

// ── Public hook ──────────────────────────────────────────────

/**
 * Returns aggregated revenue + member data for the Revenue Health Graph.
 *
 * @param scale - The time scale to aggregate data into.
 *
 * Query key: ["revenue-graph"] — single fetch, scale aggregation is client-side.
 * Cache: 2-minute stale time (data doesn't change frequently mid-session).
 */
export function useRevenueGraph(scale: TimeScale) {
  return useQuery<PaidRow[], Error, RevenueDataPoint[]>({
    queryKey: ["revenue-graph"],
    queryFn: fetchCollectionRows,
    // staleTime: 0 — always re-fetch after cache invalidation (which happens
    // immediately when useRecordPayment succeeds) so the graph reflects the
    // newly recorded payment without waiting for a stale window to expire.
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    select: (rows: PaidRow[]) => aggregate(rows, scale),
  });
}
