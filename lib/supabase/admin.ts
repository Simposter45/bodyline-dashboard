// ============================================================
// lib/supabase/admin.ts
// Service-role Supabase client for privileged server-side ops.
//
// ⚠️ NEVER import this in client components or hooks.
//    Use ONLY in API route handlers (app/api/*).
//
// Uses the raw @supabase/supabase-js createClient (not SSR),
// authenticated with SUPABASE_SERVICE_ROLE_KEY which bypasses
// all RLS policies. Handle with care.
// ============================================================

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      // Disable auto-refresh and session persistence for server-side admin calls
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
