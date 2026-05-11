"use client";

// ============================================================
// app/dashboard/payments/error.tsx
// Error boundary for the payments route (/dashboard/payments).
// Next.js requires this to be a Client Component.
// Delegates all UI to the shared ErrorFallback component.
// ============================================================

import { ErrorFallback } from "@/components/ui/ErrorFallback";

export default function PaymentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} />;
}
