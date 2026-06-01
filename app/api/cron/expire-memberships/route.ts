// ============================================================
// app/api/cron/expire-memberships/route.ts
//
// CHORE-002b — Auto Status Transition: Manual Trigger Endpoint
//
// Purpose:
//   Provides a secured HTTP endpoint to manually invoke the
//   expire_overdue_memberships() Postgres function outside of
//   the pg_cron schedule (e.g. for testing, emergency runs,
//   or as a Vercel Cron Job fallback target).
//
// Security:
//   Protected by a Bearer token (CRON_SECRET env var).
//   Only server-to-server calls should hit this endpoint.
//   The admin Supabase client bypasses RLS — treat with care.
//
// Primary mechanism:
//   pg_cron (see scripts/10_chore_002b_auto_status_transition.sql)
//   This route is a secondary/manual fallback.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  // ── 1. Authorize via Bearer token ────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/expire-memberships] CRON_SECRET env var is not set.");
    return NextResponse.json(
      { error: "Cron endpoint is not configured on the server." },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("Authorization");
  const providedToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!providedToken || providedToken !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ── 2. Invoke the stored function via the admin client ───────
  let updatedCount: number;

  try {
    const supabase = createAdminClient();

    // Call the SECURITY DEFINER function — bypasses RLS, touches all tenants.
    const { data, error } = await supabase.rpc("expire_overdue_memberships");

    if (error) throw error;

    // The function returns an INTEGER (row count)
    updatedCount = (data as number) ?? 0;
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Unknown database error.";
    console.error("[cron/expire-memberships] RPC error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // ── 3. Return result ─────────────────────────────────────────
  console.log(
    `[cron/expire-memberships] Sweep complete. Updated: ${updatedCount} membership(s).`
  );
  return NextResponse.json(
    {
      success: true,
      updated: updatedCount,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
