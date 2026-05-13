"use client";

// ============================================================
// app/dashboard/error.tsx
// Error boundary for the main dashboard route (/dashboard).
// Next.js requires this to be a Client Component.
// Delegates all UI to the shared ErrorFallback component.
// ============================================================

import { ErrorFallback } from "@/components/ui/ErrorFallback";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} />;
}
