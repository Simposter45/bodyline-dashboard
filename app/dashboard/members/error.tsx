"use client";

// ============================================================
// app/dashboard/members/error.tsx
// Error boundary for the members route (/dashboard/members).
// Next.js requires this to be a Client Component.
// Delegates all UI to the shared ErrorFallback component.
// ============================================================

import { ErrorFallback } from "@/components/ui/ErrorFallback";

export default function MembersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} />;
}
